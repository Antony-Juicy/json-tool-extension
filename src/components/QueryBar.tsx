import { useDeferredValue, useId, useMemo, useRef, useState } from 'react';
import { J, SortOrder, stringify } from '../lib/jsonAst';
import { formatPath, Match, PathError, query, starterQueries, suggestPaths } from '../lib/jsonpath';
import { usePersisted } from '../lib/settings';

export type QueryState =
    | { kind: 'off' }
    | { kind: 'error'; message: string }
    | { kind: 'ok'; output: string; count: number; matches: Match[] };

export function useJsonPath(node: J | undefined, indent: string, order: SortOrder) {
    const [path, setPath] = useState('');
    const [withPaths, setWithPaths] = usePersisted('fmt.jpWithPaths', false);
    const q = useDeferredValue(path);

    const state = useMemo<QueryState>(() => {
        const t = q.trim();
        if (!node || !t || t === '$') return { kind: 'off' };
        try {
            const matches = query(node, t);
            const out: J = withPaths
                ? {
                      t: 'arr',
                      items: matches.map((m) => ({
                          t: 'obj',
                          entries: [
                              ['path', { t: 'str', v: formatPath(m.path) }],
                              ['value', m.node],
                          ],
                      })),
                  }
                : { t: 'arr', items: matches.map((m) => m.node) };
            return { kind: 'ok', output: stringify(out, indent, order), count: matches.length, matches };
        } catch (e) {
            if (e instanceof PathError) return { kind: 'error', message: e.message };
            if (e instanceof RangeError) return { kind: 'error', message: '文档嵌套过深，无法查询' };
            return { kind: 'error', message: e instanceof Error ? e.message : String(e) };
        }
    }, [node, q, withPaths, indent, order]);

    return { path, setPath, withPaths, setWithPaths, state, pending: path !== q };
}

export type JsonPathQuery = ReturnType<typeof useJsonPath>;

export function QueryBar({ jp, node }: { jp: JsonPathQuery; node: J | undefined }) {
    const listId = useId();
    const ref = useRef<HTMLInputElement>(null);
    const paths = useMemo(() => (node ? suggestPaths(node) : []), [node]);
    const starters = useMemo(() => (node ? starterQueries(node) : []), [node]);
    const s = jp.state;
    const active = jp.path.trim() !== '' && jp.path.trim() !== '$';

    const status =
        !active || !node
            ? ''
            : jp.pending
              ? '…'
              : s.kind === 'error'
                ? s.message
                : s.kind === 'ok'
                  ? s.count
                      ? `${s.count} 个匹配`
                      : '没有匹配'
                  : '';
    const bad = active && !jp.pending && (s.kind === 'error' || (s.kind === 'ok' && !s.count));

    return (
        <div className="querybar">
            <div className="query-row">
                <label className="query-label mono" htmlFor={listId + '-in'}>
                    JSONPath
                </label>
                <div className={`search-field query-field${bad ? ' bad' : ''}`}>
                    <input
                        id={listId + '-in'}
                        ref={ref}
                        className="search-input mono"
                        list={listId}
                        placeholder="$.data.list[*].id"
                        value={jp.path}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                        disabled={!node}
                        onChange={(e) => jp.setPath(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') jp.setPath('');
                        }}
                    />
                    {jp.path && (
                        <button type="button" className="icon-btn" aria-label="清除查询" onClick={() => jp.setPath('')}>
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
                                <path d="M4 4l8 8M12 4l-8 8" />
                            </svg>
                        </button>
                    )}
                </div>
                <label className="check">
                    <input type="checkbox" checked={jp.withPaths} onChange={(e) => jp.setWithPaths(e.target.checked)} />
                    附带路径
                </label>
                <datalist id={listId}>
                    {paths.map((p) => (
                        <option key={p} value={p} />
                    ))}
                </datalist>
            </div>
            <div className="query-sub" aria-live="polite">
                {active ? (
                    <span className={bad ? 'query-status bad' : 'query-status'}>{status}</span>
                ) : starters.length ? (
                    <>
                        <span className="query-hint">试试</span>
                        {starters.map((q) => (
                            <button
                                key={q}
                                type="button"
                                className="chip mono"
                                onClick={() => {
                                    jp.setPath(q);
                                    ref.current?.focus();
                                }}
                            >
                                {q}
                            </button>
                        ))}
                    </>
                ) : (
                    <span className="query-hint">按路径筛选结果，例如 $..id</span>
                )}
            </div>
        </div>
    );
}
