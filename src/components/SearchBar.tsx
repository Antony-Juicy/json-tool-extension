import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Hit } from './CodeView';
import { usePersisted } from '../lib/settings';

const MAX_HITS = 5000;

export const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True when keyboard focus is inside an editor that handles ⌘F itself. */
export const focusInOwnSearchScope = () => {
    const a = document.activeElement;
    return !!(a instanceof Element && a.closest('[data-search-scope]'));
};

export function findHits(code: string | null, q: string, caseSens: boolean, regex: boolean) {
    const empty = { hits: [] as Hit[], error: null as string | null, capped: false };
    if (!code || !q) return empty;
    let re: RegExp;
    try {
        re = new RegExp(regex ? q : escapeRe(q), caseSens ? 'g' : 'gi');
    } catch {
        return { ...empty, error: '正则无效' };
    }
    const out: Hit[] = [];
    const lines = code.replace(/\n$/, '').split('\n');
    for (let i = 0; i < lines.length && out.length < MAX_HITS; i++) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(lines[i]))) {
            if (!m[0].length) {
                re.lastIndex++;
                continue;
            }
            out.push({ line: i, start: m.index, end: m.index + m[0].length });
            if (out.length >= MAX_HITS) break;
        }
    }
    return { hits: out, error: null, capped: out.length >= MAX_HITS };
}

export function useCodeSearch(code: string | null, scope = 'search') {
    const [query, setQuery] = useState('');
    const [caseSens, setCaseSens] = usePersisted(`${scope}.case`, false);
    const [regex, setRegex] = usePersisted(`${scope}.regex`, false);
    const [cur, setCur] = useState(0);
    const q = useDeferredValue(query);

    const { hits, error, capped } = useMemo(() => findHits(code, q, caseSens, regex), [code, q, caseSens, regex]);

    useEffect(() => setCur(0), [q, caseSens, regex]);

    const current = hits.length ? Math.min(cur, hits.length - 1) : -1;
    const step = (d: number) => {
        if (!hits.length) return;
        setCur((c) => (Math.min(c, hits.length - 1) + d + hits.length) % hits.length);
    };

    return {
        query,
        setQuery,
        caseSens,
        setCaseSens,
        regex,
        setRegex,
        hits,
        error,
        capped,
        current,
        next: () => step(1),
        prev: () => step(-1),
        pending: query !== q,
    };
}

export type CodeSearch = ReturnType<typeof useCodeSearch>;

const svg = {
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
};

export function SearchBar({ s, disabled }: { s: CodeSearch; disabled?: boolean }) {
    const ref = useRef<HTMLInputElement>(null);
    const wrap = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.defaultPrevented || focusInOwnSearchScope()) return;
            const visible = wrap.current && wrap.current.offsetParent !== null;
            if (!visible || disabled) return;
            const mod = e.metaKey || e.ctrlKey;
            if (mod && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                ref.current?.focus();
                ref.current?.select();
            } else if ((mod && e.key.toLowerCase() === 'g') || e.key === 'F3') {
                if (!s.query) return;
                e.preventDefault();
                if (e.shiftKey) s.prev();
                else s.next();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [s, disabled]);

    const count = s.error
        ? s.error
        : !s.query
          ? ''
          : s.pending
            ? '…'
            : s.hits.length
              ? `${s.current + 1} / ${s.hits.length}${s.capped ? '+' : ''}`
              : '无结果';
    const bad = !!s.error || (!!s.query && !s.pending && !s.hits.length);

    return (
        <div className="searchbar" ref={wrap}>
            <div className={`search-field${bad ? ' bad' : ''}`}>
                <svg {...svg} className="search-ico">
                    <circle cx="7" cy="7" r="4.5" />
                    <path d="M10.5 10.5L14 14" />
                </svg>
                <input
                    ref={ref}
                    className="search-input"
                    aria-label="在结果中搜索"
                    placeholder="搜索键名或值（⌘F / Ctrl+F）"
                    value={s.query}
                    spellCheck={false}
                    disabled={disabled}
                    onChange={(e) => s.setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (e.shiftKey) s.prev();
                            else s.next();
                        } else if (e.key === 'Escape') {
                            s.setQuery('');
                        }
                    }}
                />
                <span className={`search-count${bad ? ' bad' : ''}`} aria-live="polite">
                    {count}
                </span>
                {s.query && (
                    <button type="button" className="icon-btn" aria-label="清除搜索" onClick={() => s.setQuery('')}>
                        <svg {...svg}>
                            <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                    </button>
                )}
            </div>
            <div className="seg small" role="group" aria-label="搜索选项">
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
            <div className="seg small" role="group" aria-label="切换匹配">
                <button type="button" aria-label="上一个匹配" title="上一个（Shift+Enter）" onClick={s.prev} disabled={!s.hits.length}>
                    <svg {...svg}>
                        <path d="M4 10l4-4 4 4" />
                    </svg>
                </button>
                <button type="button" aria-label="下一个匹配" title="下一个（Enter）" onClick={s.next} disabled={!s.hits.length}>
                    <svg {...svg}>
                        <path d="M4 6l4 4 4-4" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
