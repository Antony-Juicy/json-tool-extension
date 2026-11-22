import { ClipboardEvent, useDeferredValue, useMemo, useRef, useState } from 'react';
import {
    ENCODINGS,
    ENCODING_IDS,
    EditOp,
    ParseOptions,
    checkJsonValue,
    summarizeFixes,
    SortMode,
    URL_SAMPLES,
    editParams,
    parseUrl,
    rewriteDecoded,
    rewriteEncoded,
    sortParams,
    toCsv,
    toJson,
    toText,
} from '../lib/urlParams';
import { usePersisted } from '../lib/settings';
import { downloadFile } from '../lib/platform';
import { copyText } from './OutputPane';
import { toast } from './Toast';
import { CodeView } from './CodeView';
import { EmptyState, GhostBar } from './EmptyState';
import { UrlParamTable } from './UrlParamRows';
import { UrlBuild, BuildSeed } from './UrlBuild';
import { Seg } from './Seg';
import { ARRAY_STYLES, ArrayStyle, EXISTING_MODES, ExistingMode, SpaceStyle } from '../lib/urlBuild';
import { IconCheck, IconCopy, IconDownload } from './icons';

type View = 'table' | 'json' | 'text';
const VIEW_IDS: View[] = ['table', 'json', 'text'];
const VIEWS: { v: View; label: string }[] = [
    { v: 'table', label: '表格' },
    { v: 'json', label: 'JSON' },
    { v: 'text', label: '文本' },
];
const FILE: Record<View, { name: string; type: string }> = {
    table: { name: 'params.csv', type: 'text/csv' },
    json: { name: 'params.json', type: 'application/json' },
    text: { name: 'params.txt', type: 'text/plain' },
};


type Mode = 'parse' | 'build';
const MODE_IDS: Mode[] = ['parse', 'build'];

const encLabel = (id: string) => (ENCODINGS.flatMap((g) => g.items).find((i) => i.id === id)?.label ?? id).split('（')[0];

export function UrlTool() {
    const [input, setInput] = useState('');
    // undo history: every rewrite of the input (decode, encode, paste trim, parameter edits) can be undone, newest first
    const [hist, setHist] = useState<{ text: string; reason: string }[]>([]);
    const stash = hist.length ? hist[hist.length - 1] : null;
    const setStash = (s: { text: string; reason: string } | null) => setHist((h) => (s ? [...h.slice(-29), s] : []));
    const [sampleId, setSampleId] = useState('');
    const [filter, setFilter] = useState('');
    const [encoding, setEncoding] = usePersisted<string>('url.encoding', 'auto', ENCODING_IDS);
    const [plusAsSpace, setPlusAsSpace] = usePersisted('url.plus', true);
    const [trimPaste, setTrimPaste] = usePersisted('url.trim', true);
    const [wrapJson, setWrapJson] = usePersisted('url.wrap', false);
    const [mode, setMode] = usePersisted<Mode>('url.mode', 'parse', MODE_IDS);
    const [arrayStyle, setArrayStyle] = usePersisted<ArrayStyle>('url.arr', 'repeat', ARRAY_STYLES.map((a) => a.v));
    const [spaceStyle, setSpaceStyle] = usePersisted<SpaceStyle>('url.space', 'percent', ['percent', 'plus']);
    const [skipEmpty, setSkipEmpty] = usePersisted('url.skip', false);
    const [existing, setExisting] = usePersisted<ExistingMode>('url.exist', 'overwrite', EXISTING_MODES.map((m) => m.v));
    const [seed, setSeed] = useState<BuildSeed | null>(null);
    const [order, setOrder] = usePersisted<SortMode>('url.order', 'none', ['none', 'asc', 'desc']);
    const [view, setView] = usePersisted<View>('url.view', 'table', VIEW_IDS);
    const ref = useRef<HTMLTextAreaElement>(null);

    const deferred = useDeferredValue(input);
    const opts: ParseOptions = { encoding, plusAsSpace };
    const parsed = useMemo(() => parseUrl(deferred, { encoding, plusAsSpace }), [deferred, encoding, plusAsSpace]);

    const params = useMemo(() => (parsed ? sortParams(parsed.params, order) : []), [parsed, order]);
    const hashParams = useMemo(() => (parsed ? sortParams(parsed.hashParams, order) : []), [parsed, order]);
    const q = filter.trim().toLowerCase();
    const match = (ps: typeof params) => (q ? ps.filter((p) => p.key.toLowerCase().includes(q) || p.value.toLowerCase().includes(q)) : ps);
    const shown = match(params);
    const shownHash = match(hashParams);

    const total = parsed ? parsed.params.length + parsed.hashParams.length : 0;
    // the whole URL as written (wrapped lines joined, ends trimmed), parameters included
    const fullUrl = parsed && parsed.isUrl ? deferred.replace(/\s*[\r\n]+\s*/g, '').trim() : '';
    const text = useMemo(() => {
        if (!parsed) return '';
        const all = [...params, ...hashParams];
        return view === 'json' ? toJson(parsed, params) : view === 'text' ? toText(params) : toCsv(all);
    }, [parsed, params, hashParams, view]);

    const edit = (v: string) => {
        setInput(v);
        setStash(null);
    };
    /** pasted text: drop the spaces / line breaks at both ends (undoable) */
    const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
        if (!trimPaste) return;
        const t = e.clipboardData.getData('text');
        const trimmed = t.trim();
        if (!t || trimmed === t) return;
        e.preventDefault();
        const el = e.currentTarget;
        const a = el.selectionStart;
        const b = el.selectionEnd;
        const raw = input.slice(0, a) + t + input.slice(b);
        const next = input.slice(0, a) + trimmed + input.slice(b);
        setStash({ text: raw, reason: '已去掉粘贴内容首尾的空格' });
        setInput(next);
        const caret = a + trimmed.length;
        requestAnimationFrame(() => el.setSelectionRange(caret, caret));
    };
    const rewrite = (next: string | null, reason: string) => {
        if (next === null || next === input) return;
        setStash({ text: input, reason });
        setInput(next);
    };
    /** edit / delete / add one parameter: the new URL is written back to the input (undoable) */
    const applyEdit = (op: EditOp, reason: string) => {
        const writeEnc = encoding === 'auto' ? 'utf-8' : encoding;
        // a value that is meant to be JSON but is malformed is repaired before it is written (only when it was changed)
        let fixNote = '';
        if (op.type !== 'delete') {
            const editIndex = op.type === 'edit' ? op.index : -1;
            const before = editIndex > 0 ? parsed?.params.find((x) => x.index === editIndex)?.value : undefined;
            if (op.value !== before) {
                const c = checkJsonValue(op.value);
                if (c.state === 'fixable') {
                    op = { ...op, value: c.fixed };
                    fixNote = summarizeFixes(c.fixes);
                } else if (c.state === 'broken') {
                    toast('值看起来是 JSON，但格式有误且无法自动修复，已按原样保存', 'bad');
                }
            }
        }
        const r = editParams(input, opts, op);
        if (!r) {
            if (fixNote) toast(`已自动修复 JSON：${fixNote}，结果和原来一致，没有改动`, 'info');
            return;
        }
        if (fixNote) {
            reason = `${reason}，已自动修复 JSON（${fixNote}）`;
            toast(`已自动修复 JSON：${fixNote}`, 'info');
        }
        rewrite(r.text, writeEnc === 'utf-8' ? reason : `${reason}（按 ${encLabel(writeEnc)} 编码）`);
        if (r.lossy > 0) toast(`有 ${r.lossy} 个字符无法用 ${encLabel(writeEnc)} 表示，已替换成 ?`, 'bad');
    };
    /** carry the parsed link and its parameters over to the builder */
    const toBuild = () => {
        if (!parsed) return;
        const base = parsed.isUrl ? parsed.parts.base + (parsed.parts.hash ? '#' + parsed.parts.hash : '') : '';
        setSeed({ n: Date.now(), base, rows: parsed.params.map((p) => ({ key: p.key, value: p.value })) });
        setMode('build');
    };
    /** the built URL becomes the parse input (undoable) */
    const openParse = (url: string) => {
        rewrite(url, '已载入拼接结果');
        setMode('parse');
    };
    const clear = () => {
        setStash({ text: input, reason: '已清空输入' });
        setInput('');
        setFilter('');
        ref.current?.focus();
    };
    const undo = () => {
        if (!stash) return;
        setInput(stash.text);
        setHist((h) => h.slice(0, -1));
    };
    const loadSample = (id: string) => {
        const s = URL_SAMPLES.find((x) => x.id === id);
        if (!s) return;
        if (s.encoding) setEncoding(s.encoding);
        else if (encoding !== 'auto' && encoding !== 'utf-8') setEncoding('auto');
        setStash(input ? { text: input, reason: '已载入示例' } : null);
        setInput(s.text);
        setFilter('');
    };
    const onCopy = (t: string, what: string) => void copyText(t, what);
    const download = async () => {
        if (!parsed) return;
        const f = FILE[view];
        try {
            await downloadFile(f.name, new Blob([text], { type: f.type }));
        } catch (e) {
            toast(e instanceof Error ? e.message : '下载失败', 'bad');
        }
    };

    const fallbackNote = parsed && parsed.usedFallback > 0 && encoding === 'auto';
    const brokenNote = parsed && parsed.broken > 0;
    const looksUtf8 = !!parsed && parsed.utf8 > 0;
    const suggestGbk = brokenNote && !looksUtf8 && (encoding === 'utf-8' || encoding === 'auto');
    const bytes = new TextEncoder().encode(input).length;

    return (
        <>
            <div className="toolbar" role="toolbar" aria-label="URL 参数选项">
                <Seg<Mode>
                    label="模式"
                    prefix="模式"
                    value={mode}
                    onChange={setMode}
                    options={[
                        { v: 'parse', label: '解析' },
                        { v: 'build', label: '拼接' },
                    ]}
                />
                <span className="tb-sep" aria-hidden="true" />
                <label className="inline-field">
                    <span>字符编码</span>
                    <select className="text" value={encoding} onChange={(e) => setEncoding(e.target.value)}>
                        {ENCODINGS.map((g) => (
                            <optgroup key={g.group} label={g.group}>
                                {g.items.map((i) => (
                                    <option key={i.id} value={i.id}>
                                        {i.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </label>
                <span className="tb-sep" aria-hidden="true" />
                <label className="inline-field">
                    <span>键排序</span>
                    <select className="text" value={order} onChange={(e) => setOrder(e.target.value as SortMode)}>
                        <option value="none">保持原顺序</option>
                        <option value="asc">升序 A → Z</option>
                        <option value="desc">降序 Z → A</option>
                    </select>
                </label>
                {mode === 'parse' && (
                    <label className="check" title="表单提交的参数里，加号表示空格（application/x-www-form-urlencoded）；关掉后加号按原样显示">
                        <input type="checkbox" checked={plusAsSpace} onChange={(e) => setPlusAsSpace(e.target.checked)} />
                        把 + 当作空格
                    </label>
                )}
                {mode === 'build' && (
                    <>
                        <label className="inline-field" title="同名的键有多个值（或标记为数组）时怎么写">
                            <span>数组写法</span>
                            <select className="text" value={arrayStyle} onChange={(e) => setArrayStyle(e.target.value as ArrayStyle)}>
                                {ARRAY_STYLES.map((a) => (
                                    <option key={a.v} value={a.v}>
                                        {a.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="inline-field" title="空格写成 %20，或表单风格的 +（UTF-16 下只能用 %20）">
                            <span>空格写成</span>
                            <select className="text" value={spaceStyle} onChange={(e) => setSpaceStyle(e.target.value as SpaceStyle)}>
                                <option value="percent">%20</option>
                                <option value="plus">+</option>
                            </select>
                        </label>
                        <label className="inline-field" title="基础链接里已经有参数时怎么处理">
                            <span>已有参数</span>
                            <select className="text" value={existing} onChange={(e) => setExisting(e.target.value as ExistingMode)}>
                                {EXISTING_MODES.map((m) => (
                                    <option key={m.v} value={m.v}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="check" title="值为空的参数不写进链接">
                            <input type="checkbox" checked={skipEmpty} onChange={(e) => setSkipEmpty(e.target.checked)} />
                            跳过空值
                        </label>
                    </>
                )}
                <label className="check" title="粘贴时自动去掉内容开头和结尾的空格、空行，可以撤销">
                    <input type="checkbox" checked={trimPaste} onChange={(e) => setTrimPaste(e.target.checked)} />
                    粘贴时去掉首尾空格
                </label>
            </div>

            <div hidden={mode !== 'parse'}>
            <main className="main">
                <section className="card" aria-label="输入">
                    <div className="card-head">
                        <h2 className="card-title">输入</h2>
                        {input && (
                            <span className="card-meta">
                                {bytes} 字节{parsed ? ` · ${total} 个参数` : ''}
                            </span>
                        )}
                        <div className="card-actions">
                            <label className="sr" htmlFor="url-sample">
                                载入示例
                            </label>
                            <select
                                id="url-sample"
                                className="text xs sample-pick"
                                value={sampleId}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    setSampleId('');
                                    loadSample(id);
                                }}
                            >
                                <option value="">示例</option>
                                {URL_SAMPLES.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="rbar ibar">
                        <div className="actgroup" role="group" aria-label="输入操作">
                            <button
                                type="button"
                                disabled={!parsed}
                                onClick={() => rewrite(rewriteDecoded(input, opts), '已把参数解码成可读的文字')}
                                title="把每个键和值解码成可读的文字；会引起歧义的 % & = # + 仍保持转义"
                            >
                                解码
                            </button>
                            <button
                                type="button"
                                disabled={!parsed}
                                onClick={() => rewrite(rewriteEncoded(input, opts), '已按 UTF-8 重新编码参数')}
                                title="先按所选字符编码解码，再统一按 UTF-8 重新编码（GBK 等参数会被转成 UTF-8）"
                            >
                                编码
                            </button>
                            <button type="button" onClick={clear} disabled={!input}>
                                清空
                            </button>
                        </div>
                        <div className="rb-right">
                            <button type="button" className="btn sm" onClick={toBuild} disabled={!parsed} title="把解析出来的基础链接和参数带到「拼接」模式继续修改">
                                转到拼接
                            </button>
                            <button
                                type="button"
                                className="btn sm find-open"
                                onClick={() => onCopy(input.trim(), '输入')}
                                disabled={!input.trim()}
                                title="复制输入内容"
                            >
                                <IconCopy />
                                复制
                            </button>
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="editor url-editor">
                            <textarea
                                ref={ref}
                                value={input}
                                onChange={(e) => edit(e.target.value)}
                                onPaste={onPaste}
                                spellCheck={false}
                                autoCapitalize="off"
                                autoCorrect="off"
                                aria-label="URL 输入"
                                placeholder={'https://example.com/search?q=%E4%B8%AD%E6%96%87&page=1\n\n支持完整 URL，也可以只粘贴 ? 后面的参数串'}
                            />
                        </div>
                    </div>
                    <div className="card-foot status" aria-live="polite">
                        {stash ? (
                            <>
                                <span>{stash.reason}</span>
                                <button type="button" className="link" onClick={undo}>
                                    撤销
                                </button>
                            </>
                        ) : parsed ? (
                            <span className="ok" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                                <IconCheck />
                                {parsed.isUrl ? '已识别 URL' : '已识别参数串'}
                            </span>
                        ) : (
                            <span>等待输入</span>
                        )}
                    </div>
                </section>

                <section className="card" aria-label="解析结果">
                    <div className="card-head">
                        <h2 className="card-title">解析结果</h2>
                        {parsed && (
                            <div className="vtabs" role="tablist" aria-label="结果视图">
                                {VIEWS.map((x) => (
                                    <button key={x.v} type="button" role="tab" aria-selected={view === x.v} onClick={() => setView(x.v)}>
                                        {x.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="card-actions">
                            <button type="button" className="btn sm" disabled={!parsed} onClick={() => onCopy(view === 'table' ? toText(params) : text, view === 'table' ? '键值' : '结果')}>
                                <IconCopy />
                                {view === 'table' ? '复制键值' : '复制'}
                            </button>
                            <button type="button" className="btn sm primary" disabled={!parsed || !total} onClick={download} title={`下载 ${FILE[view].name}`}>
                                <IconDownload />
                                下载
                            </button>
                        </div>
                    </div>

                    {!parsed && <GhostBar text="按键名或值筛选" />}
                    {parsed && (
                        <div className="rbar">
                            {view === 'table' ? (
                                <div className="ut-filter">
                                    <input
                                        type="text"
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        placeholder="按键名或值筛选"
                                        aria-label="筛选参数"
                                        spellCheck={false}
                                    />
                                    {q && (
                                        <span className="ut-count">
                                            {shown.length + shownHash.length} / {total}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <span className="ut-hint">共 {total} 个参数{view === 'text' ? '，每行一个 键=值' : ''}</span>
                            )}
                        </div>
                    )}

                    {(brokenNote || fallbackNote) && (
                        <div className={`card-note ut-note${brokenNote ? '' : ' info'}`} role="status">
                            {brokenNote ? (
                                <>
                                    <span>
                                        {looksUtf8
                                            ? `有 ${parsed.utf8} 个参数的内容更像 UTF-8，当前编码可能选错了`
                                            : `有 ${parsed.broken} 个参数解码后出现乱码，可能字符编码不对`}
                                    </span>
                                    {looksUtf8 && (
                                        <button type="button" className="link" onClick={() => setEncoding('utf-8')}>
                                            改用 UTF-8
                                        </button>
                                    )}
                                    {suggestGbk && (
                                        <button type="button" className="link" onClick={() => setEncoding('gbk')}>
                                            改用 GBK
                                        </button>
                                    )}
                                </>
                            ) : (
                                <span>有 {parsed.usedFallback} 个参数不是 UTF-8，已自动按 GB18030 解码</span>
                            )}
                        </div>
                    )}
                    <div className="card-body">
                        {!parsed ? (
                            <EmptyState
                                badge="URL"
                                title="粘贴 URL 后解析参数"
                                desc="把查询参数整理成表格，支持 UTF-8、GBK、Big5、UTF-16 等常用字符编码。"
                                action={{ label: '载入示例', onClick: () => loadSample('search') }}
                            />
                        ) : view === 'table' ? (
                            <div className="url-res">
                                {parsed.isUrl && (
                                    <dl className="url-parts">
                                        {fullUrl && (
                                            <div className="up-row" onClick={() => onCopy(fullUrl, 'URL')} title="单击复制完整 URL">
                                                <dt>URL</dt>
                                                <dd className="mono">{fullUrl}</dd>
                                                <span className="up-copy" aria-hidden="true">
                                                    <IconCopy />
                                                </span>
                                            </div>
                                        )}
                                        {parsed.parts.hash && !parsed.hashParams.length && (
                                            <div className="up-row" onClick={() => onCopy(parsed.parts.hash, '锚点')} title="单击复制锚点">
                                                <dt>锚点</dt>
                                                <dd className="mono">#{parsed.parts.hash}</dd>
                                                <span className="up-copy" aria-hidden="true">
                                                    <IconCopy />
                                                </span>
                                            </div>
                                        )}
                                    </dl>
                                )}
                                <h3 className="ut-sec">
                                    查询参数 <span>{parsed.params.length}</span>
                                </h3>
                                <UrlParamTable
                                    params={shown}
                                    onCopy={onCopy}
                                    onOpenUrl={(v) => rewrite(v, '已把这个值当作新的输入')}
                                    filtered={!!q && !!parsed.params.length}
                                    editable
                                    wrap={wrapJson}
                                    onWrap={setWrapJson}
                                    resetKey={`${deferred}|${encoding}|${plusAsSpace}`}
                                    onEdit={(i, k, v) => applyEdit({ type: 'edit', index: i, key: k, value: v }, `已修改参数 ${k || '（空键）'}`)}
                                    onDelete={(i) => applyEdit({ type: 'delete', index: i }, `已删除参数 ${parsed.params[i - 1]?.key ?? ''}`)}
                                    onAdd={(k, v) => applyEdit({ type: 'add', key: k, value: v }, `已添加参数 ${k}`)}
                                />
                                {parsed.hashParams.length > 0 && (
                                    <>
                                        <h3 className="ut-sec">
                                            锚点中的参数 <span>{parsed.hashParams.length}</span>
                                            {parsed.hashPath && <em className="mono">#{parsed.hashPath}</em>}
                                        </h3>
                                        <UrlParamTable wrap={wrapJson} onWrap={setWrapJson} params={shownHash} onCopy={onCopy} onOpenUrl={(v) => rewrite(v, '已把这个值当作新的输入')} filtered={!!q} />
                                    </>
                                )}
                            </div>
                        ) : (
                            <CodeView code={text} plain={view === 'text'} lineNumbers />
                        )}
                    </div>
                    <div className="card-foot">
                        {parsed ? (
                            <span>
                                <b>{total}</b> 个参数 · 编码 <b>{encoding === 'auto' ? '自动' : (ENCODINGS.flatMap((g) => g.items).find((i) => i.id === encoding)?.label ?? encoding).split('（')[0]}</b>
                            </span>
                        ) : (
                            <span>单击表格里的键或值即可复制</span>
                        )}
                    </div>
                </section>
            </main>
            </div>
            <div hidden={mode !== 'build'}>
                <UrlBuild
                    encoding={encoding}
                    arrayStyle={arrayStyle}
                    spaceStyle={spaceStyle}
                    skipEmpty={skipEmpty}
                    existing={existing}
                    order={order}
                    trimPaste={trimPaste}
                    seed={seed}
                    onOpenParse={openParse}
                    onCopy={onCopy}
                />
            </div>
        </>
    );
}
