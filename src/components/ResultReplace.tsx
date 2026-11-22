import { useEffect, useRef } from 'react';
import { CodeSearch } from './SearchBar';
import { ReplaceScope } from '../lib/edit';
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
    /** tree view: matches are counted by the tree, not by the text search */
    treeText?: string;
    showReplace: boolean;
    onToggleReplace: () => void;
    rep: string;
    onRep: (v: string) => void;
    scope: ReplaceScope;
    onScope: (v: ReplaceScope) => void;
    onReplaceOne: () => void;
    onReplaceAll: () => void;
    canOne: boolean;
    canAll: boolean;
    note: string;
    noteBad: boolean;
    onClose: () => void;
}

/** Same floating find & replace widget as the input editor, working on the result. */
export function ResultReplace(p: Props) {
    const { s } = p;
    const findInput = useRef<HTMLInputElement>(null);
    useEffect(() => {
        findInput.current?.focus();
        findInput.current?.select();
    }, []);

    const inTree = p.treeText !== undefined;
    const bad = !!s.error || (!!s.query && !inTree && !s.pending && !s.hits.length);
    const count = inTree
        ? p.treeText
        : s.error
          ? s.error
          : !s.query
            ? ''
            : s.pending
              ? '…'
              : s.hits.length
                ? `${s.current + 1} / ${s.hits.length}${s.capped ? '+' : ''}`
                : '无结果';

    return (
        <div className="find" role="search" aria-label="在结果中查找和替换">
            <div className="find-row">
                <button
                    type="button"
                    className={`icon-btn find-toggle${p.showReplace ? ' open' : ''}`}
                    aria-label={p.showReplace ? '隐藏替换' : '显示替换'}
                    aria-expanded={p.showReplace}
                    title="替换"
                    onClick={p.onToggleReplace}
                >
                    <IconChevron />
                </button>
                <div className={`search-field${bad ? ' bad' : ''}`}>
                    <input
                        ref={findInput}
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
                                p.onClose();
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
                <button type="button" className="icon-btn" aria-label="关闭" title="关闭（Esc）" onClick={p.onClose}>
                    <svg {...svg}>
                        <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                </button>
            </div>
            {p.showReplace && (
                <div className="find-row find-rep">
                    <span className="find-toggle-sp" />
                    <div className="search-field">
                        <input
                            className="search-input"
                            aria-label="替换为"
                            placeholder={s.regex ? '替换为（支持 $1）' : '替换为'}
                            value={p.rep}
                            spellCheck={false}
                            onChange={(e) => p.onRep(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (e.metaKey || e.ctrlKey) p.onReplaceAll();
                                    else p.onReplaceOne();
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    p.onClose();
                                }
                            }}
                        />
                    </div>
                    <label className="sr" htmlFor="rep-scope">
                        全部替换的范围
                    </label>
                    <select
                        id="rep-scope"
                        className="text xs rep-scope"
                        value={p.scope}
                        title="「全部替换」的范围：只换值、只换键名，或两者都换"
                        onChange={(e) => p.onScope(e.target.value as ReplaceScope)}
                    >
                        <option value="value">只换值</option>
                        <option value="key">只换键名</option>
                        <option value="both">键名和值</option>
                    </select>
                    <button
                        type="button"
                        className="btn sm"
                        onClick={p.onReplaceOne}
                        disabled={!p.canOne}
                        title="替换当前这一处（Enter）"
                    >
                        替换
                    </button>
                    <button
                        type="button"
                        className="btn sm"
                        onClick={p.onReplaceAll}
                        disabled={!p.canAll}
                        title="全部替换（⌘Enter / Ctrl+Enter），只改右侧结果"
                    >
                        全部替换
                    </button>
                </div>
            )}
            {p.note && (
                <div className="find-note" aria-live="polite">
                    <span className={p.noteBad ? 'ss-bad' : undefined}>{p.note}</span>
                </div>
            )}
        </div>
    );
}
