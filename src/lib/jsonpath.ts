/**
 * JSONPath over the lossless JSON AST (big integers and key order preserved).
 *
 * Supported: $  .key  ['key']  ["a","b"]  .*  [*]  ..key  ..*  ..[0]  [0]  [-1]  [0,2]
 * [start:end:step]  [?(@.price > 10 && @.tags)]  with == != < <= > >= =~ /re/i  ! && || ( )
 * and @.list.length. Paths may omit the leading $.
 */
import { J } from './jsonAst';

export class PathError extends Error {}

type Seg =
    | { k: 'names'; names: string[]; deep: boolean }
    | { k: 'wild'; deep: boolean }
    | { k: 'index'; idx: number[]; deep: boolean }
    | { k: 'slice'; start?: number; end?: number; step: number; deep: boolean }
    | { k: 'filter'; expr: Expr; deep: boolean };

type Expr =
    | { k: 'or' | 'and'; a: Expr; b: Expr }
    | { k: 'not'; a: Expr }
    | { k: 'cmp'; op: string; a: Operand; b: Operand }
    | { k: 'exists'; a: Operand };

type Operand =
    | { k: 'path'; root: '@' | '$'; segs: Seg[] }
    | { k: 'lit'; v: string | number | boolean | null }
    | { k: 'regex'; re: RegExp };

export type Step = string | number;
export interface Match {
    node: J;
    path: Step[];
}

const IDENT = /[A-Za-z_$\u00A0-\uFFFF][\w$\u00A0-\uFFFF-]*/y;

/* ---------------- parser ---------------- */

function parsePath(src: string): { root: '$' | '@'; segs: Seg[] } {
    let s = src.trim();
    if (!s) throw new PathError('路径为空');
    let root: '$' | '@' = '$';
    if (s[0] === '$' || s[0] === '@') {
        root = s[0] as '$' | '@';
        s = s.slice(1);
    } else if (s[0] !== '.' && s[0] !== '[') {
        s = '.' + s;
    }
    const p = new SegParser(s, 0);
    const segs = p.segments(false);
    if (p.i < s.length) throw new PathError(`第 ${p.i + 2} 个字符附近无法识别：“${s[p.i]}”`);
    return { root, segs };
}

class SegParser {
    constructor(
        public s: string,
        public i: number,
    ) {}

    err(msg: string): never {
        throw new PathError(msg);
    }

    ws() {
        while (this.s[this.i] === ' ') this.i++;
    }

    ident(): string | null {
        IDENT.lastIndex = this.i;
        const m = IDENT.exec(this.s);
        if (!m) return null;
        this.i += m[0].length;
        return m[0];
    }

    /** Parse consecutive segments. In filter mode, stop at anything that isn't a segment. */
    segments(inFilter: boolean): Seg[] {
        const segs: Seg[] = [];
        for (;;) {
            const c = this.s[this.i];
            if (c === '.') {
                let deep = false;
                if (this.s[this.i + 1] === '.') {
                    deep = true;
                    this.i += 2;
                    if (this.s[this.i] === '[') {
                        segs.push(this.bracket(deep));
                        continue;
                    }
                } else this.i++;
                if (this.s[this.i] === '*') {
                    this.i++;
                    segs.push({ k: 'wild', deep });
                    continue;
                }
                const name = this.ident();
                if (!name) this.err(deep ? '“..” 后面应为键名、* 或 [ ]' : '“.” 后面应为键名或 *');
                segs.push({ k: 'names', names: [name], deep });
            } else if (c === '[') {
                segs.push(this.bracket(false));
            } else {
                if (!inFilter && c !== undefined && c !== ' ') this.err(`无法识别的字符“${c}”，路径段应以 . 或 [ 开头`);
                return segs;
            }
        }
    }

    str(): string {
        const q = this.s[this.i];
        let out = '';
        this.i++;
        while (this.i < this.s.length) {
            const c = this.s[this.i];
            if (c === '\\') {
                out += this.s[this.i + 1] ?? '';
                this.i += 2;
                continue;
            }
            if (c === q) {
                this.i++;
                return out;
            }
            out += c;
            this.i++;
        }
        this.err('字符串缺少结束引号');
    }

    int(): number | undefined {
        const m = /-?\d+/y;
        m.lastIndex = this.i;
        const r = m.exec(this.s);
        if (!r) return undefined;
        this.i += r[0].length;
        return Number(r[0]);
    }

    bracket(deep: boolean): Seg {
        this.i++; // [
        this.ws();
        const c = this.s[this.i];
        let seg: Seg;
        if (c === '*') {
            this.i++;
            seg = { k: 'wild', deep };
        } else if (c === '?') {
            this.i++;
            this.ws();
            let paren = false;
            if (this.s[this.i] === '(') {
                paren = true;
                this.i++;
            }
            const expr = this.orExpr();
            this.ws();
            if (paren) {
                if (this.s[this.i] !== ')') this.err('过滤表达式缺少右括号 )');
                this.i++;
            }
            seg = { k: 'filter', expr, deep };
        } else if (c === "'" || c === '"') {
            const names = [this.str()];
            this.ws();
            while (this.s[this.i] === ',') {
                this.i++;
                this.ws();
                const q = this.s[this.i];
                if (q !== "'" && q !== '"') this.err('多个键名之间应都用引号');
                names.push(this.str());
                this.ws();
            }
            seg = { k: 'names', names, deep };
        } else {
            const a = this.int();
            this.ws();
            if (this.s[this.i] === ':') {
                this.i++;
                this.ws();
                const b = this.int();
                this.ws();
                let step = 1;
                if (this.s[this.i] === ':') {
                    this.i++;
                    this.ws();
                    step = this.int() ?? 1;
                    if (step === 0) this.err('切片步长不能为 0');
                }
                seg = { k: 'slice', start: a, end: b, step, deep };
            } else {
                if (a === undefined) this.err('[ ] 里应为下标、切片、*、带引号的键名或 ?() 过滤');
                const idx = [a];
                while (this.s[this.i] === ',') {
                    this.i++;
                    this.ws();
                    const n = this.int();
                    if (n === undefined) this.err('逗号后应为下标');
                    idx.push(n);
                    this.ws();
                }
                seg = { k: 'index', idx, deep };
            }
        }
        this.ws();
        if (this.s[this.i] !== ']') this.err('缺少右方括号 ]');
        this.i++;
        return seg;
    }

    /* ---- filter expressions ---- */

    orExpr(): Expr {
        let a = this.andExpr();
        for (;;) {
            this.ws();
            if (this.s.startsWith('||', this.i)) {
                this.i += 2;
                a = { k: 'or', a, b: this.andExpr() };
            } else return a;
        }
    }

    andExpr(): Expr {
        let a = this.unary();
        for (;;) {
            this.ws();
            if (this.s.startsWith('&&', this.i)) {
                this.i += 2;
                a = { k: 'and', a, b: this.unary() };
            } else return a;
        }
    }

    unary(): Expr {
        this.ws();
        if (this.s[this.i] === '!' && this.s[this.i + 1] !== '=') {
            this.i++;
            return { k: 'not', a: this.unary() };
        }
        if (this.s[this.i] === '(') {
            this.i++;
            const e = this.orExpr();
            this.ws();
            if (this.s[this.i] !== ')') this.err('缺少右括号 )');
            this.i++;
            return e;
        }
        const a = this.operand();
        this.ws();
        const m = /==|!=|<=|>=|=~|<|>/y;
        m.lastIndex = this.i;
        const op = m.exec(this.s);
        if (!op) {
            if (a.k !== 'path') this.err('字面量不能单独作为条件，请写成比较，例如 @.status == "paid"');
            return { k: 'exists', a };
        }
        this.i += op[0].length;
        this.ws();
        const b = this.operand(op[0] === '=~');
        if (op[0] === '=~' && b.k !== 'regex') this.err('=~ 右侧应为正则，例如 /^SKU-/i');
        return { k: 'cmp', op: op[0], a, b };
    }

    operand(allowRegex = false): Operand {
        this.ws();
        const c = this.s[this.i];
        if (c === '@' || c === '$') {
            this.i++;
            return { k: 'path', root: c, segs: this.segments(true) };
        }
        if (c === "'" || c === '"') return { k: 'lit', v: this.str() };
        if (allowRegex && c === '/') {
            const m = /\/((?:\\.|[^/\\])+)\/([a-z]*)/y;
            m.lastIndex = this.i;
            const r = m.exec(this.s);
            if (!r) this.err('正则格式无效');
            this.i += r[0].length;
            try {
                return { k: 'regex', re: new RegExp(r[1], r[2]) };
            } catch {
                this.err('正则无效');
            }
        }
        const num = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
        num.lastIndex = this.i;
        const n = num.exec(this.s);
        if (n) {
            this.i += n[0].length;
            return { k: 'lit', v: Number(n[0]) };
        }
        for (const [w, v] of [
            ['true', true],
            ['false', false],
            ['null', null],
        ] as const) {
            if (this.s.startsWith(w, this.i)) {
                this.i += w.length;
                return { k: 'lit', v };
            }
        }
        if (c === undefined) this.err('过滤表达式不完整');
        this.err(`过滤表达式中无法识别“${c}”，字符串要加引号，字段要以 @ 开头`);
    }
}

/* ---------------- evaluation ---------------- */

const LIMIT = 10000;

function children(m: Match): Match[] {
    const n = m.node;
    if (n.t === 'obj') return n.entries.map(([k, v]) => ({ node: v, path: [...m.path, k] }));
    if (n.t === 'arr') return n.items.map((v, i) => ({ node: v, path: [...m.path, i] }));
    return [];
}

function descendants(m: Match, out: Match[]) {
    out.push(m);
    if (out.length > LIMIT * 4) throw new PathError('匹配的节点过多，请缩小查询范围');
    for (const c of children(m)) descendants(c, out);
}

function applySeg(seg: Seg, list: Match[], root: J): Match[] {
    let base = list;
    if (seg.deep) {
        base = [];
        for (const m of list) descendants(m, base);
    }
    const out: Match[] = [];
    for (const m of base) {
        const n = m.node;
        switch (seg.k) {
            case 'wild':
                out.push(...children(m));
                break;
            case 'names':
                if (n.t === 'obj') {
                    for (const name of seg.names) {
                        for (const [k, v] of n.entries) if (k === name) out.push({ node: v, path: [...m.path, k] });
                    }
                }
                break;
            case 'index':
                if (n.t === 'arr') {
                    for (const i of seg.idx) {
                        const j = i < 0 ? n.items.length + i : i;
                        if (j >= 0 && j < n.items.length) out.push({ node: n.items[j], path: [...m.path, j] });
                    }
                }
                break;
            case 'slice':
                if (n.t === 'arr') {
                    const len = n.items.length;
                    const norm = (x: number | undefined, d: number) =>
                        x === undefined ? d : x < 0 ? Math.max(0, len + x) : Math.min(len, x);
                    if (seg.step > 0) {
                        for (let i = norm(seg.start, 0); i < norm(seg.end, len); i += seg.step)
                            out.push({ node: n.items[i], path: [...m.path, i] });
                    } else {
                        const st = seg.start === undefined ? len - 1 : Math.min(len - 1, norm(seg.start, 0));
                        const en = seg.end === undefined ? -1 : norm(seg.end, 0);
                        for (let i = st; i > en; i += seg.step) out.push({ node: n.items[i], path: [...m.path, i] });
                    }
                }
                break;
            case 'filter':
                for (const c of children(m)) if (test(seg.expr, c.node, root)) out.push(c);
                break;
        }
        if (out.length > LIMIT) throw new PathError(`匹配超过 ${LIMIT} 个，请缩小查询范围`);
    }
    return out;
}

function run(segs: Seg[], start: Match[], root: J): Match[] {
    let cur = start;
    for (const s of segs) cur = applySeg(s, cur, root);
    return cur;
}

type Val = string | number | boolean | null | { container: J } | undefined;

function toVal(n: J): Val {
    switch (n.t) {
        case 'str':
            return n.v;
        case 'num':
            return Number(n.raw);
        case 'bool':
            return n.v;
        case 'null':
            return null;
        default:
            return { container: n };
    }
}

function resolve(o: Operand, cur: J, root: J): Val {
    if (o.k === 'lit') return o.v;
    if (o.k === 'regex') return undefined;
    const segs = o.segs;
    const last = segs[segs.length - 1];
    const start: Match[] = [{ node: o.root === '@' ? cur : root, path: [] }];
    const r = run(segs, start, root);
    if (r.length) return toVal(r[0].node);
    // @.list.length / @.name.length
    if (last && last.k === 'names' && last.names.length === 1 && last.names[0] === 'length' && !last.deep) {
        const p = run(segs.slice(0, -1), start, root);
        const n = p[0]?.node;
        if (n?.t === 'arr') return n.items.length;
        if (n?.t === 'str') return n.v.length;
        if (n?.t === 'obj') return n.entries.length;
    }
    return undefined;
}

function test(e: Expr, cur: J, root: J): boolean {
    switch (e.k) {
        case 'or':
            return test(e.a, cur, root) || test(e.b, cur, root);
        case 'and':
            return test(e.a, cur, root) && test(e.b, cur, root);
        case 'not':
            return !test(e.a, cur, root);
        case 'exists':
            return resolve(e.a, cur, root) !== undefined;
        case 'cmp': {
            const a = resolve(e.a, cur, root);
            if (e.op === '=~') {
                return typeof a === 'string' && e.b.k === 'regex' && e.b.re.test(a);
            }
            const b = resolve(e.b, cur, root);
            if (a === undefined || b === undefined) return e.op === '!=' && a !== b;
            if (typeof a === 'object' || typeof b === 'object') {
                if (e.op === '==') return false;
                if (e.op === '!=') return true;
                return false;
            }
            switch (e.op) {
                case '==':
                    return a === b;
                case '!=':
                    return a !== b;
            }
            if (!((typeof a === 'number' && typeof b === 'number') || (typeof a === 'string' && typeof b === 'string')))
                return false;
            if (e.op === '<') return a < b;
            if (e.op === '<=') return a <= b;
            if (e.op === '>') return a > b;
            return a >= b;
        }
    }
}

export function query(root: J, path: string): Match[] {
    const { segs } = parsePath(path);
    return run(segs, [{ node: root, path: [] }], root);
}

/* ---------------- helpers ---------------- */

const SIMPLE = /^[A-Za-z_$][\w$]*$/;

export function formatPath(p: Step[]): string {
    let s = '$';
    for (const x of p) {
        if (typeof x === 'number') s += `[${x}]`;
        else if (SIMPLE.test(x)) s += '.' + x;
        else s += `['${x.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}']`;
    }
    return s;
}

/** Distinct paths in the document with array indices collapsed to [*], for autocomplete. */
export function suggestPaths(root: J, max = 300): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    const visit = (n: J, p: string, depth: number) => {
        if (out.length >= max || depth > 12) return;
        if (n.t === 'obj') {
            for (const [k, v] of n.entries) {
                const next = p + (SIMPLE.test(k) ? '.' + k : `['${k.replace(/'/g, "\\'")}']`);
                if (!seen.has(next)) {
                    seen.add(next);
                    out.push(next);
                }
                visit(v, next, depth + 1);
            }
        } else if (n.t === 'arr' && n.items.length) {
            const next = p + '[*]';
            if (!seen.has(next)) {
                seen.add(next);
                out.push(next);
            }
            for (const it of n.items.slice(0, 50)) visit(it, next, depth + 1);
        }
    };
    visit(root, '$', 0);
    return out;
}

/** A few useful starter queries derived from the document's shape. */
export function starterQueries(root: J): string[] {
    const out: string[] = [];
    const firstArray = (n: J, p: string, depth: number): { node: J; path: string } | null => {
        if (depth > 6) return null;
        if (n.t === 'arr' && n.items.some((x) => x.t === 'obj')) return { node: n, path: p };
        if (n.t === 'obj') {
            for (const [k, v] of n.entries) {
                const r = firstArray(v, p + (SIMPLE.test(k) ? '.' + k : `['${k}']`), depth + 1);
                if (r) return r;
            }
        }
        return null;
    };
    const arr = firstArray(root, '$', 0);
    if (arr && arr.node.t === 'arr') {
        const obj = arr.node.items.find((x) => x.t === 'obj');
        if (obj && obj.t === 'obj') {
            const str = obj.entries.find(([k, v]) => v.t === 'str' && SIMPLE.test(k));
            const nums = obj.entries.filter(([k, v]) => v.t === 'num' && SIMPLE.test(k));
            const num = nums.find(([k]) => !/id$/i.test(k)) ?? nums[0];
            if (str) out.push(`${arr.path}[*].${str[0]}`);
            if (num) {
                const vals = arr.node.items
                    .map((x) => (x.t === 'obj' ? x.entries.find(([k]) => k === num[0])?.[1] : undefined))
                    .filter((v): v is Extract<J, { t: 'num' }> => v?.t === 'num')
                    .map((v) => Number(v.raw));
                const pivot = vals.length ? vals.sort((a, b) => a - b)[Math.floor(vals.length / 2)] : 0;
                out.push(`${arr.path}[?(@.${num[0]} >= ${pivot})]`);
            }
            out.push(`${arr.path}[-1]`);
        }
    }
    if (root.t === 'obj' || root.t === 'arr') {
        const keys = new Map<string, number>();
        const count = (n: J, d: number) => {
            if (d > 10) return;
            if (n.t === 'obj')
                n.entries.forEach(([k, v]) => {
                    keys.set(k, (keys.get(k) ?? 0) + 1);
                    count(v, d + 1);
                });
            else if (n.t === 'arr') n.items.forEach((v) => count(v, d + 1));
        };
        count(root, 0);
        const rep = [...keys.entries()].filter(([k, c]) => c > 1 && SIMPLE.test(k)).sort((a, b) => b[1] - a[1])[0];
        if (rep) out.push(`$..${rep[0]}`);
    }
    return out.slice(0, 4);
}
