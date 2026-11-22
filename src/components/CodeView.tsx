import { memo, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Folding } from '../lib/fold';
import { IconCopy, IconLocate, IconPencil, IconTriangle } from './icons';

const TOKEN =
    /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\/\^[^/\n]*\/)|\b(export|interface|type|const|import|from|readonly|typeof)\b|\b(null|true|false|undefined)\b|\b(string|number|boolean|unknown|Array|Record|z)\b|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|\b([A-Z][A-Za-z0-9_]*)\b/g;

const DOC_LINE = /^\s*(\/\*\*|\*\/|\*(\s|$))/;

export interface Tok {
    text: string;
    cls?: string;
}

function tokenizeDoc(line: string): Tok[] {
    return line
        .split(/(@\w+)/)
        .filter(Boolean)
        .map((part) => ({ text: part, cls: part.startsWith('@') ? 't-doctag' : 't-comment' }));
}

export function tokenize(line: string): Tok[] {
    if (DOC_LINE.test(line)) return tokenizeDoc(line);
    const out: Tok[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(line))) {
        if (m[0].length === 0) {
            TOKEN.lastIndex++;
            continue;
        }
        if (m.index > last) out.push({ text: line.slice(last, m.index) });
        let cls = 't-type';
        if (m[1]) cls = 't-comment';
        else if (m[2]) {
            const rest = line.slice(m.index + m[0].length);
            cls = /^\s*:/.test(rest) ? 't-key' : 't-string';
        } else if (m[3]) cls = 't-string';
        else if (m[4]) cls = 't-keyword';
        else if (m[5]) cls = 't-literal';
        else if (m[6]) cls = 't-builtin';
        else if (m[7]) cls = 't-number';
        out.push({ text: m[0], cls });
        last = m.index + m[0].length;
    }
    if (last < line.length) out.push({ text: line.slice(last) });
    return out;
}

/** A search match: 0-based line, [start, end) columns in that line. */
export interface Hit {
    line: number;
    start: number;
    end: number;
}

export interface Range {
    start: number;
    end: number;
    idx: number;
}

export function renderLine(toks: Tok[], ranges: Range[] | undefined, cur: number, markClass = 'hit'): ReactNode[] {
    if (!ranges || !ranges.length) {
        return toks.map((t, i) =>
            t.cls ? (
                <span key={i} className={t.cls}>
                    {t.text}
                </span>
            ) : (
                t.text
            ),
        );
    }
    const out: ReactNode[] = [];
    let pos = 0;
    let k = 0;
    let key = 0;
    for (const t of toks) {
        const tEnd = pos + t.text.length;
        let s = pos;
        while (s < tEnd) {
            while (k < ranges.length && ranges[k].end <= s) k++;
            const r = ranges[k];
            let e: number;
            let hit: Range | null = null;
            if (r && r.start <= s) {
                e = Math.min(r.end, tEnd);
                hit = r;
            } else {
                e = Math.min(r ? r.start : tEnd, tEnd);
            }
            const text = t.text.slice(s - pos, e - pos);
            const inner = t.cls ? <span className={t.cls}>{text}</span> : text;
            out.push(
                hit ? (
                    <mark key={key++} className={hit.idx === cur ? `${markClass} cur` : markClass}>
                        {inner}
                    </mark>
                ) : t.cls ? (
                    <span key={key++} className={t.cls}>
                        {text}
                    </span>
                ) : (
                    text
                ),
            );
            s = e;
        }
        pos = tEnd;
    }
    return out;
}

/** px per indent level, and the space kept left of the root level for its fold triangle */
const LEVEL = 22;
const BASE = 20;

const Line = memo(
    ({
        n,
        text,
        plain,
        ranges,
        cur,
        fold,
        folded,
        onToggle,
        tail,
        depth,
        leadLen,
        showLn,
        onEdit,
        onPick,
        onLocate,
        blk,
        blkDepth = -1,
    }: {
        n: number;
        text: string;
        plain?: boolean;
        ranges?: Range[];
        cur: number;
        /** number of hidden lines when this line starts a foldable block */
        fold?: number;
        folded?: boolean;
        onToggle?: (line: number) => void;
        /** the closing line, shown inline after the placeholder when folded */
        tail?: string;
        depth: number;
        leadLen: number;
        showLn: boolean;
        /** makes the line editable: only the pencil opens the field editor */
        onEdit?: (line: number) => void;
        /** click to copy: part is the key when the key was clicked, else the value; clicks = click count */
        onPick?: (line: number, part: 'key' | 'value', clicks: number) => void;
        /** this line belongs to the hovered block: its position in it, and the block's depth */
        blk?: 'top' | 'mid' | 'bottom' | 'single';
        blkDepth?: number;
        /** jump to the same spot in the input */
        onLocate?: (line: number) => void;
    }) => {
        const lead = text.slice(0, leadLen);
        const body = text.slice(leadLen);
        const toks = useMemo(() => (plain ? [{ text: body }] : tokenize(body)), [body, plain]);
        const tailToks = useMemo(() => (tail === undefined ? null : plain ? [{ text: tail }] : tokenize(tail)), [tail, plain]);
        // search ranges are columns of the full line; the body starts after the indentation
        const shifted = useMemo(
            () =>
                ranges
                    ?.map((r) => ({ ...r, start: Math.max(0, r.start - leadLen), end: r.end - leadLen }))
                    .filter((r) => r.end > 0),
            [ranges, leadLen],
        );
        const guides: ReactNode[] = [];
        for (let k = 0; k < depth; k++)
            guides.push(
                <i key={k} className={k === blkDepth ? 'ig on' : 'ig'} style={{ left: BASE + k * LEVEL - 10 }} />,
            );
        return (
            <div
                data-ln={n - 1}
                className={`line${cur >= 0 ? ' cur-line' : ''}${folded ? ' folded' : ''}${onEdit ? ' editable' : ''}${onPick ? ' pickable' : ''}`}
            >
                {showLn && (
                    <span className="gut">
                        <span className="ln">{n}</span>
                    </span>
                )}
                <span className="lc">
                    {blk && (
                        <i className={`blkbg ${blk}`} style={{ left: BASE + (blkDepth ?? 0) * LEVEL - 20 }} aria-hidden="true" />
                    )}
                    <span className="lead" style={{ width: BASE + depth * LEVEL }}>
                        {lead}
                        {guides}
                        {fold !== undefined && (
                            <button
                                type="button"
                                tabIndex={-1}
                                className={`cfold${folded ? ' closed' : ''}`}
                                style={{ left: BASE + depth * LEVEL - 17 }}
                                aria-label={folded ? '展开' : '折叠'}
                                title={folded ? `展开 ${fold} 行` : '折叠'}
                                onClick={() => onToggle?.(n - 1)}
                            >
                                <IconTriangle />
                            </button>
                        )}
                    </span>
                    <span
                        className="ltx"
                        onClick={
                            onPick
                                ? (e) => {
                                      const t = e.target as HTMLElement;
                                      if (t.closest('button')) return;
                                      // only the key or the value itself copies; brackets, commas and blank space don't
                                      const tok = t.closest('.t-key, .t-string, .t-number, .t-literal');
                                      if (!tok) return;
                                      // a drag that selected text is a manual copy, not a click
                                      if (e.detail === 1 && (window.getSelection()?.toString() ?? '')) return;
                                      if (e.detail >= 2) window.getSelection()?.removeAllRanges();
                                      onPick(n - 1, tok.classList.contains('t-key') ? 'key' : 'value', e.detail);
                                  }
                                : undefined
                        }
                    >
                        {body ? renderLine(toks, shifted, cur) : ' '}
                        {folded && tailToks && (
                            <>
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    className="fold-ph"
                                    title={`展开 ${fold} 行`}
                                    onClick={() => onToggle?.(n - 1)}
                                >
                                    ⋯ {fold} 行
                                </button>
                                {renderLine(tailToks, undefined, -1)}
                            </>
                        )}
                        {onEdit && (
                            <button
                                type="button"
                                tabIndex={-1}
                                className="ledit"
                                title="编辑这个字段"
                                aria-label="编辑字段"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(n - 1);
                                }}
                            >
                                <IconPencil />
                            </button>
                        )}
                        {onPick && (
                            <button
                                type="button"
                                tabIndex={-1}
                                className="ledit lcopy"
                                title="复制整个字段"
                                aria-label="复制字段"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPick(n - 1, 'value', 2);
                                }}
                            >
                                <IconCopy />
                            </button>
                        )}
                        {onLocate && (
                            <button
                                type="button"
                                tabIndex={-1}
                                className="ledit llocate"
                                title="在左侧输入中定位这个字段"
                                aria-label="在输入中定位"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onLocate(n - 1);
                                }}
                            >
                                <IconLocate />
                            </button>
                        )}
                    </span>
                </span>
            </div>
        );
    },
);

interface Props {
    code: string;
    dim?: boolean;
    wrap?: boolean;
    plain?: boolean;
    hits?: Hit[];
    current?: number;
    folding?: Folding;
    lineNumbers?: boolean;
    /** lines that can be edited (true) and the handler; omit to make the view read-only */
    editable?: (line: number) => boolean;
    onEditLine?: (line: number) => void;
    onPickLine?: (line: number, part: 'key' | 'value', clicks: number) => void;
    /** jump to the same spot in the input (only offered on lines where locatable(line) is true) */
    onLocateLine?: (line: number) => void;
    locatable?: (line: number) => boolean;
    className?: string;
}

export const CodeView = memo(
    ({ code, dim, wrap, plain, hits, current = -1, folding, lineNumbers = false, editable, onEditLine, onPickLine, onLocateLine, locatable, className }: Props) => {
    const box = useRef<HTMLDivElement>(null);
    const lines = useMemo(() => code.replace(/\n$/, '').split('\n'), [code]);
    // indentation: the smallest space indent is one level; a tab is one level
    const indent = useMemo(() => {
        const leads = lines.map((l) => /^[ \t]*/.exec(l)?.[0] ?? '');
        let unit = 0;
        for (const ld of leads) if (ld.length && !ld.includes('\t') && (unit === 0 || ld.length < unit)) unit = ld.length;
        return leads.map((ld) => ({
            len: ld.length,
            depth: Math.min(40, ld.includes('\t') ? ld.split('\t').length - 1 : unit ? Math.floor(ld.length / unit) : 0),
        }));
    }, [lines]);
    const byLine = useMemo(() => {
        const map = new Map<number, Range[]>();
        (hits ?? []).forEach((h, idx) => {
            const arr = map.get(h.line);
            const r = { start: h.start, end: h.end, idx };
            if (arr) arr.push(r);
            else map.set(h.line, [r]);
        });
        return map;
    }, [hits]);
    const curLine = hits && current >= 0 && current < hits.length ? hits[current].line : -1;

    // block hover: only on a level line (the line that opens or closes a block), never on a plain field
    const [hover, setHover] = useState(-1);
    const block = useMemo(() => {
        if (hover < 0 || !folding) return null;
        let best: { start: number; end: number; depth: number } | null = null;
        for (const r of folding.ranges) {
            if (r.start > hover) break;
            if (r.start === hover || r.end === hover) {
                // innermost: the latest-starting range that opens or closes on this line
                if (!best || r.start >= best.start) best = r;
            }
        }
        return best;
    }, [hover, folding]);
    const onMove = (e: ReactMouseEvent) => {
        const el = (e.target as HTMLElement).closest<HTMLElement>('[data-ln]');
        const ln = el ? Number(el.dataset.ln) : -1;
        if (ln !== hover) setHover(ln);
    };

    // a search match inside a folded block opens it
    const reveal = folding?.reveal;
    useEffect(() => {
        if (curLine >= 0 && reveal) reveal(curLine);
    }, [curLine, reveal]);

    useEffect(() => {
        const el = box.current;
        if (!el || curLine < 0) return;
        const mark = el.querySelector('mark.cur');
        if (!mark) return;
        const c = el.getBoundingClientRect();
        const m = mark.getBoundingClientRect();
        if (m.top < c.top + 24 || m.bottom > c.bottom - 24) {
            el.scrollTop += m.top - c.top - el.clientHeight / 2;
        }
        if (m.left < c.left + 72 || m.right > c.right - 16) {
            el.scrollLeft += m.left - c.left - el.clientWidth / 2;
        }
    }, [current, curLine, hits, folding?.folded]);

    const rows: ReactNode[] = [];
    for (let i = 0; i < lines.length; i++) {
        const fr = folding?.byStart.get(i);
        const isFolded = !!fr && !!folding?.folded.has(i);
        const blockEnd = block && isFolded && i === block.start ? block.start : block?.end;
        const inBlock = !!block && blockEnd !== undefined && i >= block.start && i <= blockEnd;
        const blk = !inBlock
            ? undefined
            : i === block.start && i === blockEnd
              ? 'single'
              : i === block.start
                ? 'top'
                : i === blockEnd
                  ? 'bottom'
                  : 'mid';
        rows.push(
            <Line
                key={i}
                n={i + 1}
                text={lines[i]}
                plain={plain}
                ranges={byLine.get(i)}
                cur={i === curLine ? current : -1}
                fold={fr ? fr.end - fr.start - 1 : undefined}
                folded={isFolded}
                onToggle={folding?.toggle}
                tail={isFolded && fr ? lines[fr.end].trim() : undefined}
                depth={indent[i]?.depth ?? 0}
                leadLen={indent[i]?.len ?? 0}
                showLn={lineNumbers}
                onEdit={onEditLine && (!editable || editable(i)) ? onEditLine : undefined}
                onPick={onPickLine}
                onLocate={onLocateLine && (!locatable || locatable(i)) ? onLocateLine : undefined}
                blk={blk}
                blkDepth={inBlock && block ? block.depth : -1}
            />,
        );
        if (isFolded && fr) i = fr.end;
    }

    return (
        <div
            ref={box}
            className={`code v2${dim ? ' dim' : ''}${wrap ? ' wrap' : ''}${lineNumbers ? ' with-ln' : ''}${className ? ' ' + className : ''}`}
            role="region"
            aria-label="结果代码"
            tabIndex={0}
            onMouseMove={folding ? onMove : undefined}
            onMouseLeave={folding ? () => setHover(-1) : undefined}
        >
            <div className="code-inner">{rows}</div>
        </div>
    );
    },
);
