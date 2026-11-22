import { RefObject, useEffect, useState } from 'react';
import { CodeSearch, escapeRe } from './SearchBar';
import { IconChevron } from './icons';

const svg = {
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
};

interface Props {
    s: CodeSearch;
    value: string;
    onChange: (v: string) => void;
    lineStarts: number[];
    inputRef: RefObject<HTMLInputElement>;
    /** close the widget; when selectCurrent is set, select the current match in the editor */
    onClose: (selectCurrent: boolean) => void;
}

export function FindWidget({ s, value, onChange, lineStarts, inputRef, onClose }: Props) {
    const [showReplace, setShowReplace] = useState(false);
    const [rep, setRep] = useState('');
    const [undo, setUndo] = useState<{ prev: string; after: string; n: number } | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        if (undo && value !== undo.after) setUndo(null);
    }, [value, undo]);
    useEffect(() => setMsg(null), [s.query, s.regex, s.caseSens, rep]);

    const bad = !!s.error || (!!s.query && !s.pending && !s.hits.length);
    const count = s.error
        ? s.error
        : !s.query
          ? ''
          : s.pending
            ? '…'
            : s.hits.length
              ? `${s.current + 1} / ${s.hits.length}${s.capped ? '+' : ''}`
              : '无结果';

    const matchesEmpty = () => {
        if (!s.regex) return false;
        try {
            return new RegExp(s.query).test('');
        } catch {
            return false;
        }
    };

    const replaceOne = () => {
        const h = s.hits[s.current];
        if (!h) return;
        if (matchesEmpty()) {
            setMsg('这个正则会匹配空字符串，无法替换');
            return;
        }
        const a = lineStarts[h.line] + h.start;
        const b = lineStarts[h.line] + h.end;
        const matched = value.slice(a, b);
        let out = rep;
        if (s.regex) {
            try {
                out = matched.replace(new RegExp(s.query, s.caseSens ? '' : 'i'), rep);
            } catch {
                return;
            }
        }
        onChange(value.slice(0, a) + out + value.slice(b));
    };

    const replaceAll = () => {
        if (!s.hits.length) return;
        if (matchesEmpty()) {
            setMsg('这个正则会匹配空字符串，无法替换');
            return;
        }
        let re: RegExp;
        try {
            re = new RegExp(s.regex ? s.query : escapeRe(s.query), s.caseSens ? 'g' : 'gi');
        } catch {
            return;
        }
        let n = 0;
        const next = value
            .split('\n')
            .map((l) => {
                const m = l.match(re);
                if (!m) return l;
                n += m.length;
                return s.regex ? l.replace(re, rep) : l.replace(re, () => rep);
            })
            .join('\n');
        if (next === value) return;
        setUndo({ prev: value, after: next, n });
        onChange(next);
    };

    return (
        <div className="find" role="search" aria-label="在输入中查找">
            <div className="find-row">
                <button
                    type="button"
                    className={`icon-btn find-toggle${showReplace ? ' open' : ''}`}
                    aria-label={showReplace ? '隐藏替换' : '显示替换'}
                    aria-expanded={showReplace}
                    title="替换"
                    onClick={() => setShowReplace((v) => !v)}
                >
                    <IconChevron />
                </button>
                <div className={`search-field${bad ? ' bad' : ''}`}>
                    <input
                        ref={inputRef}
                        className="search-input"
                        aria-label="查找"
                        placeholder="查找"
                        value={s.query}
                        spellCheck={false}
                        onChange={(e) => s.setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (e.shiftKey) s.prev();
                                else s.next();
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                onClose(true);
                            } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
                                e.preventDefault();
                                e.stopPropagation();
                                e.currentTarget.select();
                            }
                        }}
                    />
                    <span className={`search-count${bad ? ' bad' : ''}`} aria-live="polite">
                        {count}
                    </span>
                </div>
                <div className="seg small" role="group" aria-label="查找选项">
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
                <button type="button" className="icon-btn" aria-label="关闭查找" title="关闭（Esc）" onClick={() => onClose(false)}>
                    <svg {...svg}>
                        <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                </button>
            </div>
            {showReplace && (
                <div className="find-row find-rep">
                    <span className="find-toggle-sp" />
                    <div className="search-field">
                        <input
                            className="search-input"
                            aria-label="替换为"
                            placeholder={s.regex ? '替换为（支持 $1）' : '替换为'}
                            value={rep}
                            spellCheck={false}
                            onChange={(e) => setRep(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (e.metaKey || e.ctrlKey) replaceAll();
                                    else replaceOne();
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    onClose(true);
                                }
                            }}
                        />
                    </div>
                    <button type="button" className="btn sm" onClick={replaceOne} disabled={!s.hits.length} title="替换当前（Enter）">
                        替换
                    </button>
                    <button type="button" className="btn sm" onClick={replaceAll} disabled={!s.hits.length} title="全部替换（⌘Enter / Ctrl+Enter）">
                        全部替换
                    </button>
                </div>
            )}
            {(undo || msg) && (
                <div className="find-note" aria-live="polite">
                    {msg ? (
                        <span className="ss-bad">{msg}</span>
                    ) : (
                        undo && (
                            <>
                                <span>已替换 {undo.n} 处</span>
                                <button
                                    type="button"
                                    className="link"
                                    onClick={() => {
                                        onChange(undo.prev);
                                        setUndo(null);
                                    }}
                                >
                                    撤销
                                </button>
                            </>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
