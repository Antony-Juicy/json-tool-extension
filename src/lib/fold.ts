import { useCallback, useMemo, useState } from 'react';

/** A foldable block: lines (start, end] are hidden when folded; end is the closing-bracket line. */
export interface FoldRange {
    start: number;
    end: number;
    depth: number;
}

/**
 * Bracket-based folding for pretty-printed code: a line ending in { [ ( (ignoring a trailing comma)
 * opens a block, a line starting with } ] ) closes the innermost one. Works for the JSON, TypeScript,
 * Zod, Schema and Mock outputs, which all put brackets at line ends / starts.
 */
export function foldRanges(lines: string[]): FoldRange[] {
    const out: FoldRange[] = [];
    const st: { line: number; depth: number }[] = [];
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (!t) continue;
        if ((t[0] === '}' || t[0] === ']' || t[0] === ')') && st.length) {
            const o = st.pop();
            if (o && i - o.line > 1) out.push({ start: o.line, end: i, depth: o.depth });
        }
        const tail = t.replace(/[,;]$/, '');
        const last = tail[tail.length - 1];
        if (last === '{' || last === '[' || last === '(') st.push({ line: i, depth: st.length });
    }
    return out.sort((a, b) => a.start - b.start);
}

export interface Folding {
    ranges: FoldRange[];
    byStart: Map<number, FoldRange>;
    folded: Set<number>;
    toggle: (start: number) => void;
    expandAll: () => void;
    /** fold every block at this depth or deeper (0 = everything, 1 = keep the root open) */
    foldFrom: (depth: number) => void;
    /** unfold whatever hides this line */
    reveal: (line: number) => void;
    maxDepth: number;
}

export function useFolding(code: string | null): Folding {
    const lines = useMemo(() => (code ? code.replace(/\n$/, '').split('\n') : []), [code]);
    const ranges = useMemo(() => foldRanges(lines), [lines]);
    const byStart = useMemo(() => new Map(ranges.map((r) => [r.start, r])), [ranges]);
    // folds are keyed by line index + that line's text, so they survive edits that keep the line
    const [raw, setRaw] = useState<Map<number, string>>(new Map());

    const folded = useMemo(() => {
        const s = new Set<number>();
        for (const [i, text] of raw) if (byStart.has(i) && lines[i] === text) s.add(i);
        return s;
    }, [raw, byStart, lines]);

    const toggle = useCallback(
        (start: number) =>
            setRaw((m) => {
                const n = new Map(m);
                if (n.has(start) && lines[start] === n.get(start)) n.delete(start);
                else n.set(start, lines[start] ?? '');
                return n;
            }),
        [lines],
    );
    const expandAll = useCallback(() => setRaw(new Map()), []);
    const foldFrom = useCallback(
        (depth: number) => setRaw(new Map(ranges.filter((r) => r.depth >= depth).map((r) => [r.start, lines[r.start]]))),
        [ranges, lines],
    );
    const reveal = useCallback(
        (line: number) =>
            setRaw((m) => {
                let changed = false;
                const n = new Map(m);
                for (const r of ranges) {
                    if (r.start < line && line <= r.end && n.has(r.start)) {
                        n.delete(r.start);
                        changed = true;
                    }
                }
                return changed ? n : m;
            }),
        [ranges],
    );
    const maxDepth = useMemo(() => ranges.reduce((m, r) => Math.max(m, r.depth), 0), [ranges]);
    return { ranges, byStart, folded, toggle, expandAll, foldFrom, reveal, maxDepth };
}
