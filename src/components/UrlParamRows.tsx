import { KeyboardEvent, MouseEvent, ReactNode, useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Param, checkJsonValue, summarizeFixes } from '../lib/urlParams';
import { IconCheck, IconCopy, IconPencil } from './icons';

interface Props {
    params: Param[];
    onCopy: (text: string, what: string) => void;
    /** use a value that is itself a URL as the new input */
    onOpenUrl: (value: string) => void;
    /** when the filter hides every row */
    filtered: boolean;
    /** rows can be edited, deleted and added: each change writes the new URL back to the input */
    editable?: boolean;
    onEdit?: (index: number, key: string, value: string) => void;
    onDelete?: (index: number) => void;
    onAdd?: (key: string, value: string) => void;
    /** changes whenever the input or the encoding changes: drops a half-finished edit */
    resetKey?: string;
    /** JSON detail boxes wrap long lines (true) or scroll sideways (false) */
    wrap?: boolean;
    onWrap?: (v: boolean) => void;
}

const svg = { viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
const IconTrash = () => (
    <svg {...svg}>
        <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8h5.8l.6-8M6.5 7v3.5M9.5 7v3.5" />
    </svg>
);
const IconX = () => (
    <svg {...svg}>
        <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
);
const IconWrap = () => (
    <svg {...svg}>
        <path d="M2.5 4h11M2.5 8h8.5a2.2 2.2 0 010 4.4H8.5M10 10.8l-1.8 1.8 1.8 1.8M2.5 12h2.5" />
    </svg>
);
const IconChev = () => (
    <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 3.5l3 3 3-3" />
    </svg>
);

/** JSON text coloured like the code view: keys navy, strings jade, numbers cobalt, literals terracotta */
const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
function highlight(src: string): ReactNode[] {
    const out: ReactNode[] = [];
    let last = 0;
    let n = 0;
    const re = new RegExp(TOKEN.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
        if (m.index > last) out.push(src.slice(last, m.index));
        const [all, str, colon, lit, num] = m;
        if (str !== undefined) {
            if (colon) out.push(<span key={n++} className="jk">{str}</span>, colon);
            else out.push(<span key={n++} className="js">{str}</span>);
        } else if (lit) out.push(<span key={n++} className="jl">{lit}</span>);
        else out.push(<span key={n++} className="jn">{num}</span>);
        last = m.index + all.length;
    }
    if (last < src.length) out.push(src.slice(last));
    return out;
}

const rowsFor = (v: string) => Math.min(6, Math.max(1, v.split('\n').length, Math.ceil(v.length / 40)));
/** focus a field once, with the caret at its end */
const focusEnd = (el: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (!el || el.dataset.focused) return;
    el.dataset.focused = '1';
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
};
const stop = (e: MouseEvent) => e.stopPropagation();

/** true while the one-line text is cut off by the column width */
function useClipped(text: string) {
    const ref = useRef<HTMLSpanElement>(null);
    const [clipped, setClipped] = useState(false);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => setClipped(el.scrollWidth > el.clientWidth + 1);
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [text]);
    return [ref, clipped] as const;
}

interface RowProps {
    p: Param;
    open: boolean;
    onToggle: () => void;
    editable: boolean;
    onCopy: Props['onCopy'];
    onOpenUrl: Props['onOpenUrl'];
    onStartEdit: () => void;
    onDelete?: () => void;
    wrap: boolean;
    onWrap?: (v: boolean) => void;
}

/** One parameter: a single line (key, value, tags) that can open into a detail box with the full value. */
function ParamRow({ p, open, onToggle, editable, onCopy, onOpenUrl, onStartEdit, onDelete, wrap, onWrap }: RowProps) {
    const isJson = p.kind === 'json' && !!p.pretty;
    const [ref, clipped] = useClipped(p.value);
    const hasValue = !p.noEq && p.value !== '';
    const expandable = hasValue && (isJson || clipped || p.value.includes('\n'));
    const isOpen = expandable && open;
    const detail = isJson ? (p.pretty ?? '') : p.value;
    return (
        <div className={`prow${p.broken ? ' is-broken' : ''}${isOpen ? ' is-open' : ''}`} role="row">
            <span className="c-i" role="cell">
                {p.index}
            </span>
            <div className="c-k" role="cell">
                <div className="pk-line" onClick={() => onCopy(p.key, '键')} title={p.key ? `${p.key}（单击复制）` : '单击复制键'}>
                    <span className="pk mono">{p.key || <i className="dim">（空）</i>}</span>
                    {p.dup && (
                        <span className="tag warn" title="这个键出现了多次">
                            重复
                        </span>
                    )}
                </div>
            </div>
            <div className="c-v" role="cell">
                <div className="pv-line" onClick={() => onCopy(p.value, '值')} title={hasValue && clipped ? `${p.value}\n（单击复制）` : '单击复制值'}>
                    <span ref={ref} className="pv-text clip">
                        {p.noEq ? <i className="dim">（没有 = ）</i> : p.value === '' ? <i className="dim">（空）</i> : p.value}
                    </span>
                    {(p.broken || expandable || p.kind === 'url') && (
                        <span className="pv-side">
                            {p.broken && (
                                <span className="tag bad" title="解码后出现乱码，可以换一种字符编码试试">
                                    乱码
                                </span>
                            )}
                            {p.kind === 'url' && (
                                <button
                                    type="button"
                                    className="tag-btn"
                                    title="这个值是一个 URL：把它当作新的输入来解析，可以撤销"
                                    onClick={(e) => {
                                        stop(e);
                                        onOpenUrl(p.value);
                                    }}
                                >
                                    解析
                                </button>
                            )}
                            {expandable && (
                                <button
                                    type="button"
                                    className={`tag-btn${isOpen ? ' on' : ''}`}
                                    aria-expanded={isOpen}
                                    title={isOpen ? '收起' : isJson ? '展开并格式化这个 JSON' : '查看完整的值'}
                                    onClick={(e) => {
                                        stop(e);
                                        onToggle();
                                    }}
                                >
                                    {isJson ? 'JSON' : '全文'}
                                    <IconChev />
                                </button>
                            )}
                        </span>
                    )}
                </div>
            </div>
            <div className="c-a" role="cell">
                <div className="row-acts">
                    {editable && (
                        <button type="button" className="icon-btn" aria-label={`编辑 ${p.key}`} title="编辑这个参数" onClick={onStartEdit}>
                            <IconPencil />
                        </button>
                    )}
                    <button
                        type="button"
                        className="icon-btn"
                        aria-label={`复制 ${p.key}`}
                        title="复制 键=值"
                        onClick={() => onCopy(p.noEq ? p.key : `${p.key}=${p.value}`, '键值')}
                    >
                        <IconCopy />
                    </button>
                    {editable && (
                        <button type="button" className="icon-btn danger" aria-label={`删除 ${p.key}`} title="删除这个参数（可以撤销）" onClick={onDelete}>
                            <IconTrash />
                        </button>
                    )}
                </div>
            </div>
            {isOpen && (
                <div className="pdetail">
                    <div className={`pd-tools${isJson && wrap ? ' keep' : ''}`}>
                        {isJson && onWrap && (
                            <button
                                type="button"
                                className={`pd-btn${wrap ? ' on' : ''}`}
                                aria-pressed={wrap}
                                title={wrap ? '长行自动换行（点击改为横向滚动）' : '长行横向滚动（点击改为自动换行）'}
                                onClick={() => onWrap(!wrap)}
                            >
                                <IconWrap />
                                换行
                            </button>
                        )}
                        <button type="button" className="pd-btn" title={isJson ? '复制格式化后的 JSON' : '复制完整的值'} onClick={() => onCopy(detail, isJson ? '格式化的 JSON' : '值')}>
                            <IconCopy />
                            复制
                        </button>
                    </div>
                    <pre className={`mono${isJson ? (wrap ? ' json wrap' : ' json') : ''}`}>{isJson ? highlight(detail) : detail}</pre>
                </div>
            )}
        </div>
    );
}

/**
 * The parameter list: a compact, one-line row per parameter (#, key, value, actions). A long value is cut to one
 * line; its detail box (formatted JSON, or the full text) opens inside the row. Rows can be copied, edited,
 * deleted and added.
 */
export function UrlParamTable({ params, onCopy, onOpenUrl, filtered, editable = false, onEdit, onDelete, onAdd, resetKey, wrap = false, onWrap }: Props) {
    const [open, setOpen] = useState<Set<number>>(new Set());
    const [editing, setEditing] = useState<number | null>(null);
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState({ key: '', value: '' });

    useEffect(() => {
        setEditing(null);
        setAdding(false);
    }, [resetKey]);

    const toggle = (i: number) =>
        setOpen((s) => {
            const n = new Set(s);
            if (n.has(i)) n.delete(i);
            else n.add(i);
            return n;
        });

    const startEdit = (p: Param) => {
        setAdding(false);
        setEditing(p.index);
        setDraft({ key: p.key, value: p.value });
    };
    const startAdd = () => {
        setEditing(null);
        setAdding(true);
        setDraft({ key: '', value: '' });
    };
    const cancel = () => {
        setEditing(null);
        setAdding(false);
    };
    const canSave = !adding || draft.key.trim() !== '';
    const commit = () => {
        if (!canSave) return;
        if (adding) onAdd?.(draft.key.trim(), draft.value);
        else if (editing !== null) onEdit?.(editing, draft.key, draft.value);
        cancel();
    };
    const onKey = (e: KeyboardEvent, multiline: boolean) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
        } else if (e.key === 'Enter' && !(multiline && e.shiftKey)) {
            e.preventDefault();
            commit();
        }
    };

    const addButton = editable && !adding && (
        <div className="pt-foot">
            <button type="button" className="btn sm" onClick={startAdd} title="在末尾添加一个参数">
                添加参数
            </button>
        </div>
    );

    if (!params.length && !adding) {
        return (
            <>
                <div className="ut-none">{filtered ? '没有匹配的参数' : '没有查询参数'}</div>
                {!filtered && addButton}
            </>
        );
    }

    const editorRow = (isAdd: boolean, index: number | null) => {
        const chk = checkJsonValue(draft.value);
        return (
        <div key={isAdd ? 'add' : index} className={`prow editing${isAdd ? ' add-row' : ''}`} role="row">
            <span className="c-i" role="cell">
                {isAdd ? '+' : index}
            </span>
            <div className="c-k" role="cell">
                <input
                    className="pe-in mono"
                    value={draft.key}
                    placeholder="键"
                    aria-label="键"
                    spellCheck={false}
                    ref={isAdd ? focusEnd : undefined}
                    onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
                    onKeyDown={(e) => onKey(e, false)}
                />
            </div>
            <div className="c-v" role="cell">
                <textarea
                    className="pe-in"
                    rows={rowsFor(draft.value)}
                    value={draft.value}
                    placeholder="值"
                    aria-label="值"
                    spellCheck={false}
                    ref={isAdd ? undefined : focusEnd}
                    onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                    onKeyDown={(e) => onKey(e, true)}
                />
                {chk.state !== 'none' && (
                    <div className={`pe-hint ${chk.state}`} role="status">
                        {chk.state === 'valid' && (
                            <>
                                <IconCheck />
                                JSON 格式正确
                            </>
                        )}
                        {chk.state === 'fixable' && (
                            <>
                                <span>JSON 格式有误，保存时会自动修复：{summarizeFixes(chk.fixes)}</span>
                                <button type="button" className="link" onClick={() => setDraft((d) => ({ ...d, value: chk.fixed }))}>
                                    立即修复
                                </button>
                            </>
                        )}
                        {chk.state === 'broken' && <span>JSON 格式有误，无法自动修复</span>}
                    </div>
                )}
            </div>
            <div className="c-a" role="cell">
                <div className="row-acts">
                    <button type="button" className="icon-btn ok" aria-label="保存" title="保存（Enter）" disabled={!canSave} onClick={commit}>
                        <IconCheck />
                    </button>
                    <button type="button" className="icon-btn" aria-label="取消" title="取消（Esc）" onClick={cancel}>
                        <IconX />
                    </button>
                </div>
            </div>
        </div>
        );
    };

    return (
        <>
            <div className={`ptable${editable ? '' : ' ro'}`} role="table" aria-label="查询参数">
                <div className="prow phead" role="row">
                    <span className="c-i" role="columnheader">
                        #
                    </span>
                    <span className="c-k" role="columnheader">
                        键
                    </span>
                    <span className="c-v" role="columnheader">
                        值
                    </span>
                    <span className="c-a" role="columnheader">
                        <span className="sr">操作</span>
                    </span>
                </div>
                {params.map((p) =>
                    editing === p.index ? (
                        editorRow(false, p.index)
                    ) : (
                        <ParamRow
                            key={p.index}
                            p={p}
                            open={open.has(p.index)}
                            onToggle={() => toggle(p.index)}
                            editable={editable}
                            onCopy={onCopy}
                            onOpenUrl={onOpenUrl}
                            onStartEdit={() => startEdit(p)}
                            onDelete={() => onDelete?.(p.index)}
                            wrap={wrap}
                            onWrap={onWrap}
                        />
                    ),
                )}
                {adding && editorRow(true, null)}
            </div>
            {addButton}
        </>
    );
}
