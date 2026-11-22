/**
 * Tolerant JSON repair. Rewrites broken JSON-ish text into valid JSON and records every fix with
 * its position in the ORIGINAL text, so the UI can explain and locate each change.
 *
 * Handles: missing / extra / mismatched brackets, missing / extra / trailing commas, missing colons,
 * single / back / Chinese quotes, unquoted keys and values, unterminated strings, unescaped inner
 * quotes and raw newlines, comments, Python and JS literals (True, None, undefined, NaN), loose
 * numbers (+1, .5, 0x1F), Chinese punctuation, Markdown fences, copied line numbers, log / SSE
 * prefixes, key-value fragments without outer braces, and several top-level values.
 */
import { parse } from './jsonAst';

export interface Fix {
    /** offset in the original input, or -1 when the fix concerns the input as a whole */
    pos: number;
    detail: string;
    sample?: string;
}

export type RepairResult = { ok: true; text: string; fixes: Fix[] } | { ok: false };

const MAX_FIXES = 2000;

/* ---------------- position mapping through preprocessing ---------------- */

type MapFn = (p: number) => number;
interface Piece {
    start: number;
    len: number;
    orig: number;
    ins: boolean;
}

class Builder {
    text = '';
    pieces: Piece[] = [];
    keep(src: string, a: number, b: number) {
        if (b <= a) return;
        this.pieces.push({ start: this.text.length, len: b - a, orig: a, ins: false });
        this.text += src.slice(a, b);
    }
    insert(s: string, at: number) {
        this.pieces.push({ start: this.text.length, len: s.length, orig: at, ins: true });
        this.text += s;
    }
    mapper(prev: MapFn): MapFn {
        const ps = this.pieces;
        return (p: number) => {
            if (p < 0) return -1;
            let lo = 0;
            let hi = ps.length - 1;
            let k = -1;
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                if (ps[mid].start <= p) {
                    k = mid;
                    lo = mid + 1;
                } else hi = mid - 1;
            }
            if (k < 0) return prev(0);
            const pc = ps[k];
            return prev(pc.ins ? pc.orig : pc.orig + Math.min(p - pc.start, pc.len));
        };
    }
}

const isWs = (c: number) => c === 32 || c === 9 || c === 10 || c === 13 || c === 0xa0 || c === 0xfeff || c === 0x3000;

function lineSpans(s: string): [number, number][] {
    const out: [number, number][] = [];
    let st = 0;
    for (let i = 0; i <= s.length; i++) {
        if (i === s.length || s.charCodeAt(i) === 10) {
            out.push([st, i]);
            st = i + 1;
        }
    }
    return out;
}

const consecutive = (v: number[]) => v.every((x, i) => i === 0 || x === v[i - 1] + 1);

/** Markdown fences and line numbers copied together with the code. */
function stripDecor(s: string, fixes: Fix[]): Builder | null {
    const lines = lineSpans(s);
    const txt = (k: number) => s.slice(lines[k][0], lines[k][1]);
    const drop = new Set<number>();
    const cut = new Map<number, number>();
    const nonEmpty = lines.map((_, k) => k).filter((k) => txt(k).trim() !== '');

    if (nonEmpty.length >= 2) {
        const f = nonEmpty[0];
        const l = nonEmpty[nonEmpty.length - 1];
        if (/^\s*```[\w-]*\s*$/.test(txt(f)) && /^\s*```\s*$/.test(txt(l))) {
            drop.add(f);
            drop.add(l);
            fixes.push({ pos: lines[f][0], detail: '去掉了 Markdown 代码块标记 ```' });
        }
    }
    const pre = nonEmpty.filter((k) => !drop.has(k));
    // lines before the JSON starts: a copied line-number block, a list marker, a log header
    const STRUCT = /["'{}[\],:｛｝［］：]|^\s*\/[/*]/;
    const firstJson = pre.findIndex((k) => STRUCT.test(txt(k)));
    if (firstJson > 0) {
        const lead = pre.slice(0, firstJson);
        lead.forEach((k) => drop.add(k));
        const isNum = (k: number) => /^\s*\d+\s*$/.test(txt(k));
        const nums = lead.filter(isNum);
        const other = lead.filter((k) => !isNum(k));
        if (other.length)
            fixes.push({ pos: lines[other[0]][0], detail: '忽略了开头的非 JSON 内容', sample: clip(txt(other[0]).trim()) });
        if (nums.length)
            fixes.push({
                pos: lines[nums[0]][0],
                detail: nums.length >= 3 ? '去掉了开头复制进来的行号' : '忽略了开头的非 JSON 内容',
                sample:
                    nums.length > 1
                        ? `${txt(nums[0]).trim()} – ${txt(nums[nums.length - 1]).trim()}`
                        : txt(nums[0]).trim(),
            });
    }
    const body = nonEmpty.filter((k) => !drop.has(k));

    // the line-number gutter copied as separate lines (in a block or interleaved)
    const numOnly = body.filter((k) => /^\s*\d+\s*$/.test(txt(k)));
    if (numOnly.length >= 5) {
        const vals = numOnly.map((k) => Number(txt(k).trim()));
        const content = body.length - numOnly.length;
        if (consecutive(vals) && Math.abs(numOnly.length - content) <= Math.max(1, Math.ceil(numOnly.length * 0.05))) {
            numOnly.forEach((k) => drop.add(k));
            fixes.push({ pos: -1, detail: '去掉了混在内容里的行号', sample: `${vals[0]} – ${vals[vals.length - 1]}` });
        }
    }

    // line numbers at the start of every line: "12  "key": 1"
    const rest = body.filter((k) => !drop.has(k));
    if (rest.length >= 3) {
        const re = /^[ \t]*(\d+)(?:[ \t]*[|:│][ \t]?|[ \t]+)/;
        const m = rest.map((k) => re.exec(txt(k)));
        const hits = m.filter((x): x is RegExpExecArray => !!x);
        if (hits.length >= rest.length * 0.9 && consecutive(hits.map((x) => Number(x[1])))) {
            rest.forEach((k, i) => {
                const x = m[i];
                if (x) cut.set(k, x[0].length);
            });
            fixes.push({ pos: -1, detail: '去掉了每行开头的行号' });
        }
    }

    if (!drop.size && !cut.size) return null;
    const b = new Builder();
    lines.forEach(([a, e], k) => {
        if (drop.has(k)) return;
        b.keep(s, a + (cut.get(k) ?? 0), e);
        if (e < s.length) b.keep(s, e, e + 1);
    });
    return b;
}

const OPENERS = '{[｛［';

/** Backslashes that Markdown renderers (chat apps, docs) put before _ * [ ] and friends. */
const MD_ESCAPED = new Set('_*[]#~>|!()+-.=<{}`'.split(''));

function mdUnescape(s: string, fixes: Fix[]): Builder | null {
    const b = new Builder();
    let seg = 0;
    let count = 0;
    let first = -1;
    const kinds = new Set<string>();
    for (let i = 0; i < s.length; i++) {
        if (s[i] !== '\\') continue;
        const c = s[i + 1];
        if (c === '\\') {
            i++;
            continue;
        }
        if (c !== undefined && MD_ESCAPED.has(c)) {
            b.keep(s, seg, i);
            seg = i + 1;
            count++;
            if (first < 0) first = i;
            if (kinds.size < 4) kinds.add('\\' + c);
            i++;
        }
    }
    if (!count) return null;
    b.keep(s, seg, s.length);
    fixes.push({ pos: first, detail: '去掉了 Markdown 转义加上的反斜杠', sample: `${[...kinds].join(' ')} 共 ${count} 处` });
    return b;
}

const MISSING_KEY = '(缺失的键)';

/** Closing brackets that have no opener in the text: the text is the tail of a larger document. */
function unmatchedClosers(s: string, from: number): ('}' | ']')[] {
    const st: string[] = [];
    const out: ('}' | ']')[] = [];
    for (let i = from; i < s.length; i++) {
        const c = FW[s[i]] ?? s[i];
        if (c === '"') {
            i++;
            while (i < s.length && s[i] !== '"' && s[i] !== '\n') {
                if (s[i] === '\\') i++;
                i++;
            }
            continue;
        }
        if (c === '{' || c === '[') st.push(c);
        else if (c === '}' || c === ']') {
            if (st.length) st.pop();
            else out.push(c);
        }
    }
    return out;
}

/** Rebuilds the missing head of a fragment cut out of a larger document. */
function balanceFragment(s: string, q: number, startsWithKey: boolean, fixes: Fix[]): Builder | null {
    const missing = unmatchedClosers(s, q);
    if (!missing.length) return null;
    const openers = missing.reverse().map((c) => (c === '}' ? '{' : '['));
    let prefix = '';
    let placeholders = 0;
    openers.forEach((op, k) => {
        prefix += op;
        if (op === '{' && k < openers.length - 1) {
            prefix += JSON.stringify(MISSING_KEY) + ':';
            placeholders++;
        }
    });
    if (openers[openers.length - 1] === '[' && startsWithKey) prefix += '{';
    const b = new Builder();
    b.insert(prefix, q);
    b.keep(s, 0, s.length);
    fixes.push({
        pos: q,
        detail: '内容是从中间截取的片段，在开头补上了缺失的外层结构',
        sample: `${openers.join('')}（${openers.length} 层）`,
    });
    if (placeholders) fixes.push({ pos: q, detail: `截断处缺失的键名用 "${MISSING_KEY}" 代替`, sample: `${placeholders} 处` });
    return b;
}

/** Text before the JSON (log prefix, "data: "), or a key-value fragment without outer braces. */
function frame(s: string, fixes: Fix[]): Builder | null {
    let q = 0;
    while (q < s.length && isWs(s.charCodeAt(q))) q++;
    if (q >= s.length || OPENERS.includes(s[q])) return null;
    if (s.startsWith('//', q) || s.startsWith('/*', q)) return null;
    const rest = s.slice(q);
    const quotedKey = /^("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')\s*[:：]/.test(rest);
    const identKey = /^[A-Za-z_$\u4e00-\u9fff][\w$\-\u4e00-\u9fff]*\s*[:：]/.test(rest);
    if (quotedKey || identKey || ',}]，｝］'.includes(s[q])) {
        const frag = balanceFragment(s, q, quotedKey || identKey, fixes);
        if (frag) return frag;
    }
    let p = -1;
    for (let i = q; i < s.length; i++) {
        if (OPENERS.includes(s[i])) {
            p = i;
            break;
        }
    }
    const wrap = () => {
        const b = new Builder();
        b.insert('{', q);
        b.keep(s, 0, s.length);
        b.insert('}', s.length);
        fixes.push({ pos: q, detail: '补上了外层的 { }' });
        return b;
    };
    if (quotedKey) return wrap();
    if (p > q) {
        const pre = s.slice(q, p);
        if (!/[,"'，]/.test(pre)) {
            const b = new Builder();
            b.keep(s, p, s.length);
            const sample = pre.trim();
            fixes.push({ pos: q, detail: '忽略了开头的非 JSON 内容', sample: sample.length > 30 ? sample.slice(0, 29) + '…' : sample });
            return b;
        }
    }
    if (identKey) return wrap();
    return null;
}

/* ---------------- tolerant parser ---------------- */

const FW: Record<string, string> = { '，': ',', '：': ':', '｛': '{', '｝': '}', '［': '[', '］': ']' };
const STOP = new Set(',:{}[]"\'`“”‘’，：｛｝［］'.split(''));
const QUOTES: Record<string, string> = { '"': '"', "'": "'", '`': '`', '“': '”', '‘': '’' };
const ESC: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
const CLOSING_NEXT = ',:}]"\'\n\r/，：｝］';
const WORD_START = /[\w$+\-.\u00C0-\uFEFE\uFF10-\uFF19\uFF21-\uFF5A]/;

const LITERALS: Record<string, string> = {
    True: 'true',
    TRUE: 'true',
    False: 'false',
    FALSE: 'false',
    None: 'null',
    NULL: 'null',
    Null: 'null',
    nil: 'null',
    undefined: 'null',
    NaN: 'null',
    Infinity: 'null',
    '-Infinity': 'null',
    '+Infinity': 'null',
};

const clip = (s: string, n = 30) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

class Repairer {
    i = 0;
    n: number;
    out: string[] = [];
    fixes: Fix[] = [];
    stack: ('{' | '[')[] = [];
    private sawFullSpace = false;

    constructor(
        private s: string,
        private map: MapFn,
    ) {
        this.n = s.length;
    }

    fix(detail: string, at = this.i, sample?: string) {
        if (this.fixes.length >= MAX_FIXES) return;
        this.fixes.push({ pos: at < 0 ? -1 : this.map(at), detail, sample });
    }

    eof() {
        return this.i >= this.n;
    }

    /** current char with Chinese structural punctuation normalized */
    peek(): string {
        const c = this.s[this.i] ?? '';
        return FW[c] ?? c;
    }

    take() {
        const c = this.s[this.i];
        if (FW[c]) this.fix(`把中文标点「${c}」换成了「${FW[c]}」`);
        this.i++;
    }

    skip() {
        const s = this.s;
        for (;;) {
            while (this.i < this.n && isWs(s.charCodeAt(this.i))) {
                if (s.charCodeAt(this.i) === 0x3000 && !this.sawFullSpace) {
                    this.sawFullSpace = true;
                    this.fix('把全角空格当作普通空白处理');
                }
                this.i++;
            }
            if (s.startsWith('//', this.i)) {
                const p = this.i;
                const e = s.indexOf('\n', p);
                this.i = e < 0 ? this.n : e;
                this.fix('删除了注释', p, clip(s.slice(p, this.i).trim()));
                continue;
            }
            if (s.startsWith('/*', this.i)) {
                const p = this.i;
                const e = s.indexOf('*/', p + 2);
                this.i = e < 0 ? this.n : e + 2;
                this.fix('删除了注释', p, clip(s.slice(p, this.i).replace(/\s+/g, ' ').trim()));
                continue;
            }
            return;
        }
    }

    isValueStart(c: string) {
        return c === '{' || c === '[' || QUOTES[c] !== undefined || WORD_START.test(c);
    }

    /** a closer that would close the root while more members follow (", key") is an extra one */
    strayRootCloser(): boolean {
        const s = this.s;
        let j = this.i + 1;
        const ws = () => {
            while (j < this.n && isWs(s.charCodeAt(j))) j++;
        };
        ws();
        while (j < this.n && '}]｝］'.includes(s[j])) {
            j++;
            ws();
        }
        if (j >= this.n || (s[j] !== ',' && s[j] !== '，')) return false;
        j++;
        ws();
        return j < this.n && !OPENERS.includes(s[j]);
    }

    dropStrayCloser(c: string) {
        this.fix(`删除了多余的 ${c}`);
        this.take();
        this.skip();
        if (this.peek() === ',') this.i++;
    }

    word(): string {
        const s = this.s;
        const st = this.i;
        while (this.i < this.n) {
            const c = s[this.i];
            if (isWs(c.charCodeAt(0)) || STOP.has(c)) break;
            if (c === '/' && (s[this.i + 1] === '/' || s[this.i + 1] === '*')) break;
            this.i++;
        }
        return s.slice(st, this.i);
    }

    quoteClosesAt(j: number): boolean {
        const s = this.s;
        let k = j + 1;
        while (k < this.n && (s[k] === ' ' || s[k] === '\t')) k++;
        return k >= this.n || CLOSING_NEXT.includes(s[k]);
    }

    decode(a: number, b: number): { text: string; ctrl: boolean } {
        const s = this.s;
        let out = '';
        let seg = a;
        let i = a;
        let ctrl = false;
        while (i < b) {
            const c = s[i];
            if (c === '\\') {
                out += s.slice(seg, i);
                const e = s[i + 1];
                if (i + 1 >= b) {
                    out += '\\';
                    i = b;
                    seg = b;
                    break;
                }
                if (e === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) {
                    out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16));
                    i += 6;
                } else if (ESC[e] !== undefined) {
                    out += ESC[e];
                    i += 2;
                } else if (e === "'" || e === '`') {
                    out += e;
                    i += 2;
                } else if (e === '\n') {
                    i += 2;
                } else {
                    this.fix(`保留了无效的转义 \\${e}（按普通字符处理）`, i);
                    out += '\\' + e;
                    i += 2;
                }
                seg = i;
                continue;
            }
            if (c.charCodeAt(0) < 32) ctrl = true;
            i++;
        }
        out += s.slice(seg, b);
        return { text: out, ctrl };
    }

    string(): string {
        const s = this.s;
        const start = this.i;
        const open = s[start];
        const close = QUOTES[open];
        const heuristic = open === '"' || open === "'";
        let j = start + 1;
        let end = -1;
        let inner = false;
        let firstNl = -1;
        while (j < this.n) {
            const c = s[j];
            if (c === '\\') {
                j += 2;
                continue;
            }
            if (c === close) {
                if (!heuristic || this.quoteClosesAt(j)) {
                    end = j;
                    break;
                }
                inner = true;
            } else if (c === '\n' && firstNl < 0) firstNl = j;
            j++;
        }
        let contentEnd: number;
        let next: number;
        if (end >= 0) {
            contentEnd = end;
            next = end + 1;
        } else if (firstNl >= 0) {
            let e = firstNl;
            while (e > start + 1 && (s[e - 1] === ' ' || s[e - 1] === '\t' || s[e - 1] === '\r')) e--;
            if (e > start + 1 && (s[e - 1] === ',' || s[e - 1] === '，')) e--;
            contentEnd = e;
            next = e;
            this.fix('补全了缺失的右引号', e);
            inner = false;
        } else {
            contentEnd = this.n;
            next = this.n;
            this.fix('补全了缺失的右引号', this.n);
        }
        if (open === "'") this.fix('把单引号换成了双引号', start);
        else if (open === '`') this.fix('把反引号换成了双引号', start);
        else if (open !== '"') this.fix('把中文引号换成了英文双引号', start);
        const { text, ctrl } = this.decode(start + 1, Math.min(contentEnd, this.n));
        if (inner) this.fix('转义了字符串里的双引号', start, clip(text));
        if (ctrl) this.fix('转义了字符串里的换行或控制字符', start, clip(text.replace(/\s+/g, ' ')));
        this.i = next;
        return text;
    }

    numberText(w: string, at: number): string | null {
        if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(w)) return w;
        const hex = /^([+-]?)0[xX]([0-9a-fA-F]{1,13})$/.exec(w);
        if (hex) {
            this.fix('把十六进制数字换成了十进制', at, w);
            return (hex[1] === '-' ? '-' : '') + String(parseInt(hex[2], 16));
        }
        const m = /^([+-]?)(\d*)(?:\.(\d*))?([eE][+-]?\d+)?$/.exec(w.replace(/_/g, ''));
        if (!m || (!m[2] && !m[3])) return null;
        if (m[2].length > 1 && m[2].startsWith('0') && m[3] === undefined && !m[4]) return null; // 007: keep as text
        const sign = m[1] === '-' ? '-' : '';
        const int = m[2].replace(/^0+(?=\d)/, '') || '0';
        const frac = m[3] ? '.' + m[3] : '';
        this.fix('修正了数字写法', at, w);
        return sign + int + frac + (m[4] ?? '');
    }

    bareValue(): string {
        const s = this.s;
        const st = this.i;
        const w = this.word();
        if (w === 'true' || w === 'false' || w === 'null') return w;
        if (LITERALS[w]) {
            this.fix(`把 ${w} 换成了 ${LITERALS[w]}`, st);
            return LITERALS[w];
        }
        const num = this.numberText(w, st);
        if (num !== null) return num;
        // unquoted text: up to the end of the line or the next separator
        let end = this.i;
        while (end < this.n) {
            const c = s[end];
            if (c === '\n' || c === '\r' || c === ',' || c === '}' || c === ']' || c === '，' || c === '｝' || c === '］') break;
            if (c === '/' && (s[end + 1] === '*' || (s[end + 1] === '/' && end > st && isWs(s.charCodeAt(end - 1))))) break;
            end++;
        }
        const text = s.slice(st, end).trimEnd();
        this.i = st + text.length;
        this.fix('给没有引号的值加上了引号', st, clip(text));
        return JSON.stringify(text);
    }

    value(): void {
        this.skip();
        if (this.eof()) {
            this.fix('补全了缺失的值（null）');
            this.out.push('null');
            return;
        }
        const c = this.peek();
        if (c === '{') return this.object();
        if (c === '[') return this.array();
        if (QUOTES[this.s[this.i]] !== undefined) {
            this.out.push(JSON.stringify(this.string()));
            return;
        }
        if (c === ',' || c === '}' || c === ']') {
            this.fix('补全了缺失的值（null）');
            this.out.push('null');
            return;
        }
        if (c === ':') {
            this.fix('删除了多余的冒号');
            this.take();
            return this.value();
        }
        if (!WORD_START.test(c)) {
            this.fix('删除了无法识别的字符', this.i, c);
            this.i++;
            return this.value();
        }
        this.out.push(this.bareValue());
    }

    key(): string | null {
        const c = this.s[this.i];
        if (QUOTES[c] !== undefined) return this.string();
        if (!WORD_START.test(c)) return null;
        const st = this.i;
        const w = this.word();
        if (!w) return null;
        this.fix('给键名加上了双引号', st, w);
        return w;
    }

    afterItem() {
        this.skip();
        if (this.eof()) return;
        const c = this.peek();
        if (c === ',') {
            const p = this.i;
            this.take();
            this.skip();
            const d = this.peek();
            if (this.eof() || d === '}' || d === ']') this.fix('删除了末尾多余的逗号', p);
            return;
        }
        if (c === '}' || c === ']') return;
        if (this.isValueStart(this.s[this.i]) || this.isValueStart(c)) this.fix('补上了缺少的逗号');
    }

    object(): void {
        this.take();
        this.out.push('{');
        this.stack.push('{');
        let count = 0;
        let missing = 0;
        for (;;) {
            this.skip();
            if (this.eof()) {
                this.fix('补全了缺失的 }');
                this.out.push('}');
                this.stack.pop();
                return;
            }
            const c = this.peek();
            if (c === '}') {
                if (this.stack.length === 1 && this.strayRootCloser()) {
                    this.dropStrayCloser('}');
                    continue;
                }
                this.take();
                this.out.push('}');
                this.stack.pop();
                return;
            }
            if (c === ']') {
                if (this.stack.slice(0, -1).includes('[')) {
                    this.fix('补全了缺失的 }');
                    this.out.push('}');
                    this.stack.pop();
                    return;
                }
                this.fix('删除了多余的 ]');
                this.take();
                continue;
            }
            if (c === ',') {
                this.fix('删除了多余的逗号');
                this.take();
                continue;
            }
            if (c === '{' || c === '[') {
                // a bracket where a key should be: never drop it (that would merge two things and lose
                // structure). Inside an array it starts the NEXT element, so the current object just
                // lost its closing brace; anywhere else the value is missing its key.
                if (c === '{' && count > 0 && this.stack[this.stack.length - 2] === '[') {
                    this.fix('补全了缺失的 }');
                    this.out.push('}');
                    this.stack.pop();
                    return;
                }
                const name = missing === 0 ? MISSING_KEY : `(缺失的键 ${missing + 1})`;
                missing++;
                this.fix('给没有键名的值补上了键名', this.i, name);
                this.out.push((count ? ',' : '') + JSON.stringify(name) + ':');
                this.value();
                count++;
                this.afterItem();
                continue;
            }
            const kpos = this.i;
            const k = this.key();
            if (k === null) {
                this.fix('删除了无法识别的字符', kpos, this.s[kpos]);
                this.i = kpos + 1;
                continue;
            }
            this.skip();
            if (this.peek() === ':') this.take();
            else if (this.s[this.i] === '=') {
                this.fix('把 = 换成了冒号');
                this.i++;
            } else this.fix('补上了缺少的冒号');
            this.out.push((count ? ',' : '') + JSON.stringify(k) + ':');
            this.skip();
            const v = this.peek();
            if (this.eof() || v === ',' || v === '}') {
                this.fix('补全了缺失的值（null）');
                this.out.push('null');
            } else this.value();
            count++;
            this.afterItem();
        }
    }

    array(): void {
        this.take();
        this.out.push('[');
        this.stack.push('[');
        let count = 0;
        for (;;) {
            this.skip();
            if (this.eof()) {
                this.fix('补全了缺失的 ]');
                this.out.push(']');
                this.stack.pop();
                return;
            }
            const c = this.peek();
            if (c === ']') {
                if (this.stack.length === 1 && this.strayRootCloser()) {
                    this.dropStrayCloser(']');
                    continue;
                }
                this.take();
                this.out.push(']');
                this.stack.pop();
                return;
            }
            if (c === '}') {
                if (this.stack.slice(0, -1).includes('{')) {
                    this.fix('补全了缺失的 ]');
                    this.out.push(']');
                    this.stack.pop();
                    return;
                }
                this.fix('删除了多余的 }');
                this.take();
                continue;
            }
            if (c === ',') {
                this.fix('删除了多余的逗号');
                this.take();
                continue;
            }
            if (c === ':') {
                this.fix('删除了多余的冒号');
                this.take();
                continue;
            }
            if (!this.isValueStart(c) && !this.isValueStart(this.s[this.i])) {
                this.fix('删除了无法识别的字符', this.i, this.s[this.i]);
                this.i++;
                continue;
            }
            if (count) this.out.push(',');
            const before = this.i;
            this.value();
            if (this.i === before) this.i++;
            count++;
            this.afterItem();
        }
    }

    run(): { text: string; roots: number } {
        const values: string[] = [];
        for (;;) {
            this.skip();
            if (this.eof()) break;
            const c = this.peek();
            if (c === ',') {
                this.take();
                continue;
            }
            if (c === '}' || c === ']') {
                this.fix(`删除了多余的 ${c}`);
                this.take();
                continue;
            }
            if (values.length && !OPENERS.includes(this.s[this.i]) && QUOTES[this.s[this.i]] === undefined) {
                // trailing junk after the JSON: skip to the next object / array
                const p = this.i;
                let j = p;
                while (j < this.n && !OPENERS.includes(this.s[j])) j++;
                this.fix('忽略了 JSON 后面多余的内容', p, clip(this.s.slice(p, j).trim()));
                this.i = j;
                continue;
            }
            this.out = [];
            this.stack = [];
            this.value();
            values.push(this.out.join(''));
        }
        if (values.length > 1) {
            this.fix(`把 ${values.length} 个顶层值合并成了一个数组`, -1);
            return { text: '[' + values.join(',') + ']', roots: values.length };
        }
        return { text: values[0] ?? '', roots: values.length };
    }
}

export function repairJson(input: string, withPositions = true): RepairResult {
    if (!input.trim()) return { ok: false };
    const fixes: Fix[] = [];
    let text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
    const offset = input.length - text.length;
    let map: MapFn = withPositions ? (p) => p + offset : () => -1;

    // each preprocessing step records positions in its own input text; map them back right away
    const local: Fix[] = [];
    const collect = () => {
        for (const f of local) fixes.push({ ...f, pos: f.pos < 0 ? -1 : map(f.pos) });
        local.length = 0;
    };
    const decor = stripDecor(text, local);
    collect();
    if (decor) {
        map = decor.mapper(map);
        text = decor.text;
    }
    const md = mdUnescape(text, local);
    collect();
    if (md) {
        map = md.mapper(map);
        text = md.text;
    }
    const framed = frame(text, local);
    collect();
    if (framed) {
        map = framed.mapper(map);
        text = framed.text;
    }

    try {
        const r = new Repairer(text, map);
        const { text: out } = r.run();
        const all = [...fixes, ...r.fixes];
        if (!out || all.length >= MAX_FIXES) return { ok: false };
        const node = parse(out);
        if (node.t !== 'obj' && node.t !== 'arr') return { ok: false };
        if (!all.length) all.push({ pos: -1, detail: '修正了 JSON 格式' });
        return { ok: true, text: out, fixes: all };
    } catch {
        return { ok: false };
    }
}
