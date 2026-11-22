export type StrFormat = 'email' | 'url' | 'uuid' | 'datetime' | 'date';

export interface StringNode {
    kind: 'string';
    format?: StrFormat;
    samples: string[];
}
export interface NumberNode {
    kind: 'number';
    integer: boolean;
    min: number;
    max: number;
}
export interface Field {
    key: string;
    type: TNode;
    optional: boolean;
}
export interface ObjectNode {
    kind: 'object';
    fields: Field[];
}
export interface ArrayNode {
    kind: 'array';
    item: TNode;
}
export interface UnionNode {
    kind: 'union';
    types: TNode[];
}
export type TNode =
    | StringNode
    | NumberNode
    | { kind: 'boolean' }
    | { kind: 'null' }
    | { kind: 'unknown' }
    | ArrayNode
    | ObjectNode
    | UnionNode;

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_URL = /^https?:\/\/\S+$/i;
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RE_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SAMPLES = 8;

function detectFormat(s: string): StrFormat | undefined {
    if (RE_UUID.test(s)) return 'uuid';
    if (RE_DATETIME.test(s)) return 'datetime';
    if (RE_DATE.test(s)) return 'date';
    if (RE_EMAIL.test(s)) return 'email';
    if (RE_URL.test(s)) return 'url';
    return undefined;
}

export function infer(v: unknown): TNode {
    if (v === null) return { kind: 'null' };
    if (Array.isArray(v)) {
        return { kind: 'array', item: v.length ? mergeAll(v.map(infer)) : { kind: 'unknown' } };
    }
    switch (typeof v) {
        case 'string':
            return { kind: 'string', format: detectFormat(v), samples: [v] };
        case 'number':
            return { kind: 'number', integer: Number.isInteger(v), min: v, max: v };
        case 'boolean':
            return { kind: 'boolean' };
        case 'object':
            return {
                kind: 'object',
                fields: Object.entries(v as Record<string, unknown>).map(([key, val]) => ({
                    key,
                    type: infer(val),
                    optional: false,
                })),
            };
        default:
            return { kind: 'unknown' };
    }
}

function flatten(n: TNode): TNode[] {
    return n.kind === 'union' ? n.types.flatMap(flatten) : [n];
}

export function mergeAll(nodes: TNode[]): TNode {
    const flat = nodes.flatMap(flatten).filter((n) => n.kind !== 'unknown');
    if (!flat.length) return { kind: 'unknown' };
    const groups = new Map<string, TNode[]>();
    for (const n of flat) {
        const list = groups.get(n.kind);
        if (list) list.push(n);
        else groups.set(n.kind, [n]);
    }
    const out: TNode[] = [];
    for (const [kind, list] of groups) {
        switch (kind) {
            case 'string': {
                const strs = list as StringNode[];
                const f = strs[0].format;
                const samples: string[] = [];
                for (const s of strs) {
                    for (const x of s.samples) {
                        if (samples.length >= MAX_SAMPLES) break;
                        if (!samples.includes(x)) samples.push(x);
                    }
                }
                out.push({
                    kind: 'string',
                    format: strs.every((s) => s.format === f) ? f : undefined,
                    samples,
                });
                break;
            }
            case 'number': {
                const nums = list as NumberNode[];
                out.push({
                    kind: 'number',
                    integer: nums.every((n) => n.integer),
                    min: Math.min(...nums.map((n) => n.min)),
                    max: Math.max(...nums.map((n) => n.max)),
                });
                break;
            }
            case 'array':
                out.push({ kind: 'array', item: mergeAll((list as ArrayNode[]).map((a) => a.item)) });
                break;
            case 'object':
                out.push(mergeObjects(list as ObjectNode[]));
                break;
            default:
                out.push(list[0]);
        }
    }
    return out.length === 1 ? out[0] : { kind: 'union', types: out };
}

function mergeObjects(list: ObjectNode[]): ObjectNode {
    if (list.length === 1) return list[0];
    const order: string[] = [];
    const byKey = new Map<string, Field[]>();
    for (const o of list) {
        for (const f of o.fields) {
            const arr = byKey.get(f.key);
            if (arr) arr.push(f);
            else {
                byKey.set(f.key, [f]);
                order.push(f.key);
            }
        }
    }
    return {
        kind: 'object',
        fields: order.map((key) => {
            const present = byKey.get(key) ?? [];
            return {
                key,
                type: mergeAll(present.map((f) => f.type)),
                optional: present.length < list.length || present.some((f) => f.optional),
            };
        }),
    };
}

/* ---------- naming ---------- */

export interface Decl {
    name: string;
    node: ObjectNode;
    /** JSON path of the first place this shape appears; '' for the root object */
    path: string;
}
export interface Named {
    root: TNode;
    rootName: string;
    decls: Decl[];
    names: Map<ObjectNode, string>;
}

export function toPascal(hint: string): string {
    const words = hint
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1));
    let s = words.join('');
    if (!s) return '';
    if (/^\d/.test(s)) s = 'T' + s;
    return s;
}

function singular(w: string): string {
    if (/list$/i.test(w) && w.length > 4) return w.slice(0, -4);
    if (/ies$/i.test(w) && w.length > 3) return w.slice(0, -3) + 'y';
    if (/(ss|x|ch|sh)es$/i.test(w)) return w.slice(0, -2);
    if (/[^s]s$/i.test(w)) return w.slice(0, -1);
    return w + 'Item';
}

function signature(n: TNode): string {
    switch (n.kind) {
        case 'object':
            return (
                '{' +
                n.fields
                    .map((f) => `${JSON.stringify(f.key)}${f.optional ? '?' : ''}:${signature(f.type)}`)
                    .join(',') +
                '}'
            );
        case 'array':
            return signature(n.item) + '[]';
        case 'union':
            return n.types.map(signature).join('|');
        case 'number':
            return n.integer ? 'int' : 'number';
        case 'string':
            return 'string' + (n.format ? ':' + n.format : '');
        default:
            return n.kind;
    }
}

export function nameTypes(root: TNode, rootName: string): Named {
    const names = new Map<ObjectNode, string>();
    const sigToName = new Map<string, string>();
    const used = new Set<string>();
    const decls: Decl[] = [];
    const unique = (base: string) => {
        let n = base || 'Item';
        let i = 2;
        while (used.has(n)) n = `${base || 'Item'}${i++}`;
        used.add(n);
        return n;
    };
    const join = (p: string, k: string) => {
        const seg = isIdent(k) ? k : `[${JSON.stringify(k)}]`;
        if (!p) return seg;
        return seg.startsWith('[') ? p + seg : `${p}.${seg}`;
    };
    const walk = (n: TNode, hint: string, path: string, exact?: string) => {
        if (n.kind === 'object') {
            if (!n.fields.length) return;
            const sig = signature(n);
            const existing = sigToName.get(sig);
            if (existing) {
                names.set(n, existing);
                return;
            }
            const name = exact ?? unique(toPascal(hint));
            if (exact) used.add(exact);
            sigToName.set(sig, name);
            names.set(n, name);
            decls.push({ name, node: n, path });
            n.fields.forEach((f) => walk(f.type, f.key, join(path, f.key)));
        } else if (n.kind === 'array') {
            walk(n.item, singular(hint), path + '[]');
        } else if (n.kind === 'union') {
            n.types.forEach((t) => walk(t, hint, path, exact));
        }
    };
    if (root.kind === 'object') {
        walk(root, rootName, '', rootName);
    } else {
        used.add(rootName);
        if (root.kind === 'array') walk(root.item, rootName + 'Item', '[]');
        else walk(root, rootName + 'Item', '');
    }
    return { root, rootName, decls, names };
}

/* ---------- helpers shared by emitters ---------- */

export const isIdent = (k: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k);
export const propKey = (k: string) => (isIdent(k) ? k : JSON.stringify(k));

export const hasNull = (t: TNode) =>
    t.kind === 'null' || (t.kind === 'union' && t.types.some((x) => x.kind === 'null'));

export function stripNull(t: TNode): TNode {
    if (t.kind !== 'union') return t;
    const rest = t.types.filter((x) => x.kind !== 'null');
    return rest.length === 1 ? rest[0] : { kind: 'union', types: rest };
}

export interface Stats {
    types: number;
    fields: number;
    optional: number;
    nullable: number;
}

export function computeStats(named: Named): Stats {
    let fields = 0;
    let optional = 0;
    let nullable = 0;
    for (const d of named.decls) {
        for (const f of d.node.fields) {
            fields++;
            if (f.optional) optional++;
            if (hasNull(f.type)) nullable++;
        }
    }
    return { types: named.decls.length, fields, optional, nullable };
}
