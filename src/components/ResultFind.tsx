import { ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { J } from '../lib/jsonAst';
import { starterQueries, suggestPaths } from '../lib/jsonpath';
import { JsonPathQuery } from './QueryBar';
import { CodeSearch, focusInOwnSearchScope } from './SearchBar';
import { IconReplace, IconSearch } from './icons';

const svg = {
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
};

export type FindMode = 'search' | 'path';

interface Props {
    s: CodeSearch;
    mode: FindMode;
    onMode: (m: FindMode) => void;
    /** JSONPath support (formatter only) */
    jp?: JsonPathQuery;
    node?: J;
    /** tree view: the field filters nodes; count comes from the tree */
    treeStatus?: { text: string; bad: boolean } | null;
    disabled?: boolean;
    /** extra controls on the right (fold, wrap) */
    children?: ReactNode;
    placeholder?: string;
    /** matches of the same query in the input editor (searched on both sides) */
    inputCount?: number;
    /** bump to focus the field */
    focusRequest?: number;
    /** field replace: toggle button state and the row shown under the bar */
    replaceOpen?: boolean;
    onToggleReplace?: () => void;
    replaceRow?: ReactNode;
}

function Suggestions({
    items,
    active,
    onPick,
    onHover,
}: {
    items: { label: string; group: string }[];
    active: number;
    onPick: (v: string) => void;
    onHover: (i: number) => void;
}) {
    let last = '';
    return (
        <div className="sugg" role="listbox" aria-label="JSONPath 建议">
            {items.map((it, i) => {
                const head = it.group !== last ? it.group : null;
                last = it.group;
                return (
                    <div key={it.group + it.label}>
                        {head && <div className="sugg-head">{head}</div>}
                        <div
                            role="option"
                            aria-selected={i === active}
                            className={`sugg-item mono${i === active ? ' on' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onPick(it.label);
                            }}
                            onMouseEnter={() => onHover(i)}
                        >
                            {it.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function ResultFind({
    s,
    mode,
    onMode,
    jp,
    node,
    treeStatus,
    disabled,
    children,
    placeholder,
    inputCount,
    focusRequest = 0,
    replaceOpen,
    onToggleReplace,
    replaceRow,
}: Props) {
    const ref = useRef<HTMLInputElement>(null);
    const wrap = useRef<HTMLDivElement>(null);
    const [focus, setFocus] = useState(false);
    const [active, setActive] = useState(-1);
    const pathMode = mode === 'path' && !!jp;

    useEffect(() => {
        if (!focusRequest) return;
        requestAnimationFrame(() => {
            ref.current?.focus();
            ref.current?.select();
        });
    }, [focusRequest]);

    // ⌘F / Ctrl+F focuses this field while it is on screen and the focus is not in an editor
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.defaultPrevented || focusInOwnSearchScope() || disabled) return;
            if (!wrap.current || wrap.current.offsetParent === null) return;
            const mod = e.metaKey || e.ctrlKey;
            if (mod && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                if (mode !== 'search') onMode('search');
                ref.current?.focus();
                ref.current?.select();
            } else if (((mod && e.key.toLowerCase() === 'g') || e.key === 'F3') && s.query && !treeStatus) {
                e.preventDefault();
                if (e.shiftKey) s.prev();
                else s.next();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [s, disabled, mode, onMode, treeStatus]);

    const paths = useMemo(() => (node ? suggestPaths(node) : []), [node]);
    const starters = useMemo(() => (node ? starterQueries(node) : []), [node]);
    const items = useMemo(() => {
        if (!pathMode || !jp) return [];
        const q = jp.path.trim();
        const out: { label: string; group: string }[] = [];
        if (!q || q === '$') starters.forEach((x) => out.push({ label: x, group: '常用查询' }));
        const ql = q.toLowerCase();
        paths
            .filter((p) => !q || (p.toLowerCase().startsWith(ql) && p !== q) || (q.length > 1 && p.toLowerCase().includes(ql) && p !== q))
            .slice(0, 8)
            .forEach((p) => out.push({ label: p, group: '文档中的路径' }));
        return out.slice(0, 12);
    }, [pathMode, jp, paths, starters]);
    useEffect(() => setActive(-1), [items]);

    const value = pathMode && jp ? jp.path : s.query;
    const setValue = (v: string) => (pathMode && jp ? jp.setPath(v) : s.setQuery(v));

    let count = '';
    let bad = false;
    if (pathMode && jp) {
        const st = jp.state;
        const on = jp.path.trim() && jp.path.trim() !== '$';
        if (on) {
            if (jp.pending) count = '…';
            else if (st.kind === 'error') {
                count = '语法有误';
                bad = true;
            } else if (st.kind === 'ok') {
                count = st.count ? `${st.count} 个匹配` : '无匹配';
                bad = !st.count;
            }
        }
    } else if (treeStatus) {
        count = treeStatus.text;
        bad = treeStatus.bad;
    } else if (s.query) {
        if (s.error) {
            count = s.error;
            bad = true;
        } else if (s.pending) count = '…';
        else if (s.hits.length) count = `${s.current + 1} / ${s.hits.length}${s.capped ? '+' : ''}`;
        else {
            count = inputCount ? '结果无匹配' : '无结果';
            bad = !inputCount;
        }
    }
    const inputNote = !pathMode && s.query && !s.error && !s.pending && inputCount !== undefined ? `输入 ${inputCount}` : '';
    const pathError = pathMode && jp && jp.state.kind === 'error' && !jp.pending ? jp.state.message : null;
    const jpActive = !!jp && jp.path.trim() !== '' && jp.path.trim() !== '$';

    const ph = pathMode
        ? '$.data.list[*].id'
        : (placeholder ?? (treeStatus ? '筛选键名或值（⌘F）' : '搜索键名或值（⌘F）'));

    return (
        <div className="rbar" ref={wrap}>
            <div className={`ff${bad ? ' bad' : ''}${disabled ? ' disabled' : ''}`}>
                {jp ? (
                    <div className="ff-mode" role="group" aria-label="查找方式">
                        <button
                            type="button"
                            aria-pressed={!pathMode}
                            onClick={() => {
                                onMode('search');
                                ref.current?.focus();
                            }}
                        >
                            <IconSearch />
                            搜索
                        </button>
                        <button
                            type="button"
                            aria-pressed={pathMode}
                            onClick={() => {
                                onMode('path');
                                ref.current?.focus();
                            }}
                        >
                            JSONPath
                            {jpActive && !pathMode && <span className="ff-dot" aria-label="已生效" />}
                        </button>
                    </div>
                ) : (
                    <span className="ff-ico" aria-hidden="true">
                        <IconSearch />
                    </span>
                )}
                <div className="ff-input-wrap">
                    <input
                        ref={ref}
                        className={`ff-input${pathMode ? ' mono' : ''}`}
                        aria-label={pathMode ? 'JSONPath 查询' : treeStatus ? '筛选节点' : '在结果中搜索'}
                        placeholder={ph}
                        value={value}
                        disabled={disabled}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                        onFocus={() => setFocus(true)}
                        onBlur={() => setFocus(false)}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (pathMode && items.length && focus) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setActive((a) => (a + 1) % items.length);
                                    return;
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
                                    return;
                                }
                                if ((e.key === 'Enter' || e.key === 'Tab') && active >= 0) {
                                    e.preventDefault();
                                    setValue(items[active].label);
                                    return;
                                }
                            }
                            if (e.key === 'Escape') {
                                if (focus && pathMode && items.length) ref.current?.blur();
                                else setValue('');
                            } else if (e.key === 'Enter' && !pathMode && !treeStatus) {
                                e.preventDefault();
                                if (e.shiftKey) s.prev();
                                else s.next();
                            }
                        }}
                    />
                    {focus && pathMode && items.length > 0 && (
                        <Suggestions items={items} active={active} onPick={setValue} onHover={setActive} />
                    )}
                </div>
                {jpActive && !pathMode && (
                    <button
                        type="button"
                        className="ff-chip mono"
                        title={`正在按 JSONPath 筛选：${jp?.path.trim()}，点击编辑`}
                        onClick={() => onMode('path')}
                    >
                        {jp && jp.path.trim().length > 22 ? jp.path.trim().slice(0, 21) + '…' : jp?.path.trim()}
                    </button>
                )}
                <span className={`ff-count${bad ? ' bad' : ''}`} aria-live="polite" title={pathError ?? undefined}>
                    {count}
                    {inputNote && <span className="ff-in" title="左侧输入里的匹配数，同样已高亮">{inputNote}</span>}
                </span>
                {value && (
                    <button type="button" className="icon-btn" aria-label="清除" onClick={() => setValue('')}>
                        <svg {...svg}>
                            <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                    </button>
                )}
            </div>

            {pathMode && jp ? (
                <label className="check rb-check">
                    <input type="checkbox" checked={jp.withPaths} onChange={(e) => jp.setWithPaths(e.target.checked)} />
                    附带路径
                </label>
            ) : !treeStatus || onToggleReplace ? (
                <div className="rb-group">
                    {!treeStatus && (
                        <>
                    <div className="seg xs" role="group" aria-label="搜索选项">
                        <button
                            type="button"
                            aria-pressed={s.caseSens}
                            title="区分大小写"
                            aria-label="区分大小写"
                            onClick={() => s.setCaseSens(!s.caseSens)}
                        >
                            <span className="mono">Aa</span>
                        </button>
                        <button
                            type="button"
                            aria-pressed={s.regex}
                            title="使用正则表达式"
                            aria-label="使用正则表达式"
                            onClick={() => s.setRegex(!s.regex)}
                        >
                            <span className="mono">.*</span>
                        </button>
                    </div>
                    <div className="seg xs" role="group" aria-label="切换匹配">
                        <button type="button" aria-label="上一个" title="上一个（Shift+Enter）" onClick={s.prev} disabled={!s.hits.length}>
                            <svg {...svg}>
                                <path d="M4 10l4-4 4 4" />
                            </svg>
                        </button>
                        <button type="button" aria-label="下一个" title="下一个（Enter）" onClick={s.next} disabled={!s.hits.length}>
                            <svg {...svg}>
                                <path d="M4 6l4 4 4-4" />
                            </svg>
                        </button>
                    </div>
                        </>
                    )}
                    {onToggleReplace && (
                        <button
                            type="button"
                            className={`tbtn wide${replaceOpen ? ' on' : ''}`}
                            aria-pressed={!!replaceOpen}
                            aria-expanded={!!replaceOpen}
                            title="在字段里查找替换（键名或字符串值）"
                            onClick={onToggleReplace}
                        >
                            <IconReplace />
                            替换
                        </button>
                    )}
                </div>
            ) : null}

            {children && <div className="rb-right">{children}</div>}
            {pathError && <div className="rb-error">{pathError}</div>}
            {replaceOpen && replaceRow && <div className="rb-replace">{replaceRow}</div>}
        </div>
    );
}

/* ---------------- fold / wrap controls ---------------- */

export function FoldControls({
    onExpand,
    onCollapse,
    onLevel,
    levels,
    wrap,
    onWrap,
    fold = true,
    lineNumbers,
    onLineNumbers,
}: {
    onExpand: () => void;
    onCollapse: () => void;
    onLevel: (n: number) => void;
    levels: number;
    wrap?: boolean;
    onWrap?: (v: boolean) => void;
    fold?: boolean;
    lineNumbers?: boolean;
    onLineNumbers?: (v: boolean) => void;
}) {
    const n = Math.max(1, Math.min(levels, 6));
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);
    const act = (f: () => void) => () => {
        f();
        setOpen(false);
    };
    const onCount = (lineNumbers ? 1 : 0) + (wrap ? 1 : 0);
    return (
        <div className="vmenu" ref={wrapRef}>
            <button
                type="button"
                className={`vmenu-btn${open ? ' open' : ''}`}
                aria-haspopup="menu"
                aria-expanded={open}
                title="折叠层级、行号、自动换行"
                onClick={() => setOpen((o) => !o)}
            >
                <svg {...svg}>
                    <path d="M2.5 4h11M4.5 8h9M6.5 12h7" />
                </svg>
                显示
                {onCount > 0 && <span className="vmenu-dot" aria-label={`${onCount} 项已开启`} />}
                <svg {...svg} className="vmenu-caret">
                    <path d="M4.5 6.5L8 10l3.5-3.5" />
                </svg>
            </button>
            {open && (
                <div className="vmenu-pop" role="menu" aria-label="显示选项">
                    {fold && (
                        <>
                            <div className="vm-head">折叠</div>
                            <button type="button" role="menuitem" className="vm-row" onClick={act(onExpand)}>
                                <svg {...svg} className="vm-ic">
                                    <path d="M5 6l3-3 3 3M5 10l3 3 3-3" />
                                </svg>
                                <span className="vm-label">全部展开</span>
                            </button>
                            <button type="button" role="menuitem" className="vm-row" onClick={act(onCollapse)} title="全部折叠，保留第一层">
                                <svg {...svg} className="vm-ic">
                                    <path d="M5 3l3 3 3-3M5 13l3-3 3 3" />
                                </svg>
                                <span className="vm-label">全部折叠</span>
                                <span className="vm-hint">保留第一层</span>
                            </button>
                            <div className="vm-row vm-static" role="group" aria-label="展开到第几层">
                                <svg {...svg} className="vm-ic">
                                    <path d="M3 4h10M5.5 8h7.5M8 12h5" />
                                </svg>
                                <span className="vm-label">展开到</span>
                                <span className="vm-levels">
                                    {Array.from({ length: n }, (_, i) => (
                                        <button key={i} type="button" onClick={act(() => onLevel(i + 1))} title={`只展开到第 ${i + 1} 层`} aria-label={`展开到第 ${i + 1} 层`}>
                                            {i + 1}
                                        </button>
                                    ))}
                                </span>
                            </div>
                        </>
                    )}
                    {(onLineNumbers || onWrap) && (
                        <>
                            {fold && <div className="vm-sep" />}
                            <div className="vm-head">显示</div>
                            {onLineNumbers && (
                                <button
                                    type="button"
                                    role="menuitemcheckbox"
                                    aria-checked={!!lineNumbers}
                                    className="vm-row"
                                    onClick={() => onLineNumbers(!lineNumbers)}
                                >
                                    <svg {...svg} className="vm-ic">
                                        <path d="M3 3.5v3M2.2 4.2L3 3.5M2.2 12.5h1.8L2.2 10.4a.9.9 0 1 1 1.6-.7M6.5 5h7M6.5 11h7" />
                                    </svg>
                                    <span className="vm-label">行号</span>
                                    <span className={`vm-switch${lineNumbers ? ' on' : ''}`} aria-hidden="true" />
                                </button>
                            )}
                            {onWrap && (
                                <button
                                    type="button"
                                    role="menuitemcheckbox"
                                    aria-checked={!!wrap}
                                    className="vm-row"
                                    title="长行折到下一行显示，不用左右滚动"
                                    onClick={() => onWrap(!wrap)}
                                >
                                    <svg {...svg} className="vm-ic">
                                        <path d="M2.5 4h11M2.5 8h9a2 2 0 0 1 0 4H9M10.5 10.5L9 12l1.5 1.5M2.5 12h4" />
                                    </svg>
                                    <span className="vm-label">自动换行</span>
                                    <span className={`vm-switch${wrap ? ' on' : ''}`} aria-hidden="true" />
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}


