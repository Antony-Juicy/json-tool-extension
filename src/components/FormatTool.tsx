import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { SortOrder } from '../lib/jsonAst';
import { Indent, indentText, lineCol, Mode, normalizeInput, prettyIfJson, transform } from '../lib/transform';
import { J, stringify } from '../lib/jsonAst';
import { findHits } from './SearchBar';
import { SearchState } from './FormatOutput';
import { locate } from '../lib/locate';
import { toast } from './Toast';
import { FORMAT_SAMPLES } from '../lib/formatSamples';
import { formatBytes } from '../lib/parse';
import { JsonEditor } from './JsonEditor';
import { usePersisted } from '../lib/settings';
import { FormatOutput } from './FormatOutput';
import { Seg } from './Seg';
import { InputBar } from './InputBar';
import { IconAlert, IconCheck, IconCompress, IconIndent, IconTrash } from './icons';

const MODES: { v: Mode; label: string }[] = [
    { v: 'format', label: '格式化' },
    { v: 'compress', label: '压缩' },
    { v: 'escape', label: '转义' },
    { v: 'unescape', label: '反转义' },
];

export function FormatTool() {
    const [mode, setMode] = usePersisted<Mode>('fmt.mode', 'format', ['format', 'compress', 'escape', 'unescape']);
    const [layout, setLayout] = usePersisted<'row' | 'col'>('fmt.layout', 'row', ['row', 'col']);
    const [order, setOrder] = usePersisted<SortOrder>('fmt.order', 'none', ['none', 'asc', 'desc']);
    const [indent, setIndent] = usePersisted<Indent>('fmt.indent', '2', ['2', '4', 'tab']);
    const [autoFix, setAutoFix] = usePersisted('fmt.autoFix', true);
    const [pasteFormat, setPasteFormat] = usePersisted('fmt.pasteFormat', true);
    // starts empty: the sample is loaded on request (示例 dropdown or the empty-state button)
    const [input, setInput] = useState('');
    const [stash, setStash] = useState<{ text: string; reason: string } | null>(null);
    const [sampleId, setSampleId] = useState('');
    const [findReq, setFindReq] = useState(0);
    const [searchState, setSearchState] = useState<SearchState>({ query: '', caseSens: false, regex: false, current: -1, total: 0 });
    const [findFocus, setFindFocus] = useState({ seq: 0, text: '' });
    const taRef = useRef<HTMLTextAreaElement>(null);

    const deferred = useDeferredValue(input);
    const result = useMemo(
        () => transform(deferred, { mode, order, indent, autoFix }),
        [deferred, mode, order, indent, autoFix],
    );
    const repaired = result.kind === 'ok' ? result.repaired : undefined;
    const inputHits = useMemo(
        () => findHits(deferred, searchState.query, searchState.caseSens, searchState.regex).hits,
        [deferred, searchState.query, searchState.caseSens, searchState.regex],
    );
    // same number of matches on both sides: the current match moves in step
    const inputCurrent = inputHits.length && inputHits.length === searchState.total ? searchState.current : -1;
    const commitEdit = (node: J, desc: string) => {
        setStash({ text: input, reason: desc });
        setInput(stringify(node, mode === 'compress' ? '' : indentText(indent), 'none'));
        setFmtError(false);
    };
    // jump from the result to the same spot in the input: select the field and scroll it into view
    const locateInInput = (path: (string | number)[]) => {
        const el = taRef.current;
        const loc = locate(input, path);
        if (!el || !loc) {
            toast('在左侧输入里没找到这一处，可能输入已经被修改', 'bad');
            return;
        }
        const a = loc.keyStart ?? loc.start;
        const { line, col } = lineCol(input, a);
        el.focus({ preventScroll: true });
        el.setSelectionRange(a, loc.end);
        el.scrollTop = Math.max(0, (line - 1) * 22 - el.clientHeight / 3);
        el.scrollLeft = col * 7.8 > el.clientWidth * 0.7 ? Math.max(0, (col - 1) * 7.8 - el.clientWidth / 3) : 0;
    };
    const inBytes = useMemo(() => new TextEncoder().encode(deferred).length, [deferred]);
    const inLines = useMemo(() => {
        let n = 1;
        for (let i = 0; i < deferred.length; i++) if (deferred.charCodeAt(i) === 10) n++;
        return n;
    }, [deferred]);

    const edit = (v: string) => {
        setInput(v);
        setStash(null);
        setFmtError(false);
    };
    const clear = () => {
        setStash({ text: input, reason: '已清空输入' });
        setInput('');
        taRef.current?.focus();
    };
    const undo = () => {
        if (!stash) return;
        setInput(stash.text);
        setStash(null);
    };
    const replaceInput = (text: string, json: boolean) => {
        setStash({ text: input, reason: '已用结果替换输入' });
        setInput(text);
        if (json && mode === 'unescape') setMode('format');
    };
    const jumpTo = (pos: number) => {
        const el = taRef.current;
        if (!el || pos < 0) return;
        const p = Math.min(pos, input.length);
        const { line, col } = lineCol(input, p);
        el.focus();
        el.setSelectionRange(p, Math.min(p + 1, input.length));
        el.scrollTop = Math.max(0, (line - 6) * 20);
        el.scrollLeft = Math.max(0, (col - 1) * 7.8 - el.clientWidth / 2);
    };
    const jump = () => {
        if (result.kind === 'error') jumpTo(result.pos);
        else if (repaired) jumpTo(repaired.error.pos);
    };
    const [fmtError, setFmtError] = useState(false);
    const rewriteInput = (compact: boolean) => {
        const r = normalizeInput(input, compact, indent, order);
        if (!r.ok) {
            setFmtError(true);
            if (result.kind === 'error') jump();
            return;
        }
        setFmtError(false);
        if (r.text === input) {
            setStash(null);
            return;
        }
        setStash({ text: input, reason: r.note });
        setInput(r.text);
    };

    return (
        <>
            <div className="toolbar" role="toolbar" aria-label="格式化选项">
                <Seg<Mode> label="输出模式" prefix="输出模式" value={mode} onChange={setMode} options={MODES} />
                <span className="tb-sep" aria-hidden="true" />
                {(mode === 'format' || mode === 'unescape') && (
                    <label className="inline-field">
                        <span>缩进</span>
                        <select className="text" value={indent} onChange={(e) => setIndent(e.target.value as Indent)}>
                            <option value="2">2 空格</option>
                            <option value="4">4 空格</option>
                            <option value="tab">Tab</option>
                        </select>
                    </label>
                )}
                <label className="inline-field">
                    <span>键排序</span>
                    <select className="text" value={order} onChange={(e) => setOrder(e.target.value as SortOrder)}>
                        <option value="none">保持原顺序</option>
                        <option value="asc">升序 A → Z</option>
                        <option value="desc">降序 Z → A</option>
                    </select>
                </label>
                <span className="tb-sep" aria-hidden="true" />
                {(mode === 'format' || mode === 'compress') && (
                    <label
                        className="check"
                        title="输入有格式错误时，自动补全或删除括号、引号、逗号，处理注释、单引号、未加引号的键等，并列出每一处修复"
                    >
                        <input type="checkbox" checked={autoFix} onChange={(e) => setAutoFix(e.target.checked)} />
                        自动修复
                    </label>
                )}
                <label className="check" title="粘贴合法的 JSON 后，输入框里的内容会自动格式化，可以撤销">
                    <input type="checkbox" checked={pasteFormat} onChange={(e) => setPasteFormat(e.target.checked)} />
                    粘贴时格式化
                </label>
                <span className="tb-spacer" />
                <div className="hide-narrow tb-layout">
                    <Seg<'row' | 'col'>
                        label="布局"
                        value={layout}
                        onChange={setLayout}
                        options={[
                            { v: 'row', label: '左右' },
                            { v: 'col', label: '上下' },
                        ]}
                    />
                </div>
            </div>

            <main className={`main${layout === 'col' ? ' stack' : ''}`}>
                <section className={`card${result.kind === 'error' ? ' has-error' : repaired ? ' has-warn' : ''}`} aria-label="输入">
                    <div className="card-head">
                        <h2 className="card-title">输入</h2>
                        {input && (
                            <span className="card-meta">
                                {formatBytes(inBytes)} · {inLines} 行
                            </span>
                        )}
                        <div className="card-actions">
                            <label className="sr" htmlFor="fmt-sample">
                                载入示例
                            </label>
                            <select
                                id="fmt-sample"
                                className="text xs sample-pick"
                                value={sampleId}
                                onChange={(e) => {
                                    const s = FORMAT_SAMPLES.find((x) => x.id === e.target.value);
                                    setSampleId('');
                                    if (s) edit((pasteFormat && prettyIfJson(s.text, indent)) || s.text);
                                }}
                            >
                                <option value="">示例</option>
                                {FORMAT_SAMPLES.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <InputBar
                        actions={[
                            {
                                label: '格式化输入',
                                icon: <IconIndent />,
                                emphasis: 'primary',
                                onClick: () => rewriteInput(false),
                                disabled: !input.trim(),
                                title: '格式化输入框里的 JSON，有格式问题时会先修复（Shift+Alt+F）',
                            },
                            {
                                label: '压缩输入',
                                icon: <IconCompress />,
                                onClick: () => rewriteInput(true),
                                disabled: !input.trim(),
                                title: '把输入框里的 JSON 压缩成一行',
                            },
                            { label: '清空', icon: <IconTrash />, emphasis: 'destructive', onClick: clear, disabled: !input },
                        ]}
                        onFind={() => setFindReq((n) => n + 1)}
                        findDisabled={!input}
                        findLabel="查找替换"
                        kbd="⌥⌘F"
                    />
                    <div className="card-body">
                        <JsonEditor
                            findRequest={findReq}
                            hideFindButton
                            extHits={inputHits}
                            extCurrent={inputCurrent}
                            onFindShortcut={(text) => setFindFocus((f) => ({ seq: f.seq + 1, text }))}
                            value={input}
                            onChange={edit}
                            errorLine={result.kind === 'error' ? result.line : repaired ? repaired.error.line : undefined}
                            tone={repaired ? 'warn' : 'error'}
                            textareaRef={taRef}
                            onFormat={() => rewriteInput(false)}
                            placeholder="在这里粘贴需要格式化的 JSON 代码"
                            label="JSON 输入"
                            formatOnPaste={pasteFormat ? (t) => prettyIfJson(t, indent) : undefined}
                            onPasteFormatted={(raw) => setStash({ text: raw, reason: '已自动格式化粘贴的内容' })}
                        />
                    </div>
                    <div className="card-foot status" aria-live="polite">
                        {stash ? (
                            <>
                                <span>{stash.reason}</span>
                                <button type="button" className="link" onClick={undo}>
                                    撤销
                                </button>
                            </>
                        ) : fmtError && result.kind !== 'error' ? (
                            <span className="msg">输入不是合法的 JSON 对象或数组，无法格式化</span>
                        ) : repaired ? (
                            <>
                                <span className="warn">
                                    <IconAlert />有 {repaired.fixes.length} 处格式问题，右侧是自动修复后的结果
                                </span>
                                <button type="button" className="link" onClick={() => rewriteInput(mode === 'compress')}>
                                    应用修复
                                </button>
                                <button type="button" className="link" onClick={jump}>
                                    查看第一处
                                </button>
                            </>
                        ) : result.kind === 'error' ? (
                            <>
                                <span className="bad" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                                    <IconAlert />第 {result.line} 行第 {result.col} 列
                                </span>
                                <span className="msg">{result.message}</span>
                                {result.repairable && (
                                    <button type="button" className="link" onClick={() => rewriteInput(false)}>
                                        自动修复
                                    </button>
                                )}
                                <button type="button" className="link" onClick={jump}>
                                    跳到错误位置
                                </button>
                            </>
                        ) : result.kind === 'empty' ? (
                            <span>等待输入</span>
                        ) : result.kind === 'ok' && result.json ? (
                            <span className="ok" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                                <IconCheck />
                                有效 JSON
                            </span>
                        ) : (
                            <span>{mode === 'unescape' ? '等待反转义' : '已读取输入'}</span>
                        )}
                    </div>
                </section>

                <FormatOutput
                    input={deferred}
                    result={result}
                    mode={mode}
                    inputBytes={inBytes}
                    autoFix={autoFix}
                    onReplace={replaceInput}
                    onJump={jump}
                    onJumpTo={jumpTo}
                    onApplyRepair={() => rewriteInput(mode === 'compress')}
                    onUseUnescape={() => setMode('unescape')}
                    onSearchState={setSearchState}
                    inputHitCount={inputHits.length}
                    findFocus={findFocus}
                    onCommitEdit={commitEdit}
                    onLocate={locateInInput}
                    onLoadSample={() => {
                        const s = FORMAT_SAMPLES[0];
                        edit((pasteFormat && prettyIfJson(s.text, indent)) || s.text);
                    }}
                />
            </main>
        </>
    );
}
