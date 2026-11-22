/**
 * URL building: the reverse of urlParams. Turns a base link plus a list of key / value rows into a URL.
 *
 *  - arrays: repeated keys, brackets (a[]=1), commas (a=1,2) or indexes (a[0]=1)
 *  - spaces: %20 or +
 *  - empty values can be skipped
 *  - parameters already in the base link can be kept, overwritten (same name) or dropped
 *  - keys can be sorted; everything is percent-encoded with the chosen character encoding
 *  - bulk import: "a=1&b=2", one key=value per line, a whole URL, or a JSON object (repaired when malformed)
 */
import { J, parse, stringify } from './jsonAst';
import { SortMode, checkJsonValue, decodeComponent, encodeComponent, summarizeFixes } from './urlParams';

export type ArrayStyle = 'repeat' | 'bracket' | 'comma' | 'index';
export type SpaceStyle = 'percent' | 'plus';
export type ExistingMode = 'append' | 'overwrite' | 'replace';
export type NestedMode = 'json' | 'flatten';

export const ARRAY_STYLES: { v: ArrayStyle; label: string; short: string }[] = [
    { v: 'repeat', label: '重复键  a=1&a=2', short: '重复键' },
    { v: 'bracket', label: '方括号  a[]=1&a[]=2', short: '方括号' },
    { v: 'comma', label: '逗号  a=1,2', short: '逗号' },
    { v: 'index', label: '下标  a[0]=1&a[1]=2', short: '下标' },
];
export const EXISTING_MODES: { v: ExistingMode; label: string }[] = [
    { v: 'overwrite', label: '覆盖同名' },
    { v: 'append', label: '追加' },
    { v: 'replace', label: '整体替换' },
];

export interface BuildRow {
    id: number;
    key: string;
    value: string;
    /** the value is one item of an array (even when the key appears only once) */
    arr: boolean;
}

export interface BuildOptions {
    encoding: string;
    arrayStyle: ArrayStyle;
    spaceStyle: SpaceStyle;
    skipEmpty: boolean;
    existing: ExistingMode;
    order: SortMode;
}

export interface BuildEntry {
    raw: string;
    /** the key without [] / [n], decoded: what "same name" and sorting compare */
    key: string;
    isNew: boolean;
}

export interface BuildResult {
    url: string;
    head: string;
    hash: string;
    entries: BuildEntry[];
    /** parameters found in the base link */
    existing: number;
    kept: number;
    /** existing parameters removed because a row has the same name (overwrite) or the query was replaced */
    removed: number;
    /** empty values left out */
    skipped: number;
    /** characters the encoding cannot represent (written as ?) */
    lossy: number;
}

const stripIdx = (k: string) => k.replace(/\[\d*\]$/, '');

interface Group {
    key: string;
    vals: string[];
    arr: boolean;
}

export function buildUrl(baseInput: string, rows: BuildRow[], o: BuildOptions): BuildResult {
    const enc = o.encoding === 'auto' ? 'utf-8' : o.encoding;
    const wide = enc === 'utf-16le' || enc === 'utf-16be';
    let lossy = 0;
    let skipped = 0;
    const esc = (s: string, isKey = false) => {
        const r = encodeComponent(s, enc);
        lossy += r.lossy;
        let t = r.text;
        if (!wide) {
            if (o.spaceStyle === 'plus') t = t.replace(/%20/g, '+');
            if (isKey) t = t.replace(/%5B/g, '[').replace(/%5D/g, ']');
        }
        return t;
    };

    // base link: head ? query # hash
    const base = baseInput.replace(/\s*[\r\n]+\s*/g, '').trim();
    const hi = base.indexOf('#');
    const hash = hi >= 0 ? base.slice(hi) : '';
    const rest = hi >= 0 ? base.slice(0, hi) : base;
    const qi = rest.indexOf('?');
    const head = qi >= 0 ? rest.slice(0, qi) : rest;
    const existingRaw = (qi >= 0 ? rest.slice(qi + 1) : '').split('&').filter((p) => p !== '');
    const existingEntries: BuildEntry[] = existingRaw.map((raw) => {
        const eq = raw.indexOf('=');
        const rk = eq < 0 ? raw : raw.slice(0, eq);
        return { raw, key: stripIdx(decodeComponent(rk, enc, o.spaceStyle === 'plus').text), isNew: false };
    });

    // rows -> groups by key (first appearance order)
    const groups = new Map<string, Group>();
    for (const r of rows) {
        const k = r.key.trim();
        if (!k) continue;
        let g = groups.get(k);
        if (!g) {
            g = { key: k, vals: [], arr: false };
            groups.set(k, g);
        }
        g.vals.push(r.value);
        if (r.arr) g.arr = true;
    }

    const pairsOf = (g: Group): string[] => {
        let vals = g.vals;
        if (o.skipEmpty) {
            const kept = vals.filter((v) => v !== '');
            skipped += vals.length - kept.length;
            vals = kept;
        }
        if (!vals.length) return [];
        const isArray = vals.length > 1 || g.arr;
        if (!isArray) return [`${esc(g.key, true)}=${esc(vals[0])}`];
        const bracketed = o.arrayStyle === 'bracket' || o.arrayStyle === 'index';
        const name = bracketed ? g.key.replace(/\[\]$/, '') : g.key;
        const k = esc(name, true);
        switch (o.arrayStyle) {
            case 'bracket':
                return vals.map((v) => `${k}[]=${esc(v)}`);
            case 'index':
                return vals.map((v, i) => `${k}[${i}]=${esc(v)}`);
            case 'comma':
                return [`${k}=${vals.map((v) => esc(v)).join(',')}`];
            default:
                return vals.map((v) => `${k}=${esc(v)}`);
        }
    };

    let entries: BuildEntry[] = o.existing === 'replace' ? [] : [...existingEntries];
    let removed = o.existing === 'replace' ? existingEntries.length : 0;
    for (const g of groups.values()) {
        const pairs = pairsOf(g);
        if (!pairs.length) continue;
        const name = stripIdx(g.key);
        const fresh: BuildEntry[] = pairs.map((raw) => ({ raw, key: name, isNew: true }));
        if (o.existing === 'overwrite') {
            const at = entries.map((e, i) => (!e.isNew && e.key === name ? i : -1)).filter((i) => i >= 0);
            if (at.length) {
                removed += at.length;
                for (let i = at.length - 1; i >= 1; i--) entries.splice(at[i], 1);
                entries.splice(at[0], 1, ...fresh);
                continue;
            }
        }
        entries.push(...fresh);
    }

    if (o.order !== 'none') {
        const dir = o.order === 'desc' ? -1 : 1;
        entries = entries
            .map((e, i) => ({ e, i }))
            .sort((a, b) => (a.e.key < b.e.key ? -dir : a.e.key > b.e.key ? dir : a.i - b.i))
            .map((x) => x.e);
    }

    const query = entries.map((e) => e.raw).join('&');
    const url = head + (query ? (head ? '?' : '') + query : '') + hash;
    return {
        url,
        head,
        hash,
        entries,
        existing: existingEntries.length,
        kept: entries.filter((e) => !e.isNew).length,
        removed,
        skipped,
        lossy,
    };
}

/* ---------------- bulk import ---------------- */

export interface ImportRow {
    key: string;
    value: string;
    arr: boolean;
}

export type ImportResult =
    | { ok: true; kind: 'json' | 'query' | 'lines'; rows: ImportRow[]; note: string }
    | { ok: false; error: string };

/** A line break inside a string literal is almost always a soft wrap from copying: drop it. */
export function joinBrokenStrings(src: string): { text: string; joined: number } {
    let out = '';
    let inStr = false;
    let joined = 0;
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (inStr) {
            if (c === '\\') {
                out += c + (src[i + 1] ?? '');
                i++;
                continue;
            }
            if (c === '"') inStr = false;
            else if (c === '\n' || c === '\r') {
                if (c === '\r' && src[i + 1] === '\n') i++;
                // two or more spaces before the line break are Markdown's "hard break" marker, not part of the text
                out = out.replace(/ {2,}$/, '');
                joined++;
                continue;
            }
        } else if (c === '"') inStr = true;
        out += c;
    }
    return { text: out, joined };
}

const prim = (n: J): string | null =>
    n.t === 'str' ? n.v : n.t === 'num' ? n.raw : n.t === 'bool' ? String(n.v) : n.t === 'null' ? '' : null;
const compact = (n: J) => stringify(n, '', 'none');

function flatten(prefix: string, n: J, out: ImportRow[]) {
    const p = prim(n);
    if (p !== null) out.push({ key: prefix, value: p, arr: false });
    else if (n.t === 'obj') n.entries.forEach(([k, v]) => flatten(`${prefix}[${k}]`, v, out));
    else if (n.t === 'arr') n.items.forEach((v, i) => flatten(`${prefix}[${i}]`, v, out));
}

function importJson(text: string, nested: NestedMode): ImportResult {
    const notes: string[] = [];
    let json = text;
    const first = checkJsonValue(text);
    if (first.state === 'valid') {
        json = text;
    } else {
        const j = joinBrokenStrings(text);
        const second = j.joined > 0 ? checkJsonValue(j.text) : first;
        const useJoined = j.joined > 0 && second.state !== 'broken';
        const c = useJoined ? second : first;
        if (c.state === 'broken') return { ok: false, error: `JSON 格式有误，无法自动修复（${c.message}）` };
        if (useJoined) notes.push(`合并了 ${j.joined} 处被折断的字符串`);
        if (c.state === 'fixable') {
            json = c.fixed;
            notes.push(`已自动修复 JSON（${summarizeFixes(c.fixes)}）`);
        } else if (c.state === 'valid') json = j.text;
        else return { ok: false, error: '不是 JSON 对象' };
    }
    let node: J;
    try {
        node = parse(json);
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'JSON 解析失败' };
    }
    if (node.t !== 'obj')
        return {
            ok: false,
            error: notes.length ? '格式有误，自动修复后也不是一个 JSON 对象，请检查内容' : '需要 JSON 对象（{ … }），数组和单个值不能当作参数',
        };
    const rows: ImportRow[] = [];
    let stringified = 0;
    let emptyArrays = 0;
    for (const [k, v] of node.entries) {
        const p = prim(v);
        if (p !== null) rows.push({ key: k, value: p, arr: false });
        else if (v.t === 'arr') {
            if (!v.items.length) emptyArrays++;
            for (const it of v.items) {
                const q = prim(it);
                if (q === null) stringified++;
                rows.push({ key: k, value: q !== null ? q : compact(it), arr: true });
            }
        } else if (nested === 'flatten') flatten(k, v, rows);
        else {
            stringified++;
            rows.push({ key: k, value: compact(v), arr: false });
        }
    }
    if (stringified) notes.push(`${stringified} 个嵌套值转成了 JSON 字符串`);
    if (emptyArrays) notes.push(`忽略了 ${emptyArrays} 个空数组`);
    return { ok: true, kind: 'json', rows, note: notes.join('；') };
}

/** "[https://a.com/x](https://a.com/x)" (links that a chat or an editor wrote around plain URLs) -> "https://a.com/x" */
export function stripMdLinks(src: string): { text: string; n: number } {
    let n = 0;
    const text = src.replace(/\[((?:https?|ftp):\/\/[^\]\s]+)\]\(\1\)/g, (_m, u: string) => {
        n++;
        return u;
    });
    return { text, n };
}

/**
 * Whether pasted / typed text is parameter data rather than a link: a JSON object, "?a=1&b=2", "a=1&b=2" or
 * one key=value per line. A link ("https://…", "example.com/path?a=1", "/path?a=1") is not.
 */
export function looksLikeParamData(text: string): boolean {
    const t = text.trim();
    if (!t) return false;
    if (t.startsWith('{')) return true;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t) || t.startsWith('/')) return false;
    if (t.startsWith('?')) return t.length > 1;
    return /^[^\s=&?#/]+\s*=/.test(t);
}

export function importParams(input: string, o: { encoding: string; nested: NestedMode }): ImportResult {
    const md = stripMdLinks(input.trim());
    const r = importParamsRaw(md.text, o);
    if (r.ok && md.n > 0) r.note = [r.note, `还原了 ${md.n} 处被转成 Markdown 的链接`].filter(Boolean).join('；');
    return r;
}

function importParamsRaw(input: string, o: { encoding: string; nested: NestedMode }): ImportResult {
    const t = input.trim();
    if (!t) return { ok: false, error: '' };
    if (t.startsWith('{')) return importJson(t, o.nested);
    if (t.startsWith('[')) return { ok: false, error: '需要 JSON 对象（{ … }），数组不能当作参数' };

    let body = t;
    let note = '';
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(body)) {
        const q = body.indexOf('?');
        if (q < 0) return { ok: false, error: '这个链接里没有查询参数' };
        body = body.slice(q + 1);
        const h = body.indexOf('#');
        if (h >= 0) body = body.slice(0, h);
        note = '取了链接 ? 后面的参数';
    } else if (body.startsWith('?')) body = body.slice(1);

    const lines = /[\r\n]/.test(body);
    const rows: ImportRow[] = [];
    for (const tokenRaw of body.split(/[&\r\n]+/)) {
        const token = lines ? tokenRaw.trim() : tokenRaw;
        if (!token) continue;
        const eq = token.indexOf('=');
        const rk = eq < 0 ? token : token.slice(0, eq);
        const rv = eq < 0 ? '' : token.slice(eq + 1);
        const key = decodeComponent(lines ? rk.trim() : rk, o.encoding, false).text;
        if (!key) continue;
        rows.push({ key, value: decodeComponent(lines ? rv.trim() : rv, o.encoding, false).text, arr: false });
    }
    if (!rows.length) return { ok: false, error: '没有识别到 key=value' };
    if (/%[0-9a-f]{2}/i.test(body)) note = [note, '已解码 %XX'].filter(Boolean).join('；');
    if (!lines && body.includes('+')) note = [note, '+ 按原样保留，没有当作空格'].filter(Boolean).join('；');
    return { ok: true, kind: lines ? 'lines' : 'query', rows, note };
}

/* ---------------- samples ---------------- */

export const BUILD_SAMPLES: { id: string; label: string; base: string; rows: { key: string; value: string; arr?: boolean }[] }[] = [
    {
        id: 'search',
        label: '搜索（中文参数）',
        base: 'https://cn.bing.com/search',
        rows: [
            { key: 'q', value: '锤子在线工具网' },
            { key: 'domain', value: 'toolhelper.cn' },
        ],
    },
    {
        id: 'array',
        label: '数组与空值',
        base: 'https://api.example.com/v2/orders',
        rows: [
            { key: 'status', value: 'paid' },
            { key: 'status', value: 'shipped' },
            { key: 'tags', value: 'vip', arr: true },
            { key: 'tags', value: 'new', arr: true },
            { key: 'sort', value: '-createdAt' },
            { key: 'page', value: '1' },
            { key: 'keyword', value: '' },
        ],
    },
    {
        id: 'existing',
        label: '链接已有参数（覆盖同名）',
        base: 'https://example.com/list?page=1&sort=old&lang=zh-CN#top',
        rows: [
            { key: 'page', value: '2' },
            { key: 'tag', value: 'new' },
        ],
    },
    {
        id: 'json',
        label: '参数值是 JSON / 带特殊字符',
        base: 'https://example.com/chat',
        rows: [
            { key: 'bucket', value: '{"quick_ref":"on"}' },
            { key: 'q', value: 'a b&c=1+2' },
        ],
    },
];
