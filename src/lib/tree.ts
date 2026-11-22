import { J, SortOrder } from './jsonAst';
import { Step } from './jsonpath';

/** One node of the document, flattened in pre-order. A subtree is the index range [i, end). */
export interface FlatNode {
    node: J;
    key: string | number | null;
    depth: number;
    parent: number;
    end: number;
    count: number;
}

export interface TreeIndex {
    nodes: FlatNode[];
    byNode: Map<J, number>;
    /** stable identity per node (path based), used to keep expansion across edits */
    ids: string[];
}

const cmp = (a: [string, J], b: [string, J]) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

export function buildTree(root: J, order: SortOrder): TreeIndex {
    const nodes: FlatNode[] = [];
    const byNode = new Map<J, number>();
    const ids: string[] = [];
    const visit = (n: J, key: string | number | null, depth: number, parent: number) => {
        const idx = nodes.length;
        const f: FlatNode = {
            node: n,
            key,
            depth,
            parent,
            end: 0,
            count: n.t === 'obj' ? n.entries.length : n.t === 'arr' ? n.items.length : 0,
        };
        nodes.push(f);
        byNode.set(n, idx);
        ids.push(parent < 0 ? '' : ids[parent] + (typeof key === 'number' ? '\u0001#' + key : '\u0001.' + key));
        if (n.t === 'obj') {
            let es = n.entries;
            if (order !== 'none') {
                es = [...es].sort(cmp);
                if (order === 'desc') es.reverse();
            }
            for (const [k, v] of es) visit(v, k, depth + 1, idx);
        } else if (n.t === 'arr') {
            n.items.forEach((v, i) => visit(v, i, depth + 1, idx));
        }
        f.end = nodes.length;
    };
    visit(root, null, 0, -1);
    return { nodes, byNode, ids };
}

export function pathOf(t: TreeIndex, i: number): Step[] {
    const out: Step[] = [];
    let c = i;
    while (c > 0) {
        const n = t.nodes[c];
        if (n.key !== null) out.push(n.key);
        c = n.parent;
    }
    return out.reverse();
}

const SIMPLE = /^[A-Za-z_$][\w$]*$/;

/** JavaScript accessor path, e.g. data.list[0].id */
export function jsPath(p: Step[]): string {
    let s = '';
    for (const x of p) {
        if (typeof x === 'number') s += `[${x}]`;
        else if (SIMPLE.test(x)) s += (s ? '.' : '') + x;
        else s += `[${JSON.stringify(x)}]`;
    }
    return s;
}

export function primText(n: J): string | null {
    switch (n.t) {
        case 'str':
            return n.v;
        case 'num':
            return n.raw;
        case 'bool':
            return n.v ? 'true' : 'false';
        case 'null':
            return 'null';
        default:
            return null;
    }
}

export function upToDepth(t: TreeIndex, depth: number): Set<number> {
    const s = new Set<number>();
    t.nodes.forEach((f, i) => {
        if (f.count && f.depth < depth) s.add(i);
    });
    return s;
}

export function defaultExpanded(t: TreeIndex): Set<number> {
    return upToDepth(t, t.nodes.length <= 400 ? Infinity : 2);
}

export interface TreeState {
    t: TreeIndex;
    set: Set<number>;
    sel: number;
}

/** Carry expansion and selection over to a rebuilt tree by node identity. */
export function translate(old: TreeState, t: TreeIndex): TreeState {
    const map = new Map<string, number>();
    t.ids.forEach((id, i) => {
        if (!map.has(id)) map.set(id, i);
    });
    const set = new Set<number>();
    for (const i of old.set) {
        const id = old.t.ids[i];
        const j = id === undefined ? undefined : map.get(id);
        if (j !== undefined && t.nodes[j].count) set.add(j);
    }
    const selId = old.t.ids[old.sel];
    const sel = selId === undefined ? 0 : (map.get(selId) ?? 0);
    return { t, set: set.size > 1 ? set : defaultExpanded(t), sel };
}

export interface TreeFilter {
    matched: Set<number>;
    keep: Set<number>;
    autoOpen: Set<number>;
    first: number;
}

export function buildFilter(t: TreeIndex, kw: string, jp: { node: J }[] | null): TreeFilter | null {
    if (!kw && !jp) return null;
    let jpSet: Set<number> | null = null;
    if (jp) {
        jpSet = new Set();
        for (const m of jp) {
            const i = t.byNode.get(m.node);
            if (i !== undefined) jpSet.add(i);
        }
    }
    let matched: Set<number>;
    if (kw) {
        let inside: Uint8Array | null = null;
        if (jpSet) {
            inside = new Uint8Array(t.nodes.length);
            for (const i of jpSet) inside.fill(1, i, t.nodes[i].end);
        }
        const q = kw.toLowerCase();
        matched = new Set();
        t.nodes.forEach((f, i) => {
            if (inside && !inside[i]) return;
            if (typeof f.key === 'string' && f.key.toLowerCase().includes(q)) {
                matched.add(i);
                return;
            }
            const p = primText(f.node);
            if (p !== null && p.toLowerCase().includes(q)) matched.add(i);
        });
    } else {
        matched = jpSet ?? new Set();
    }
    const keep = new Set<number>();
    let first = -1;
    for (const i of matched) {
        if (first < 0 || i < first) first = i;
        let p = t.nodes[i].parent;
        while (p >= 0 && !keep.has(p)) {
            keep.add(p);
            p = t.nodes[p].parent;
        }
    }
    const autoOpen = new Set(keep);
    if (matched.size <= 20) for (const i of matched) if (t.nodes[i].count) autoOpen.add(i);
    return { matched, keep, autoOpen, first };
}

/** Indices of the rows to draw, in order. With a filter, only matches, their ancestors and their subtrees. */
export function visibleRows(t: TreeIndex, expanded: Set<number>, filter: TreeFilter | null): number[] {
    const out: number[] = [];
    const n = t.nodes.length;
    let i = 0;
    let inMatchUntil = -1;
    while (i < n) {
        const f = t.nodes[i];
        if (filter) {
            const inside = i < inMatchUntil;
            const isMatch = filter.matched.has(i);
            if (!inside && !isMatch && !filter.keep.has(i)) {
                i = f.end;
                continue;
            }
            if (isMatch && f.end > inMatchUntil) inMatchUntil = f.end;
        }
        out.push(i);
        if (f.count > 0 && !expanded.has(i)) {
            i = f.end;
            continue;
        }
        i++;
    }
    return out;
}
