import { useEffect, useRef } from 'react';
import { BuildRow, looksLikeParamData } from '../lib/urlBuild';

interface Props {
    rows: BuildRow[];
    /** how many rows share each key (a key used more than once is written as an array) */
    sizes: Map<string, number>;
    focusId: number | null;
    onFocused: () => void;
    onChange: (id: number, patch: Partial<BuildRow>) => void;
    onRemove: (id: number) => void;
    onAdd: (afterId?: number) => void;
    /** JSON / key=value data pasted into a key box: return true when it was used as parameters */
    onPasteData?: (text: string) => boolean;
}

const IconTrash = () => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8h5.8l.6-8M6.5 7v3.5M9.5 7v3.5" />
    </svg>
);

/** The key / value rows of the builder. Enter in a value adds a row below; 数组 marks a single value as an array item. */
export function BuildRows({ rows, sizes, focusId, onFocused, onChange, onRemove, onAdd, onPasteData }: Props) {
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (focusId === null) return;
        root.current?.querySelector<HTMLInputElement>(`[data-bk="${focusId}"]`)?.focus();
        onFocused();
    }, [focusId, onFocused]);

    return (
        <div className="brows" ref={root} role="table" aria-label="参数">
            <div className="brow bhead" role="row">
                <span className="c-i" aria-hidden="true">
                    #
                </span>
                <span role="columnheader">键</span>
                <span role="columnheader">值</span>
                <span role="columnheader" title="同名的键会按数组写出；只有一个值时可以手动标记为数组">
                    数组
                </span>
                <span />
            </div>
            {rows.map((r, i) => {
                const forced = (sizes.get(r.key.trim()) ?? 0) > 1;
                const on = forced || r.arr;
                return (
                    <div className="brow" role="row" key={r.id}>
                        <span className="c-i" role="cell">
                            {i + 1}
                        </span>
                        <input
                            className="bin mono"
                            data-bk={r.id}
                            value={r.key}
                            placeholder="键"
                            aria-label={`第 ${i + 1} 个参数的键`}
                            spellCheck={false}
                            autoCapitalize="off"
                            onChange={(e) => onChange(r.id, { key: e.target.value })}
                            onPaste={(e) => {
                                const t = e.clipboardData.getData('text').trim();
                                if (t && onPasteData && looksLikeParamData(t) && onPasteData(t)) e.preventDefault();
                            }}
                        />
                        <input
                            className="bin"
                            value={r.value}
                            placeholder="值"
                            aria-label={`第 ${i + 1} 个参数的值`}
                            spellCheck={false}
                            onChange={(e) => onChange(r.id, { value: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onAdd(r.id);
                                }
                            }}
                        />
                        <button
                            type="button"
                            className={`tag-btn arr${on ? ' on' : ''}`}
                            aria-pressed={on}
                            disabled={forced}
                            title={forced ? '同名的键有多个值，会按数组写出' : on ? '这个值是数组的一项（点击取消）' : '把这个值标记为数组的一项（只有一个值时也按数组写出）'}
                            onClick={() => onChange(r.id, { arr: !r.arr })}
                        >
                            数组
                        </button>
                        <button type="button" className="icon-btn danger" aria-label={`删除第 ${i + 1} 行`} title="删除这一行" onClick={() => onRemove(r.id)}>
                            <IconTrash />
                        </button>
                    </div>
                );
            })}
            <div className="bd-add">
                <button type="button" className="btn sm" onClick={() => onAdd()} title="在末尾添加一行（在值里按 Enter 也可以）">
                    添加参数
                </button>
            </div>
        </div>
    );
}
