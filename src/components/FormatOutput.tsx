import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadFile } from '../lib/platform';
import { Mode, Result } from '../lib/transform';
import { formatBytes } from '../lib/parse';
import { J } from '../lib/jsonAst';
import { useFolding } from '../lib/fold';
import { schemaFromJ, SchemaOptions } from '../lib/emitSchema';
import { CodeView } from './CodeView';
import { useCodeSearch } from './SearchBar';
import { useJsonPath } from './QueryBar';
import { TreeCommand, TreeView } from './TreeView';
import { RepairNotice } from './RepairNotice';
import { FindMode, FoldControls, ResultFind } from './ResultFind';
import { FieldEditor } from './FieldEditor';
import { Seg } from './Seg';
import { getAt, lineMap, replaceAtMatch, replaceInFields, ReplaceScope } from '../lib/edit';
import { ResultReplace } from './ResultReplace';
import { stringify } from '../lib/jsonAst';
import { Step } from '../lib/jsonpath';
import { usePersisted } from '../lib/settings';
import { copyText } from './OutputPane';
import { toast } from './Toast';
import { IconAlert, IconCheck, IconCopy, IconDownload } from './icons';
import { EmptyState, GhostBar } from './EmptyState';

interface Props {
    input: string;
    result: Result;
    mode: Mode;
    inputBytes: number;
    autoFix: boolean;
    onReplace: (text: string, json: boolean) => void;
    onJump: () => void;
    onJumpTo: (pos: number) => void;
    onApplyRepair: () => void;
    onUseUnescape: () => void;
    /** the search query is mirrored into the input editor */
    onSearchState?: (st: SearchState) => void;
    inputHitCount?: number;
    /** ⌘F pressed in the input: focus this search field, prefilled with the selection */
    findFocus?: { seq: number; text: string };
    /** write an edited document back to the input */
    onCommitEdit?: (node: J, description: string) => void;
    /** jump to a path in the input editor */
    onLocate?: (path: Step[]) => void;
    /** fill the input with a sample (empty-state button) */
    onLoadSample?: () => void;
}

export interface SearchState {
    query: string;
    caseSens: boolean;
    regex: boolean;
    current: number;
    total: number;
}

const FILE: Record<Mode, string> = {
    format: 'formatted.json',
    compress: 'minified.json',
    escape: 'escaped.txt',
    unescape: 'unescaped.txt',
};

function countLines(s: string) {
    let n = 1;
    for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
    return n;
}

function excerpt(text: string, pos: number, line: number, col: number) {
    const lineStart = Math.max(0, pos - (col - 1));
    let lineEnd = text.indexOf('\n', lineStart);
    if (lineEnd < 0) lineEnd = text.length;
    const full = text.slice(lineStart, lineEnd).replace(/\t/g, ' ').replace(/\r$/, '');
    const start = Math.max(0, col - 1 - 40);
    const lead = `${line} | ` + (start > 0 ? '…' : '');
    const seg = full.slice(start, start + 80) + (full.length > start + 80 ? '…' : '');
    return { code: lead + seg, caret: ' '.repeat(lead.length + (col - 1 - start)) + '^' };
}

type View = 'code' | 'tree' | 'schema';

const VIEWS: { v: View; label: string; title: string }[] = [
    { v: 'code', label: '代码', title: '格式化后的代码，可折叠' },
    { v: 'tree', label: '树形', title: '可折叠的节点树' },
    { v: 'schema', label: 'Schema', title: '根据这份 JSON 生成 JSON Schema' },
];

export function FormatOutput({
    input,
    result,
    mode,
    inputBytes,
    autoFix,
    onReplace,
    onJump,
    onJumpTo,
    onApplyRepair,
    onUseUnescape,
    onSearchState,
    inputHitCount,
    findFocus,
    onCommitEdit,
    onLocate,
    onLoadSample,
}: Props) {
    const [wrap, setWrap] = useState(false);
    const [copyState, setCopyState] = useState<'idle' | 'done' | 'fail'>('idle');
    const [dlError, setDlError] = useState<string | null>(null);
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => {
        setWrap(mode === 'compress' || mode === 'escape');
        setCopyState('idle');
        setDlError(null);
    }, [mode]);
    useEffect(() => () => window.clearTimeout(timer.current), []);

    // The result can be edited (replace in fields, field editor) without touching the input:
    // the edited document overrides what is shown, until the input changes or the user reverts it.
    const [override, setOverride] = useState<{ node: J; key: string } | null>(null);
    const okRaw = result.kind === 'ok' ? result : null;
    const edited = !!okRaw?.node && !!override && override.key === input;
    const ok = useMemo(
        () =>
            okRaw && edited && override
                ? {
                      ...okRaw,
                      node: override.node,
                      output: stringify(override.node, okRaw.indent ?? '  ', okRaw.order ?? 'none'),
                  }
                : okRaw,
        [okRaw, edited, override],
    );
    useEffect(() => {
        if (override && override.key !== input) setOverride(null);
    }, [input, override]);
    const [view, setView] = usePersisted<View>('fmt.view', 'code', ['code', 'tree', 'schema']);
    const [lineNumbers, setLineNumbers] = usePersisted('code.lineNumbers', false);
    const [findMode, setFindMode] = usePersisted<FindMode>('fmt.findMode', 'search', ['search', 'path']);
    const [schemaOpts, setSchemaOpts] = usePersisted<SchemaOptions>('fmt.schemaOpts', {
        draft: '2020-12',
        strict: false,
        examples: false,
    });
    const v: View = ok?.node ? view : 'code';
    const jp = useJsonPath(ok?.node, ok?.indent ?? '  ', ok?.order ?? 'none');
    const q = jp.state.kind === 'ok' ? jp.state : null;

    const schemaText = useMemo(() => {
        if (v !== 'schema' || !ok?.node) return '';
        const src: J = q
            ? q.matches.length === 1
                ? q.matches[0].node
                : { t: 'arr', items: q.matches.map((m) => m.node) }
            : ok.node;
        return schemaFromJ(src, schemaOpts);
    }, [v, ok, q, schemaOpts]);

    const shown = !ok ? '' : v === 'schema' ? schemaText : q ? q.output : ok.output;
    const textView = !!ok && v !== 'tree';
    const search = useCodeSearch(textView ? shown : null, 'fmt.search');
    const folding = useFolding(textView ? shown : null);
    const [treeCmd, setTreeCmd] = useState<TreeCommand | null>(null);
    const [treeStatus, setTreeStatus] = useState({ text: '', bad: false });
    const onTreeStatus = useCallback(
        (text: string, bad: boolean) => setTreeStatus((s) => (s.text === text && s.bad === bad ? s : { text, bad })),
        [],
    );

    const lines = useMemo(() => (ok ? countLines(shown) : 0), [ok, shown]);

    // mirror the search into the input editor
    const searchKey = `${search.query}\u0001${search.caseSens}\u0001${search.regex}\u0001${search.current}\u0001${search.hits.length}`;
    useEffect(() => {
        onSearchState?.({
            query: findMode === 'search' ? search.query : '',
            caseSens: search.caseSens,
            regex: search.regex,
            current: search.current,
            total: search.hits.length,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchKey, findMode]);

    // ⌘F from the input
    const [focusReq, setFocusReq] = useState(0);
    useEffect(() => {
        if (!findFocus?.seq) return;
        if (findFocus.text) search.setQuery(findFocus.text);
        setFindMode('search');
        setFocusReq((n) => n + 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [findFocus?.seq]);

    /* ---------- field editing ---------- */
    const [editPath, setEditPath] = useState<Step[] | null>(null);
    const canEdit = !!ok?.node && !!onCommitEdit && (mode === 'format' || mode === 'compress' || mode === 'unescape');
    // the code lines map to document paths whenever the code is the pretty-printed document
    const codeMapped = !!ok?.node && v === 'code' && !q && (ok?.indent ?? '') !== '' && lines <= 4000;
    const codeEditable = canEdit && codeMapped;
    const map = useMemo(
        () => (codeMapped && ok?.node ? lineMap(ok.node, ok.order ?? 'none') : null),
        [codeMapped, ok],
    );
    const editable = useCallback((line: number) => !!map && !!map[line] && !map[line].close, [map]);
    // jumping to the input only makes sense while the result still matches it
    const canLocate = !!ok?.node && !ok.repaired && !edited && !!onLocate && (mode === 'format' || mode === 'compress');
    const locateLine = useCallback(
        (line: number) => {
            const info = map?.[line];
            if (info) onLocate?.(info.path);
        },
        [map, onLocate],
    );
    const onEditLine = useCallback(
        (line: number) => {
            const info = map?.[line];
            if (info) setEditPath(info.path);
        },
        [map],
    );

    /* ---------- click to copy: key / value on a single click, the whole field on a double click ---------- */
    const pickTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(pickTimer.current), []);
    const copyAt = useCallback(
        (path: Step[], part: 'key' | 'value' | 'field') => {
            const root = ok?.node;
            if (!root) return;
            const node = getAt(root, path);
            if (!node) return;
            const last = path[path.length - 1];
            const hasKey = typeof last === 'string';
            const valueText = node.t === 'str' ? node.v : stringify(node, '  ', 'none');
            const clip = (s: string) => (s.length > 24 ? s.slice(0, 23) + '…' : s);
            if (part === 'key' && hasKey) {
                void copyText(last, `键名「${clip(last)}」`);
            } else if (part === 'field' && hasKey) {
                void copyText(`${JSON.stringify(last)}: ${stringify(node, '  ', 'none')}`, `字段「${clip(last)}」`);
            } else {
                const what =
                    node.t === 'obj'
                        ? `对象（${node.entries.length} 个键）`
                        : node.t === 'arr'
                          ? `数组（${node.items.length} 项）`
                          : `值「${clip(valueText.replace(/\s+/g, ' '))}」`;
                void copyText(valueText, what);
            }
        },
        [ok],
    );
    const pick = useCallback(
        (path: Step[], part: 'key' | 'value', clicks: number, container = false) => {
            window.clearTimeout(pickTimer.current);
            if (clicks >= 2) {
                // a double click on a container row in the tree toggles it instead
                if (!container) copyAt(path, 'field');
                return;
            }
            pickTimer.current = window.setTimeout(() => copyAt(path, part), 240);
        },
        [copyAt],
    );
    const onPickLine = useCallback(
        (line: number, part: 'key' | 'value', clicks: number) => {
            const info = map?.[line];
            if (info) pick(info.path, part, clicks);
        },
        [map, pick],
    );
    useEffect(() => setEditPath(null), [v, mode]);
    const commit = (node: J, desc: string) => {
        setEditPath(null);
        setOverride({ node, key: input });
        toast(`${desc}，只改了右侧结果`);
    };

    /* ---------- replace inside fields (floating widget, same as the input's find & replace) ---------- */
    const [repOpen, setRepOpen] = useState(false);
    const [repRow, setRepRow] = useState(true);
    const [repText, setRepText] = useState('');
    const [repScope, setRepScope] = usePersisted<ReplaceScope>('fmt.replaceScope', 'value', ['value', 'key', 'both']);
    const [repNote, setRepNote] = useState<{ text: string; bad: boolean } | null>(null);
    const repWidget = repOpen && canEdit && v !== 'schema' && findMode === 'search';
    useEffect(() => setRepNote(null), [search.query, search.regex, search.caseSens, repText, repScope, search.current]);
    const repPreview = useMemo(() => {
        if (!repWidget || !ok?.node || !search.query) return null;
        return replaceInFields(ok.node, search.query, repText, { regex: search.regex, caseSens: search.caseSens, scope: repScope });
    }, [repWidget, ok, search.query, search.regex, search.caseSens, repText, repScope]);
    const applyOverride = (node: J, text: string) => {
        setOverride({ node, key: input });
        toast(text);
    };
    const doReplaceAll = () => {
        if (!repPreview) return;
        if (!repPreview.ok) {
            setRepNote({ text: repPreview.message, bad: true });
            return;
        }
        if (!repPreview.count) return;
        applyOverride(repPreview.node, `已在 ${repPreview.fields} 个字段里替换 ${repPreview.count} 处，只改了右侧结果`);
    };
    const shownLines = useMemo(() => (map && ok ? shown.split('\n') : []), [map, ok, shown]);
    const canOne = !!map && v === 'code' && search.hits.length > 0 && search.current >= 0;
    const doReplaceOne = () => {
        const h = search.hits[search.current];
        if (!h || !map || !ok?.node) return;
        const info = map[h.line];
        if (!info || info.close) {
            setRepNote({ text: '这一处是括号，没有可以替换的内容', bad: true });
            return;
        }
        const text = shownLines[h.line] ?? '';
        const keyM = /^(\s*"(?:[^"\\]|\\.)*")\s*:/.exec(text);
        const hasKey = typeof info.path[info.path.length - 1] === 'string' && !!keyM;
        const keyEnd = hasKey && keyM ? keyM[1].length : 0;
        const part: 'key' | 'value' = hasKey && h.start < keyEnd ? 'key' : 'value';
        const occurrence = search.hits.filter(
            (x) => x.line === h.line && x.start < h.start && (part === 'key' ? x.start < keyEnd : x.start >= keyEnd),
        ).length;
        const r = replaceAtMatch(ok.node, info.path, part, occurrence, search.query, repText, {
            regex: search.regex,
            caseSens: search.caseSens,
        });
        if (!r.ok) {
            setRepNote({ text: r.message, bad: true });
            return;
        }
        applyOverride(r.node, `已替换 1 处，只改了右侧结果`);
    };
    const repSummary = !search.query
        ? ''
        : !repPreview
          ? ''
          : !repPreview.ok
            ? repPreview.message
            : repPreview.count
              ? `全部替换：${repPreview.fields} 个字段里的 ${repPreview.count} 处`
              : '字段里没有可替换的内容（数字和布尔值请用 ✎ 编辑）';
    const outBytes = useMemo(() => (ok ? new TextEncoder().encode(shown).length : 0), [ok, shown]);
    const fileName =
        v === 'schema' ? 'schema.json' : q ? 'query.json' : mode === 'unescape' && ok?.json ? 'unescaped.json' : FILE[mode];

    const onCopy = async () => {
        if (!ok) return;
        const done = await copyText(shown, v === 'schema' ? ' Schema' : q ? '查询结果' : '结果');
        setCopyState(done ? 'done' : 'fail');
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopyState('idle'), 1800);
    };
    const onDownload = async () => {
        if (!ok) return;
        setDlError(null);
        try {
            await downloadFile(fileName, new Blob([shown], { type: ok.json ? 'application/json' : 'text/plain' }));
        } catch (e) {
            setDlError(e instanceof Error ? e.message : '下载失败');
        }
    };
    const cmd = (kind: TreeCommand['kind'], n?: number) => setTreeCmd({ kind, n, seq: Date.now() });

    const ratio = !q && v !== 'schema' && inputBytes > 0 && mode === 'compress' ? Math.round((1 - outBytes / inputBytes) * 100) : null;
    const noMatch = !!ok && !!q && !q.count;

    return (
        <section className="card" aria-label="解析结果">
            <div className="card-head">
                <h2 className="card-title">解析结果</h2>
                {ok?.node && (
                    <div className="vtabs" role="tablist" aria-label="结果视图">
                        {VIEWS.map((x) => (
                            <button
                                key={x.v}
                                type="button"
                                role="tab"
                                aria-selected={v === x.v}
                                title={x.title}
                                onClick={() => setView(x.v)}
                            >
                                {x.label}
                            </button>
                        ))}
                    </div>
                )}
                <div className="card-actions">
                    <button
                        type="button"
                        className={`btn sm${copyState === 'done' ? ' done' : ''}`}
                        onClick={onCopy}
                        disabled={!ok || noMatch}
                    >
                        {copyState === 'done' ? <IconCheck /> : <IconCopy />}
                        {copyState === 'done' ? '已复制' : copyState === 'fail' ? '复制失败' : '复制'}
                    </button>
                    {v !== 'schema' && ok && !noMatch && shown !== input && (
                        <button
                            type="button"
                            className="btn sm"
                            onClick={() => onReplace(shown, !!ok?.json)}
                            title={q ? '用查询结果覆盖左侧的输入，可以撤销' : '用格式化后的结果覆盖左侧的输入，可以撤销'}
                        >
                            写回输入
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn sm primary"
                        onClick={onDownload}
                        disabled={!ok || noMatch}
                        title={`下载 ${fileName}`}
                    >
                        <IconDownload />
                        下载
                    </button>
                </div>
            </div>

            {ok?.repaired && (
                <RepairNotice info={ok.repaired} input={input} onApply={onApplyRepair} onJump={onJumpTo} />
            )}

            {edited && ok && (
                <div className="card-note edited" role="status">
                    <span>结果已修改，左侧输入保持不变</span>
                    <button type="button" className="link" onClick={() => setOverride(null)}>
                        还原
                    </button>
                    <button
                        type="button"
                        className="link"
                        onClick={() => onReplace(ok.output, !!ok.json)}
                        title="用修改后的结果覆盖左侧输入，可以撤销"
                    >
                        写回输入
                    </button>
                </div>
            )}

            {!ok && <GhostBar />}
            {ok && (
                <ResultFind
                    s={search}
                    mode={ok.node ? findMode : 'search'}
                    onMode={setFindMode}
                    jp={ok.node ? jp : undefined}
                    node={ok.node}
                    treeStatus={v === 'tree' ? treeStatus : null}
                    inputCount={onSearchState && findMode === 'search' && search.query ? inputHitCount : undefined}
                    focusRequest={focusReq}
                    replaceOpen={repOpen && findMode === 'search'}
                    onToggleReplace={canEdit && v !== 'schema' && findMode === 'search' ? () => setRepOpen((o) => !o) : undefined}
                >
                    {(ok.json || v === 'tree') && (
                        <FoldControls
                            onExpand={v === 'tree' ? () => cmd('expandAll') : folding.expandAll}
                            onCollapse={v === 'tree' ? () => cmd('collapseAll') : () => folding.foldFrom(1)}
                            onLevel={(n) => (v === 'tree' ? cmd('level', n) : folding.foldFrom(n))}
                            levels={v === 'tree' ? 5 : folding.maxDepth + 1}
                            wrap={wrap}
                            onWrap={v === 'tree' ? undefined : setWrap}
                            lineNumbers={lineNumbers}
                            onLineNumbers={v === 'tree' ? undefined : setLineNumbers}
                        />
                    )}
                    {!ok.json && v !== 'tree' && (
                        <FoldControls fold={false} onExpand={folding.expandAll} onCollapse={folding.expandAll} onLevel={folding.foldFrom} levels={1} wrap={wrap} onWrap={setWrap} lineNumbers={lineNumbers} onLineNumbers={setLineNumbers} />
                    )}
                </ResultFind>
            )}

            <div className="card-body">
                {repWidget && (
                    <ResultReplace
                        s={search}
                        treeText={v === 'tree' ? (search.query ? repSummary || treeStatus.text : '') : undefined}
                        showReplace={repRow}
                        onToggleReplace={() => setRepRow((r) => !r)}
                        rep={repText}
                        onRep={setRepText}
                        scope={repScope}
                        onScope={setRepScope}
                        onReplaceOne={doReplaceOne}
                        onReplaceAll={doReplaceAll}
                        canOne={canOne}
                        canAll={!!repPreview && repPreview.ok && repPreview.count > 0}
                        note={repNote ? repNote.text : repSummary}
                        noteBad={repNote ? repNote.bad : !!repPreview && !repPreview.ok}
                        onClose={() => setRepOpen(false)}
                    />
                )}
                {result.kind === 'empty' && (
                    <EmptyState
                        badge="JSON"
                        title="粘贴 JSON 后自动格式化"
                        desc="支持大整数、自动修复、嵌套转义解析和 JSONPath 提取。"
                        action={onLoadSample ? { label: '载入示例', onClick: onLoadSample } : undefined}
                    />
                )}

                {result.kind === 'error' &&
                    (() => {
                        const ex = excerpt(input, result.pos, result.line, result.col);
                        return (
                            <div className="errbox" role="alert">
                                <h3>
                                    <IconAlert />第 {result.line} 行第 {result.col} 列附近有语法错误
                                </h3>
                                <p className="errmsg">{result.message}</p>
                                <pre className="excerpt">
                                    {ex.code + '\n'}
                                    <span className="caret">{ex.caret}</span>
                                </pre>
                                <div className="tools">
                                    {result.repairable && (
                                        <button type="button" className="btn primary" onClick={onApplyRepair}>
                                            自动修复
                                        </button>
                                    )}
                                    <button type="button" className="btn" onClick={onJump}>
                                        跳到错误位置
                                    </button>
                                    {result.escapedHint && (
                                        <button type="button" className="btn" onClick={onUseUnescape}>
                                            改用反转义
                                        </button>
                                    )}
                                </div>
                                {result.repairable && !autoFix && (
                                    <p className="errtip">
                                        可以自动补全括号、引号、逗号等。打开工具栏里的「自动修复」后，粘贴时会直接显示修复结果。
                                    </p>
                                )}
                                {!result.repairable && autoFix && (
                                    <p className="errtip">这段内容没办法自动修复，请根据上面的位置手动修改。</p>
                                )}
                                {result.escapedHint && (
                                    <p className="errtip">
                                        输入里有 <span className="mono">\"</span> 这样的转义字符，可能是一段被转义过的 JSON。
                                    </p>
                                )}
                            </div>
                        );
                    })()}

                {noMatch ? (
                    <EmptyState
                        badge="$"
                        title="没有节点匹配这条 JSONPath"
                        desc={<span className="mono">{jp.path.trim()}</span>}
                    />
                ) : v === 'tree' && ok?.node ? (
                    <TreeView
                        root={ok.node}
                        order={ok.order ?? 'none'}
                        jpMatches={q ? q.matches : null}
                        onUseQuery={(p) => {
                            jp.setPath(p);
                            setFindMode('path');
                        }}
                        keyword={findMode === 'search' ? search.query : ''}
                        command={treeCmd}
                        onStatus={onTreeStatus}
                        onEdit={canEdit ? setEditPath : undefined}
                        onPick={pick}
                        onLocate={canLocate ? onLocate : undefined}
                    />
                ) : (
                    ok && (
                        <CodeView
                            code={shown || ' '}
                            wrap={wrap}
                            plain={!ok.json || lines > 4000}
                            hits={search.hits}
                            current={search.current}
                            folding={folding}
                            lineNumbers={lineNumbers}
                            editable={codeEditable ? editable : undefined}
                            onEditLine={codeEditable ? onEditLine : undefined}
                            onPickLine={map ? onPickLine : undefined}
                            onLocateLine={canLocate && map ? locateLine : undefined}
                            locatable={editable}
                            className={ok.json ? 'lang-json' : undefined}
                        />
                    )
                )}
            </div>

            {editPath && ok?.node && (
                <FieldEditor root={ok.node} path={editPath} onCommit={commit} onClose={() => setEditPath(null)} />
            )}

            <div className="card-foot">
                {dlError && <span className="ss-bad">{dlError}</span>}
                {(map || (ok?.node && v === 'tree')) && !editPath && v !== 'schema' && (
                    <span className="foot-hint">
                        单击复制 · 双击复制整个字段{canEdit ? ' · ✎ 编辑' : ''}
                    </span>
                )}
                {ok && (
                    <span>
                        {v === 'schema' ? 'Schema ' : q ? '查询结果 ' : '输出 '}
                        <b>{formatBytes(outBytes)}</b> · <b>{lines}</b> 行
                        {q && (
                            <>
                                {' '}
                                · <b>{q.count}</b> 个匹配
                            </>
                        )}
                        {ratio !== null && ratio > 0 && (
                            <>
                                {' '}
                                · 比输入小 <b>{ratio}%</b>
                            </>
                        )}
                    </span>
                )}
                {v === 'schema' && ok && (
                    <div className="foot-opts">
                        <label className="foot-field" title={q ? '根据 JSONPath 查询结果生成' : '根据整份 JSON 生成'}>
                            <span>规范</span>
                            <select
                                value={schemaOpts.draft}
                                onChange={(e) => setSchemaOpts({ ...schemaOpts, draft: e.target.value === '07' ? '07' : '2020-12' })}
                            >
                                <option value="2020-12">Draft 2020-12</option>
                                <option value="07">Draft-07</option>
                            </select>
                        </label>
                        <label className="check" title="每个对象都加上 additionalProperties: false">
                            <input
                                type="checkbox"
                                checked={schemaOpts.strict}
                                onChange={(e) => setSchemaOpts({ ...schemaOpts, strict: e.target.checked })}
                            />
                            禁止额外字段
                        </label>
                        <label className="check" title="用样本里的值生成 examples">
                            <input
                                type="checkbox"
                                checked={schemaOpts.examples}
                                onChange={(e) => setSchemaOpts({ ...schemaOpts, examples: e.target.checked })}
                            />
                            附带示例值
                        </label>
                    </div>
                )}
                {ok?.escapedHint && (
                    <span className="foot-notes">
                        这是一段被转义的 JSON{' '}
                        <button type="button" className="link" onClick={onUseUnescape}>
                            改用反转义
                        </button>
                    </span>
                )}
            </div>
        </section>
    );
}
