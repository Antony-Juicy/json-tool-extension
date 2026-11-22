import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { J, SortOrder, stringify } from '../lib/jsonAst';
import { formatPath, Match } from '../lib/jsonpath';
import {
    buildFilter,
    buildTree,
    defaultExpanded,
    FlatNode,
    jsPath,
    pathOf,
    TreeFilter,
    TreeState,
    translate,
    upToDepth,
    visibleRows,
} from '../lib/tree';
import { copyText } from './OutputPane';
import { IconCopy, IconLocate, IconPencil, IconTriangle } from './icons';

const ROW = 24;
const OVERSCAN = 12;
/** horizontal step per depth; guides sit on the chevron centre of each ancestor (8 + 9 + k * INDENT) */
const INDENT = 18;

export type TreeCommand = { kind: 'expandAll' | 'collapseAll' | 'level'; n?: number; seq: number };

interface Props {
    root: J;
    order: SortOrder;
    jpMatches: Match[] | null;
    onUseQuery: (path: string) => void;
    /** keyword filter, driven by the result pane's search field */
    keyword: string;
    command: TreeCommand | null;
    onStatus: (text: string, bad: boolean) => void;
    /** open the field editor for a node */
    onEdit?: (path: (string | number)[]) => void;
    /** click to copy (key or value), double click copies the whole field */
    onPick?: (path: (string | number)[], part: 'key' | 'value', clicks: number, container: boolean) => void;
    /** jump to the same spot in the input */
    onLocate?: (path: (string | number)[]) => void;
}

function Hl({ text, q }: { text: string; q: string }) {
    if (!q) return <>{text}</>;
    const lower = text.toLowerCase();
    const ql = q.toLowerCase();
    const out: (string | JSX.Element)[] = [];
    let i = 0;
    let k = 0;
    for (;;) {
        const j = lower.indexOf(ql, i);
        if (j < 0 || k > 30) break;
        if (j > i) out.push(text.slice(i, j));
        out.push(
            <mark key={k++} className="hit">
                {text.slice(j, j + q.length)}
            </mark>,
        );
        i = j + q.length;
    }
    out.push(text.slice(i));
    return <>{out}</>;
}

function typeLabel(n: J): string {
    switch (n.t) {
        case 'str':
            return `字符串 · ${n.v.length} 个字符`;
        case 'num':
            return /^-?\d+$/.test(n.raw) ? '整数' : '数字';
        case 'bool':
            return '布尔';
        case 'null':
            return 'null';
        case 'obj':
            return `对象 · ${n.entries.length} 个键`;
        case 'arr':
            return `数组 · ${n.items.length} 项`;
    }
}

function Value({ f, open, q }: { f: FlatNode; open: boolean; q: string }) {
    const n = f.node;
    switch (n.t) {
        case 'str': {
            const s = JSON.stringify(n.v);
            return (
                <span className="tk-val t-string">
                    <Hl text={s.length > 300 ? s.slice(0, 299) + '…' : s} q={q} />
                </span>
            );
        }
        case 'num':
            return (
                <span className="tk-val t-number">
                    <Hl text={n.raw} q={q} />
                </span>
            );
        case 'bool':
        case 'null':
            return (
                <span className="tk-val t-literal">
                    <Hl text={n.t === 'null' ? 'null' : String(n.v)} q={q} />
                </span>
            );
        case 'obj':
        case 'arr': {
            const isObj = n.t === 'obj';
            if (!f.count) return <span className="tk-brace">{isObj ? '{}' : '[]'}</span>;
            return (
                <>
                    <span className="tk-brace">{isObj ? (open ? '{' : '{…}') : open ? '[' : '[…]'}</span>
                    <span className="tk-count">{isObj ? `${f.count} 个键` : `${f.count} 项`}</span>
                </>
            );
        }
    }
}

export function TreeView({ root, order, jpMatches, onUseQuery, keyword, command, onStatus, onEdit, onPick, onLocate }: Props) {
    const tree = useMemo(() => buildTree(root, order), [root, order]);

    // expansion + selection, carried over when the document is edited
    const [st, setSt] = useState<TreeState>(() => ({ t: tree, set: defaultExpanded(tree), sel: 0 }));
    let cur = st;
    if (st.t !== tree) {
        cur = translate(st, tree);
        setSt(cur);
    }

    const kw = useDeferredValue(keyword.trim());
    const filter = useMemo(() => buildFilter(tree, kw, jpMatches), [tree, kw, jpMatches]);

    // a filter has its own expansion, so clearing it restores the tree as it was
    const [fst, setFst] = useState<{ f: TreeFilter; set: Set<number> } | null>(null);
    let fcur = fst;
    if (filter && (!fst || fst.f !== filter)) {
        fcur = { f: filter, set: filter.autoOpen };
        setFst(fcur);
    }
    const active = filter && fcur ? fcur.set : cur.set;
    const setActive = (s: Set<number>) => {
        if (filter) setFst({ f: filter, set: s });
        else setSt((p) => ({ ...p, set: s }));
    };
    const sel = cur.sel < tree.nodes.length ? cur.sel : 0;
    const setSel = (i: number) => setSt((p) => ({ ...p, sel: i }));

    const rows = useMemo(() => visibleRows(tree, active, filter), [tree, active, filter]);
    const rowsRef = useRef(rows);
    rowsRef.current = rows;

    const box = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [height, setHeight] = useState(520);

    useLayoutEffect(() => {
        const el = box.current;
        if (!el) return;
        setHeight(el.clientHeight);
        const ro = new ResizeObserver(() => setHeight(el.clientHeight));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const scrollToPos = (pos: number, center = false) => {
        const el = box.current;
        if (!el || pos < 0) return;
        const top = pos * ROW;
        if (center) el.scrollTop = Math.max(0, top - el.clientHeight / 3);
        else if (top < el.scrollTop) el.scrollTop = top;
        else if (top + ROW > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW - el.clientHeight;
    };

    // jump to the first match when a filter is applied; back to the selection when it's cleared
    const lastFilter = useRef<TreeFilter | null>(null);
    useEffect(() => {
        if (filter === lastFilter.current) return;
        const prev = lastFilter.current;
        lastFilter.current = filter;
        const target = filter ? filter.first : prev ? sel : -1;
        if (target < 0) return;
        if (filter) setSel(target);
        requestAnimationFrame(() => scrollToPos(rowsRef.current.indexOf(target), true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    // expand / collapse commands from the shared toolbar
    const lastCmd = useRef(0);
    useEffect(() => {
        if (!command || command.seq === lastCmd.current) return;
        lastCmd.current = command.seq;
        if (command.kind === 'expandAll') setActive(upToDepth(tree, Infinity));
        else if (command.kind === 'collapseAll') setActive(new Set(tree.nodes[0].count ? [0] : []));
        else setActive(upToDepth(tree, command.n ?? 1));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [command]);

    const statusText = filter
        ? filter.matched.size
            ? `${filter.matched.size} 个匹配`
            : kw
              ? '无结果'
              : ''
        : '';
    const statusBad = !!kw && !!filter && !filter.matched.size;
    useEffect(() => onStatus(statusText, statusBad), [statusText, statusBad, onStatus]);

    const [flash, setFlash] = useState('');
    const flashTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(flashTimer.current), []);
    const say = (msg: string) => {
        setFlash(msg);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash(''), 1800);
    };
    const copy = async (text: string, what: string) => {
        await copyText(text, what.trim());
    };

    const toggle = (i: number, open?: boolean, deep = false) => {
        const f = tree.nodes[i];
        if (!f.count) return;
        const s = new Set(active);
        const willOpen = open ?? !s.has(i);
        const apply = (j: number) => {
            if (!tree.nodes[j].count) return;
            if (willOpen) s.add(j);
            else s.delete(j);
        };
        if (deep) for (let j = i; j < f.end; j++) apply(j);
        else apply(i);
        setActive(s);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const pos = rows.indexOf(sel);
        const go = (p: number) => {
            const q = Math.max(0, Math.min(rows.length - 1, p));
            const i = rows[q];
            if (i === undefined) return;
            setSel(i);
            scrollToPos(q);
        };
        const f = tree.nodes[sel];
        const page = Math.max(1, Math.floor(height / ROW) - 1);
        switch (e.key) {
            case 'ArrowDown':
                go(pos < 0 ? 0 : pos + 1);
                break;
            case 'ArrowUp':
                go(pos < 0 ? 0 : pos - 1);
                break;
            case 'PageDown':
                go(pos + page);
                break;
            case 'PageUp':
                go(pos - page);
                break;
            case 'Home':
                go(0);
                break;
            case 'End':
                go(rows.length - 1);
                break;
            case 'ArrowRight':
                if (f?.count && !active.has(sel)) toggle(sel, true);
                else go(pos + 1);
                break;
            case 'ArrowLeft':
                if (f?.count && active.has(sel)) toggle(sel, false);
                else if (f && f.parent >= 0) {
                    setSel(f.parent);
                    scrollToPos(rows.indexOf(f.parent));
                }
                break;
            case 'Enter':
            case ' ':
                toggle(sel);
                break;
            default:
                return;
        }
        e.preventDefault();
    };

    const start = Math.max(0, Math.floor(scrollTop / ROW) - OVERSCAN);
    const end = Math.min(rows.length, Math.ceil((scrollTop + height) / ROW) + OVERSCAN);

    const selF = tree.nodes[sel];
    const selPath = pathOf(tree, sel);
    const selJsonPath = formatPath(selPath);
    const selJs = jsPath(selPath);

    return (
        <div className="tree-wrap">
            <div
                ref={box}
                className="tree"
                role="tree"
                aria-label="JSON 树形视图"
                tabIndex={0}
                onKeyDown={onKeyDown}
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            >
                {rows.length === 0 ? (
                    <div className="tree-empty">没有节点匹配「{kw}」</div>
                ) : (
                    <div className="tree-inner" style={{ height: rows.length * ROW }}>
                        {rows.slice(start, end).map((i, k) => {
                            const f = tree.nodes[i];
                            const open = active.has(i);
                            const isMatch = !!filter && filter.matched.has(i);
                            return (
                                <div
                                    key={i}
                                    role="treeitem"
                                    aria-level={f.depth + 1}
                                    aria-expanded={f.count ? open : undefined}
                                    aria-selected={i === sel}
                                    className={`trow${i === sel ? ' sel' : ''}${isMatch ? ' match' : ''}`}
                                    style={{ top: (start + k) * ROW, paddingLeft: 8 + f.depth * INDENT }}
                                    onClick={(e) => {
                                        setSel(i);
                                        box.current?.focus({ preventScroll: true });
                                        const t = e.target as HTMLElement;
                                        if (!onPick || t.closest('button')) return;
                                        // only the key or a primitive value copies; braces, counts and blank space don't
                                        const onKey = !!t.closest('.tk-key');
                                        const onVal = !f.count && !!t.closest('.tk-val');
                                        if (!onKey && !onVal) return;
                                        if (e.detail === 1 && (window.getSelection()?.toString() ?? '')) return;
                                        if (e.detail >= 2) window.getSelection()?.removeAllRanges();
                                        onPick(pathOf(tree, i), onKey ? 'key' : 'value', e.detail, false);
                                    }}
                                    onDoubleClick={() => {
                                        if (f.count) toggle(i);
                                    }}
                                >
                                    {Array.from({ length: f.depth }, (_, k) => (
                                        <i key={k} className="tg" aria-hidden="true" style={{ left: 17 + k * INDENT }} />
                                    ))}
                                    {f.count ? (
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            className={`tw${open ? ' open' : ''}`}
                                            aria-label={open ? '折叠' : '展开'}
                                            title="Alt+点击：展开或折叠全部子节点"
                                            onClick={(e: MouseEvent) => {
                                                e.stopPropagation();
                                                setSel(i);
                                                toggle(i, undefined, e.altKey);
                                            }}
                                        >
                                            <IconTriangle />
                                        </button>
                                    ) : (
                                        <span className="tw-sp" />
                                    )}
                                    {f.key !== null && (
                                        <>
                                            <span className={typeof f.key === 'number' ? 'tk-idx' : 'tk-key'}>
                                                {typeof f.key === 'number' ? (
                                                    f.key
                                                ) : (
                                                    <Hl text={f.key} q={kw} />
                                                )}
                                            </span>
                                            <span className="tk-colon">:</span>
                                        </>
                                    )}
                                    <Value f={f} open={open} q={kw} />
                                    {onEdit && (
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            className="icon-btn trow-copy trow-edit"
                                            aria-label="编辑字段"
                                            title="编辑这个字段"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSel(i);
                                                onEdit(pathOf(tree, i));
                                            }}
                                        >
                                            <IconPencil />
                                        </button>
                                    )}
                                    {onLocate && (
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            className="icon-btn trow-copy trow-locate"
                                            aria-label="在输入中定位"
                                            title="在左侧输入中定位"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSel(i);
                                                onLocate(pathOf(tree, i));
                                            }}
                                        >
                                            <IconLocate />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        className="icon-btn trow-copy"
                                        aria-label="复制路径"
                                        title="复制路径"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const p = pathOf(tree, i);
                                            const js = jsPath(p);
                                            void copy(js || formatPath(p), ` ${js || '$'}`);
                                        }}
                                    >
                                        <IconCopy />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selF && (
                <div className="tree-detail">
                    <span className="tree-path" title="选中节点的路径">
                        {selJs || '$'}
                    </span>
                    <span className="tree-type">{typeLabel(selF.node)}</span>
                    <div className="tools">
                        {flash && <span className="tree-flash">{flash}</span>}
                        {onEdit && (
                            <button type="button" className="btn sm" onClick={() => onEdit(selPath)} title="编辑这个字段">
                                编辑
                            </button>
                        )}
                        {onLocate && (
                            <button type="button" className="btn sm" onClick={() => onLocate(selPath)} title="在左侧输入中定位这个字段">
                                定位到输入
                            </button>
                        )}
                        <button type="button" className="btn sm" onClick={() => copy(selJs || '$', '路径')}>
                            复制路径
                        </button>
                        <button type="button" className="btn sm" onClick={() => copy(selJsonPath, ' JSONPath')}>
                            复制 JSONPath
                        </button>
                        <button
                            type="button"
                            className="btn sm"
                            onClick={() =>
                                copy(selF.node.t === 'str' ? selF.node.v : stringify(selF.node, '  ', order), '值')
                            }
                        >
                            复制值
                        </button>
                        <button
                            type="button"
                            className="btn sm"
                            disabled={sel === 0}
                            onClick={() => onUseQuery(selJsonPath)}
                            title="把这个路径填入 JSONPath，只显示这个节点"
                        >
                            只看此节点
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
