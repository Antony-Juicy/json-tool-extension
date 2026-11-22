/**
 * RFC 6902 JSON Patch: generate (old -> new), apply, and verify, on the lossless AST.
 * Ops are produced for sequential application, so array indices account for earlier ops.
 */
import { J, stringify } from './jsonAst';
import { findIdKey, idVal } from './diff';

export type PatchOpName = 'add' | 'remove' | 'replace' | 'move';

export interface PatchOp {
    op: PatchOpName;
    path: string;
    from?: string;
    value?: J;
    /** the value being removed or replaced, for display only */
    old?: J;
}

const esc = (s: string | number) => String(s).replace(/~/g, '~0').replace(/\//g, '~1');
const ptr = (base: string, k: string | number) => `${base}/${esc(k)}`;

/** Key-order-insensitive canonical form, for equality. */
export function canon(n: J): string {
    switch (n.t) {
        case 'obj':
            return (
                '{' +
                [...n.entries]
                    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
                    .map(([k, v]) => JSON.stringify(k) + ':' + canon(v))
                    .join(',') +
                '}'
            );
        case 'arr':
            return '[' + n.items.map(canon).join(',') + ']';
        case 'num': {
            const x = Number(n.raw);
            return Math.abs(x) < 2 ** 53 ? String(x) : n.raw;
        }
        default:
            return stringify(n, '', 'none');
    }
}

export const equalJ = (a: J, b: J) => canon(a) === canon(b);

function lcs(a: string[], b: string[]): [number, number][] {
    const n = a.length;
    const m = b.length;
    if (n * m > 4_000_000) return [];
    const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
        for (let j = m - 1; j >= 0; j--)
            dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out: [number, number][] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (a[i] === b[j]) {
            out.push([i, j]);
            i++;
            j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
        else j++;
    }
    return out;
}

export function generatePatch(a: J, b: J, idMatch: boolean): PatchOp[] {
    const ops: PatchOp[] = [];

    const walk = (x: J, y: J, path: string) => {
        if (x.t !== y.t || (x.t !== 'obj' && x.t !== 'arr')) {
            if (!equalJ(x, y)) ops.push({ op: 'replace', path, value: y, old: x });
            return;
        }
        if (x.t === 'obj' && y.t === 'obj') {
            const mb = new Map(y.entries);
            const ma = new Map(x.entries);
            for (const [k, v] of x.entries) if (!mb.has(k)) ops.push({ op: 'remove', path: ptr(path, k), old: v });
            for (const [k, v] of y.entries) {
                const w = ma.get(k);
                if (w === undefined) ops.push({ op: 'add', path: ptr(path, k), value: v });
                else walk(w, v, ptr(path, k));
            }
            return;
        }
        if (x.t === 'arr' && y.t === 'arr') {
            const key = idMatch ? findIdKey(x.items, y.items) : null;
            if (key) arrayById(x.items, y.items, key, path);
            else arrayByContent(x.items, y.items, path);
        }
    };

    /** Elements identified by a key: remove the missing, then move/recurse/add in target order. */
    const arrayById = (xs: J[], ys: J[], key: string, path: string) => {
        const want = new Set(ys.map((y) => idVal(y, key) ?? ''));
        const cur = xs.map((x) => idVal(x, key) ?? '');
        const byId = new Map(xs.map((x) => [idVal(x, key) ?? '', x] as const));
        for (let i = cur.length - 1; i >= 0; i--) {
            if (!want.has(cur[i])) {
                ops.push({ op: 'remove', path: ptr(path, i), old: xs[i] });
                cur.splice(i, 1);
            }
        }
        ys.forEach((y, j) => {
            const id = idVal(y, key) ?? '';
            const k = cur.indexOf(id, j);
            if (cur[j] === id) {
                const src = byId.get(id);
                if (src) walk(src, y, ptr(path, j));
            } else if (k > j) {
                ops.push({ op: 'move', from: ptr(path, k), path: ptr(path, j) });
                cur.splice(k, 1);
                cur.splice(j, 0, id);
                const src = byId.get(id);
                if (src) walk(src, y, ptr(path, j));
            } else {
                ops.push({ op: 'add', path: ptr(path, j), value: y });
                cur.splice(j, 0, id);
            }
        });
    };

    /** Align equal elements (LCS); between anchors, pair positions and recurse, remove or add the rest. */
    const arrayByContent = (xs: J[], ys: J[], path: string) => {
        const ca = xs.map(canon);
        const cb = ys.map(canon);
        const anchors = lcs(ca, cb);
        anchors.push([xs.length, ys.length]);
        let i = 0;
        let j = 0;
        let idx = 0; // index in the array being transformed
        for (const [ai, bj] of anchors) {
            const dels = ai - i;
            const ins = bj - j;
            const pair = Math.min(dels, ins);
            for (let k = 0; k < pair; k++) {
                walk(xs[i + k], ys[j + k], ptr(path, idx));
                idx++;
            }
            for (let k = pair; k < dels; k++) ops.push({ op: 'remove', path: ptr(path, idx), old: xs[i + k] });
            for (let k = pair; k < ins; k++) {
                ops.push({ op: 'add', path: ptr(path, idx), value: ys[j + k] });
                idx++;
            }
            if (ai < xs.length) idx++; // the anchor itself is unchanged
            i = ai + 1;
            j = bj + 1;
        }
    };

    walk(a, b, '');
    return ops;
}

/* ---------------- apply ---------------- */

function clone(n: J): J {
    switch (n.t) {
        case 'obj':
            return { t: 'obj', entries: n.entries.map(([k, v]) => [k, clone(v)]) };
        case 'arr':
            return { t: 'arr', items: n.items.map(clone) };
        default:
            return n;
    }
}

const unesc = (s: string) => s.replace(/~1/g, '/').replace(/~0/g, '~');

function parsePtr(p: string): string[] {
    if (p === '') return [];
    if (!p.startsWith('/')) throw new Error(`路径必须以 / 开头：${p}`);
    return p.slice(1).split('/').map(unesc);
}

function child(n: J, k: string): J | undefined {
    if (n.t === 'obj') return n.entries.find((e) => e[0] === k)?.[1];
    if (n.t === 'arr' && /^\d+$/.test(k)) return n.items[Number(k)];
    return undefined;
}

export type ApplyResult = { ok: true; doc: J } | { ok: false; index: number; message: string };

export function applyPatch(doc: J, ops: PatchOp[]): ApplyResult {
    let root = clone(doc);
    const resolveParent = (segs: string[]) => {
        let n: J | undefined = root;
        for (const s of segs.slice(0, -1)) {
            n = n ? child(n, s) : undefined;
            if (!n) throw new Error('路径不存在');
        }
        return n;
    };
    const remove = (path: string): J => {
        const segs = parsePtr(path);
        if (!segs.length) throw new Error('不能删除根节点');
        const parent = resolveParent(segs);
        const last = segs[segs.length - 1];
        if (parent?.t === 'obj') {
            const i = parent.entries.findIndex((e) => e[0] === last);
            if (i < 0) throw new Error('要删除的键不存在');
            return parent.entries.splice(i, 1)[0][1];
        }
        if (parent?.t === 'arr') {
            const i = Number(last);
            if (!/^\d+$/.test(last) || i >= parent.items.length) throw new Error('数组下标越界');
            return parent.items.splice(i, 1)[0];
        }
        throw new Error('父节点不是对象或数组');
    };
    const add = (path: string, v: J) => {
        const segs = parsePtr(path);
        if (!segs.length) {
            root = v;
            return;
        }
        const parent = resolveParent(segs);
        const last = segs[segs.length - 1];
        if (parent?.t === 'obj') {
            const i = parent.entries.findIndex((e) => e[0] === last);
            if (i >= 0) parent.entries[i] = [last, v];
            else parent.entries.push([last, v]);
            return;
        }
        if (parent?.t === 'arr') {
            const i = last === '-' ? parent.items.length : Number(last);
            if ((last !== '-' && !/^\d+$/.test(last)) || i > parent.items.length) throw new Error('数组下标越界');
            parent.items.splice(i, 0, v);
            return;
        }
        throw new Error('父节点不是对象或数组');
    };
    const replace = (path: string, v: J) => {
        const segs = parsePtr(path);
        if (!segs.length) {
            root = v;
            return;
        }
        const parent = resolveParent(segs);
        const last = segs[segs.length - 1];
        if (parent?.t === 'obj') {
            const i = parent.entries.findIndex((e) => e[0] === last);
            if (i < 0) throw new Error('要替换的键不存在');
            parent.entries[i] = [last, v];
            return;
        }
        if (parent?.t === 'arr') {
            const i = Number(last);
            if (!/^\d+$/.test(last) || i >= parent.items.length) throw new Error('数组下标越界');
            parent.items[i] = v;
            return;
        }
        throw new Error('父节点不是对象或数组');
    };
    for (let k = 0; k < ops.length; k++) {
        const o = ops[k];
        try {
            if (o.op === 'add') add(o.path, clone(o.value ?? { t: 'null' }));
            else if (o.op === 'remove') remove(o.path);
            else if (o.op === 'replace') replace(o.path, clone(o.value ?? { t: 'null' }));
            else if (o.op === 'move') add(o.path, remove(o.from ?? ''));
        } catch (e) {
            return { ok: false, index: k, message: e instanceof Error ? e.message : String(e) };
        }
    }
    return { ok: true, doc: root };
}

export function patchToJ(ops: PatchOp[]): J {
    return {
        t: 'arr',
        items: ops.map((o) => {
            const entries: [string, J][] = [['op', { t: 'str', v: o.op }]];
            if (o.from !== undefined) entries.push(['from', { t: 'str', v: o.from }]);
            entries.push(['path', { t: 'str', v: o.path }]);
            if (o.op === 'add' || o.op === 'replace') entries.push(['value', o.value ?? { t: 'null' }]);
            return { t: 'obj', entries };
        }),
    };
}

/** Deselected ops inside an array shift the indices that later selected ops in the same array rely on. */
export function selectionRisk(ops: PatchOp[], selected: boolean[]): boolean {
    const arrayParent = (p: string) => {
        const i = p.lastIndexOf('/');
        const last = p.slice(i + 1);
        return /^\d+$/.test(last) || last === '-' ? p.slice(0, i) : null;
    };
    for (let k = 0; k < ops.length; k++) {
        if (selected[k]) continue;
        const o = ops[k];
        if (o.op === 'replace') continue;
        const parents = [arrayParent(o.path), o.from ? arrayParent(o.from) : null].filter((x): x is string => x !== null);
        if (!parents.length) continue;
        for (let m = k + 1; m < ops.length; m++) {
            if (!selected[m]) continue;
            const q = ops[m];
            if (parents.some((p) => q.path.startsWith(p + '/') || (q.from ?? '').startsWith(p + '/'))) return true;
        }
    }
    return false;
}
