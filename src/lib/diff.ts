import { J } from './jsonAst';
import { formatPath, Step } from './jsonpath';

/* ---------------- structural diff ---------------- */

export type ChangeKind = 'added' | 'removed' | 'changed' | 'type';

export interface Change {
    kind: ChangeKind;
    /** path in the old document (null when added) */
    pathA: Step[] | null;
    /** path in the new document (null when removed) */
    pathB: Step[] | null;
    a?: J;
    b?: J;
}

export interface StructDiff {
    changes: Change[];
    notes: string[];
    counts: Record<ChangeKind, number>;
    capped: boolean;
}

const BIG = 2 ** 53;
const MAX_CHANGES = 5000;

function primEq(a: J, b: J): boolean {
    if (a.t === 'num' && b.t === 'num') {
        if (a.raw === b.raw) return true;
        const x = Number(a.raw);
        const y = Number(b.raw);
        return Math.abs(x) < BIG && Math.abs(y) < BIG && x === y;
    }
    if (a.t === 'str' && b.t === 'str') return a.v === b.v;
    if (a.t === 'bool' && b.t === 'bool') return a.v === b.v;
    return a.t === 'null' && b.t === 'null';
}

const ID_EXACT = /^(id|_id|key|uuid)$/i;
const ID_SUFFIX = /[a-z0-9](Id|ID|_id|Key|No)$/;

export function idVal(o: J, k: string): string | null {
    if (o.t !== 'obj') return null;
    for (const [kk, v] of o.entries) {
        if (kk === k) return v.t === 'str' ? 's' + v.v : v.t === 'num' ? 'n' + v.raw : null;
    }
    return null;
}

/** An identity key shared by every element of both arrays with unique values, e.g. id or skuId. */
export function findIdKey(a: J[], b: J[]): string | null {
    if (!a.length || !b.length) return null;
    const first = a[0];
    if (first.t !== 'obj') return null;
    if (!a.every((x) => x.t === 'obj') || !b.every((x) => x.t === 'obj')) return null;
    const cands = first.entries
        .map((e) => e[0])
        .filter((k) => ID_EXACT.test(k) || ID_SUFFIX.test(k))
        .sort((x, y) => Number(ID_EXACT.test(y)) - Number(ID_EXACT.test(x)));
    const unique = (arr: J[], k: string) => {
        const seen = new Set<string>();
        for (const x of arr) {
            const v = idVal(x, k);
            if (v === null || seen.has(v)) return false;
            seen.add(v);
        }
        return true;
    };
    for (const k of cands) if (unique(a, k) && unique(b, k)) return k;
    return null;
}

export function diffJson(a: J, b: J, idMatch: boolean): StructDiff {
    const changes: Change[] = [];
    const notes = new Set<string>();
    let capped = false;
    const push = (c: Change) => {
        if (changes.length >= MAX_CHANGES) {
            capped = true;
            return;
        }
        changes.push(c);
    };

    const walk = (x: J, y: J, pa: Step[], pb: Step[]) => {
        if (capped) return;
        if (x.t !== y.t) {
            push({ kind: 'type', pathA: pa, pathB: pb, a: x, b: y });
            return;
        }
        if (x.t === 'obj' && y.t === 'obj') {
            const ma = new Map(x.entries);
            const mb = new Map(y.entries);
            for (const [k, v] of x.entries) {
                const w = mb.get(k);
                if (w === undefined) push({ kind: 'removed', pathA: [...pa, k], pathB: null, a: v });
                else walk(v, w, [...pa, k], [...pb, k]);
            }
            for (const [k, v] of y.entries) if (!ma.has(k)) push({ kind: 'added', pathA: null, pathB: [...pb, k], b: v });
            return;
        }
        if (x.t === 'arr' && y.t === 'arr') {
            const key = idMatch ? findIdKey(x.items, y.items) : null;
            if (key) {
                const where = formatPath(pb).replace(/\[\d+\]/g, '[*]');
                notes.add(`数组 ${where} 按 ${key} 匹配元素`);
                const pos = new Map<string, number>();
                x.items.forEach((it, i) => pos.set(idVal(it, key) ?? '', i));
                const used = new Set<number>();
                let last = -1;
                let moved = false;
                y.items.forEach((it, j) => {
                    const i = pos.get(idVal(it, key) ?? '');
                    if (i === undefined) {
                        push({ kind: 'added', pathA: null, pathB: [...pb, j], b: it });
                        return;
                    }
                    if (i < last) moved = true;
                    last = i;
                    used.add(i);
                    walk(x.items[i], it, [...pa, i], [...pb, j]);
                });
                x.items.forEach((it, i) => {
                    if (!used.has(i)) push({ kind: 'removed', pathA: [...pa, i], pathB: null, a: it });
                });
                if (moved) notes.add(`数组 ${where} 的元素顺序有变化`);
                return;
            }
            const n = Math.max(x.items.length, y.items.length);
            for (let i = 0; i < n; i++) {
                if (i >= x.items.length) push({ kind: 'added', pathA: null, pathB: [...pb, i], b: y.items[i] });
                else if (i >= y.items.length) push({ kind: 'removed', pathA: [...pa, i], pathB: null, a: x.items[i] });
                else walk(x.items[i], y.items[i], [...pa, i], [...pb, i]);
            }
            return;
        }
        if (!primEq(x, y)) push({ kind: 'changed', pathA: pa, pathB: pb, a: x, b: y });
    };

    walk(a, b, [], []);
    const counts: Record<ChangeKind, number> = { added: 0, removed: 0, changed: 0, type: 0 };
    for (const c of changes) counts[c.kind]++;
    return { changes, notes: [...notes].slice(0, 6), counts, capped };
}

/* ---------------- text rendering with path -> line map ---------------- */

export const pathKey = (p: Step[]) => p.map((s) => (typeof s === 'number' ? '\u0001#' + s : '\u0001.' + s)).join('');

const cmp = (a: [string, J], b: [string, J]) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

function scalar(n: J): string {
    switch (n.t) {
        case 'str':
            return JSON.stringify(n.v);
        case 'num':
            return n.raw;
        case 'bool':
            return n.v ? 'true' : 'false';
        case 'null':
            return 'null';
        case 'obj':
            return '{}';
        case 'arr':
            return '[]';
    }
}

export interface Rendered {
    lines: string[];
    at: Map<string, number>;
}

export function render(root: J, indent: string, sortKeys: boolean): Rendered {
    const lines: string[] = [];
    const at = new Map<string, number>();
    const write = (n: J, pad: string, prefix: string, suffix: string, key: string) => {
        at.set(key, lines.length);
        if (n.t === 'obj' && n.entries.length) {
            lines.push(pad + prefix + '{');
            const es = sortKeys ? [...n.entries].sort(cmp) : n.entries;
            es.forEach(([k, v], i) =>
                write(v, pad + indent, JSON.stringify(k) + ': ', i < es.length - 1 ? ',' : '', key + '\u0001.' + k),
            );
            lines.push(pad + '}' + suffix);
        } else if (n.t === 'arr' && n.items.length) {
            lines.push(pad + prefix + '[');
            n.items.forEach((v, i) => write(v, pad + indent, '', i < n.items.length - 1 ? ',' : '', key + '\u0001#' + i));
            lines.push(pad + ']' + suffix);
        } else {
            lines.push(pad + prefix + scalar(n) + suffix);
        }
    };
    write(root, '', '', '', '');
    return { lines, at };
}

/* ---------------- line diff (Myers) ---------------- */

type Op = { t: 'eq'; a: number; b: number } | { t: 'del'; a: number } | { t: 'ins'; b: number };

function myers(A: string[], B: string[], a0: number, a1: number, b0: number, b1: number, maxD: number): Op[] {
    const N = a1 - a0;
    const M = b1 - b0;
    const out: Op[] = [];
    if (!N && !M) return out;
    if (!N) {
        for (let j = b0; j < b1; j++) out.push({ t: 'ins', b: j });
        return out;
    }
    if (!M) {
        for (let i = a0; i < a1; i++) out.push({ t: 'del', a: i });
        return out;
    }
    const max = Math.min(N + M, maxD);
    const off = max + 1;
    const V = new Int32Array(2 * max + 3);
    const trace: Int32Array[] = [];
    let found = -1;
    for (let d = 0; d <= max && found < 0; d++) {
        trace.push(V.slice(off - d, off + d + 1));
        for (let k = -d; k <= d; k += 2) {
            let x = k === -d || (k !== d && V[off + k - 1] < V[off + k + 1]) ? V[off + k + 1] : V[off + k - 1] + 1;
            let y = x - k;
            while (x < N && y < M && A[a0 + x] === B[b0 + y]) {
                x++;
                y++;
            }
            V[off + k] = x;
            if (x >= N && y >= M) {
                found = d;
                break;
            }
        }
    }
    if (found < 0) {
        for (let i = a0; i < a1; i++) out.push({ t: 'del', a: i });
        for (let j = b0; j < b1; j++) out.push({ t: 'ins', b: j });
        return out;
    }
    let x = N;
    let y = M;
    for (let d = found; d > 0; d--) {
        const tr = trace[d];
        const get = (k: number) => tr[k + d];
        const k = x - y;
        const prevK = k === -d || (k !== d && get(k - 1) < get(k + 1)) ? k + 1 : k - 1;
        const prevX = get(prevK);
        const prevY = prevX - prevK;
        while (x > prevX && y > prevY) {
            x--;
            y--;
            out.push({ t: 'eq', a: a0 + x, b: b0 + y });
        }
        if (x === prevX) {
            y--;
            out.push({ t: 'ins', b: b0 + y });
        } else {
            x--;
            out.push({ t: 'del', a: a0 + x });
        }
    }
    while (x > 0 && y > 0) {
        x--;
        y--;
        out.push({ t: 'eq', a: a0 + x, b: b0 + y });
    }
    return out.reverse();
}

function diffSeq(A: string[], B: string[]): Op[] {
    let s = 0;
    while (s < A.length && s < B.length && A[s] === B[s]) s++;
    let ea = A.length;
    let eb = B.length;
    while (ea > s && eb > s && A[ea - 1] === B[eb - 1]) {
        ea--;
        eb--;
    }
    const ops: Op[] = [];
    for (let i = 0; i < s; i++) ops.push({ t: 'eq', a: i, b: i });
    for (const op of myers(A, B, s, ea, s, eb, 1500)) ops.push(op);
    for (let k = 0; ea + k < A.length; k++) ops.push({ t: 'eq', a: ea + k, b: eb + k });
    return ops;
}

export type RowKind = 'eq' | 'del' | 'ins' | 'mod';
/** One aligned row of the side-by-side view; l / r are line indexes, -1 when that side is blank. */
export interface Row {
    k: RowKind;
    l: number;
    r: number;
}

export function buildRows(A: string[], B: string[]): Row[] {
    // a trailing comma appearing because an item was appended is not a change
    const norm = (s: string) => (s.endsWith(',') ? s.slice(0, -1) : s);
    const ops = diffSeq(A.map(norm), B.map(norm));
    const rows: Row[] = [];
    let dels: number[] = [];
    let ins: number[] = [];
    const flush = () => {
        const n = Math.min(dels.length, ins.length);
        for (let i = 0; i < n; i++) rows.push({ k: 'mod', l: dels[i], r: ins[i] });
        for (let i = n; i < dels.length; i++) rows.push({ k: 'del', l: dels[i], r: -1 });
        for (let i = n; i < ins.length; i++) rows.push({ k: 'ins', l: -1, r: ins[i] });
        dels = [];
        ins = [];
    };
    for (const op of ops) {
        if (op.t === 'eq') {
            flush();
            rows.push({ k: 'eq', l: op.a, r: op.b });
        } else if (op.t === 'del') dels.push(op.a);
        else ins.push(op.b);
    }
    flush();
    return rows;
}

const WORD = /"(?:[^"\\]|\\.)*"?|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[A-Za-z_]+|\s+|[^\s]/g;

function words(s: string): { t: string; at: number }[] {
    const out: { t: string; at: number }[] = [];
    WORD.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = WORD.exec(s))) out.push({ t: m[0], at: m.index });
    return out;
}

/**
 * The changed span of each line, snapped to whole tokens (a number, a string, a literal),
 * so "299.5" vs "274.5" highlights the whole value rather than "99" vs "74".
 * Leading indentation and a trailing comma are never part of the span.
 */
export function inlineRanges(a: string, b: string): { a: [number, number] | null; b: [number, number] | null } {
    const wa = words(a);
    const wb = words(b);
    let p = 0;
    while (p < wa.length && p < wb.length && wa[p].t === wb[p].t) p++;
    let s = 0;
    while (s < wa.length - p && s < wb.length - p && wa[wa.length - 1 - s].t === wb[wb.length - 1 - s].t) s++;
    const span = (w: { t: string; at: number }[]): [number, number] | null => {
        let i = p;
        let j = w.length - s;
        while (i < j && /^\s+$/.test(w[i].t)) i++;
        while (j > i && (/^\s+$/.test(w[j - 1].t) || (j === w.length && w[j - 1].t === ','))) j--;
        if (i >= j) return null;
        return [w[i].at, w[j - 1].at + w[j - 1].t.length];
    };
    return { a: span(wa), b: span(wb) };
}
