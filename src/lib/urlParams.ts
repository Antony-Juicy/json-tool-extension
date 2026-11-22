/**
 * URL parameter parsing: splits a URL (or just a query string) into its parts and the query
 * parameters, percent-decoding with a chosen character encoding.
 *
 * The URL is split by hand, not with `new URL()`, which would normalise the text (re-encode, lowercase,
 * drop what it considers invalid) and so hide exactly what the user wants to see.
 */
import { stringify } from './jsonAst';
import { repairInput, tryParse } from './transform';


export interface EncodingOption {
    id: string;
    label: string;
    /** TextDecoder label; "auto" tries UTF-8 first, then GB18030 */
    decoder: string;
}

export const ENCODINGS: { group: string; items: EncodingOption[] }[] = [
    {
        group: '常用',
        items: [
            { id: 'auto', label: '自动（UTF-8 优先，失败则 GBK）', decoder: 'auto' },
            { id: 'utf-8', label: 'UTF-8', decoder: 'utf-8' },
            { id: 'gbk', label: 'GBK（简繁体）', decoder: 'gbk' },
            { id: 'gb18030', label: 'GB18030', decoder: 'gb18030' },
            { id: 'big5', label: 'Big5（繁体）', decoder: 'big5' },
            { id: 'utf-16le', label: 'UTF-16LE', decoder: 'utf-16le' },
            { id: 'utf-16be', label: 'UTF-16BE', decoder: 'utf-16be' },
        ],
    },
    {
        group: '西欧',
        items: [
            { id: 'iso-8859-1', label: 'ISO-8859-1（Latin-1）', decoder: 'iso-8859-1' },
            { id: 'windows-1252', label: 'Windows-1252', decoder: 'windows-1252' },
            { id: 'iso-8859-15', label: 'ISO-8859-15（Latin-9）', decoder: 'iso-8859-15' },
        ],
    },
    {
        group: '日韩',
        items: [
            { id: 'shift_jis', label: 'Shift_JIS（日文）', decoder: 'shift_jis' },
            { id: 'euc-jp', label: 'EUC-JP（日文）', decoder: 'euc-jp' },
            { id: 'euc-kr', label: 'EUC-KR（韩文）', decoder: 'euc-kr' },
        ],
    },
    {
        group: '其他',
        items: [
            { id: 'windows-1251', label: 'Windows-1251（西里尔）', decoder: 'windows-1251' },
            { id: 'koi8-r', label: 'KOI8-R（俄文）', decoder: 'koi8-r' },
            { id: 'windows-1256', label: 'Windows-1256（阿拉伯文）', decoder: 'windows-1256' },
            { id: 'windows-874', label: 'Windows-874（泰文）', decoder: 'windows-874' },
        ],
    },
];

export const ENCODING_IDS = ENCODINGS.flatMap((g) => g.items.map((i) => i.id));

export type SortMode = 'none' | 'asc' | 'desc';

/* ---------------- JSON values ---------------- */

export type JsonCheck =
    | { state: 'none' }
    | { state: 'valid' }
    | { state: 'fixable'; fixed: string; fixes: string[] }
    | { state: 'broken'; message: string };

/** a value that is meant to be JSON: an object, or an array that has JSON punctuation in it (a plain "[abc]" is not) */
const JSONISH = /^\s*(\{|\[[\s\S]*["{},:])/;

/**
 * Whether `value` is JSON, JSON that can be repaired automatically (the repaired, compact text and what was
 * fixed), or JSON that cannot be repaired. Text that does not look like JSON is "none" and left alone.
 */
export function checkJsonValue(value: string): JsonCheck {
    if (!JSONISH.test(value)) return { state: 'none' };
    const v = value.trim();
    const p = tryParse(v);
    if (p.ok) return { state: 'valid' };
    const r = repairInput(v);
    if (r.ok) {
        const q = tryParse(r.text);
        if (q.ok) return { state: 'fixable', fixed: stringify(q.node, '', 'none'), fixes: r.fixes.map((f) => f.detail) };
    }
    return { state: 'broken', message: p.message };
}

/** "去掉了多余的逗号" or "去掉了多余的逗号 等 3 处" */
export const summarizeFixes = (fixes: string[]) => (fixes.length > 1 ? `${fixes[0]} 等 ${fixes.length} 处` : (fixes[0] ?? '已修复'));

export interface UrlParts {
    scheme: string;
    userinfo: string;
    host: string;
    port: string;
    /** path as written, and decoded */
    path: string;
    pathDecoded: string;
    query: string;
    hash: string;
    /** the part before "?" / "#", as written */
    base: string;
}

export type ValueKind = 'json' | 'url' | 'number' | 'empty' | 'none';

export interface Param {
    index: number;
    key: string;
    value: string;
    rawKey: string;
    rawValue: string;
    /** the pair had no "=" at all */
    noEq: boolean;
    /** this key appears more than once */
    dup: boolean;
    kind: ValueKind;
    /** the value, pretty-printed when it is JSON */
    pretty?: string;
    /** the text decoded with replacement characters, or the bytes are valid UTF-8 under another encoding: the chosen encoding is probably wrong */
    broken: boolean;
    /** the bytes look like UTF-8 although another encoding was chosen */
    utf8: boolean;
    /** the encoding that was actually used (matters for "auto") */
    enc: string;
}

export interface ParsedUrl {
    /** whether the input looks like a whole URL (has a scheme, host or path) rather than only a query string */
    isUrl: boolean;
    parts: UrlParts;
    params: Param[];
    hashParams: Param[];
    /** the hash is a route like "#/list?a=1": its path part */
    hashPath: string;
    broken: number;
    /** how many of the broken ones look like UTF-8 text decoded with another encoding */
    utf8: number;
    usedFallback: number;
}

export interface ParseOptions {
    encoding: string;
    plusAsSpace: boolean;
}

/* ---------------- decoding ---------------- */

const decoders = new Map<string, TextDecoder | null>();
function decoderFor(label: string, fatal: boolean): TextDecoder | null {
    const k = `${label}|${fatal}`;
    if (decoders.has(k)) return decoders.get(k) ?? null;
    let d: TextDecoder | null = null;
    try {
        d = new TextDecoder(label, { fatal });
    } catch {
        d = null;
    }
    decoders.set(k, d);
    return d;
}

function decodeBytes(bytes: number[], enc: string): { text: string; enc: string; fallback: boolean } {
    const u8 = Uint8Array.from(bytes);
    if (enc === 'auto') {
        const strict = decoderFor('utf-8', true);
        try {
            if (strict) return { text: strict.decode(u8), enc: 'utf-8', fallback: false };
        } catch {
            /* not valid UTF-8 */
        }
        const g = decoderFor('gb18030', false);
        if (g) return { text: g.decode(u8), enc: 'gb18030', fallback: true };
    }
    const label = enc === 'auto' ? 'utf-8' : enc;
    const d = decoderFor(label, false) ?? decoderFor('utf-8', false);
    return { text: d ? d.decode(u8) : '', enc: label, fallback: false };
}

const isHex = (c: string | undefined) => c !== undefined && /^[0-9a-fA-F]$/.test(c);

/** Percent-decodes `s`: runs of %XX are bytes decoded with `enc`; everything else stays as typed. */
export function decodeComponent(
    s: string,
    enc: string,
    plusAsSpace: boolean,
): { text: string; enc: string; fallback: boolean; utf8Looking: boolean } {
    let out = '';
    let run: number[] = [];
    let usedEnc = enc === 'auto' ? 'utf-8' : enc;
    let fallback = false;
    let utf8Looking = false;
    const legacy = enc !== 'auto' && enc !== 'utf-8' && !enc.startsWith('utf-16');
    const flush = () => {
        if (!run.length) return;
        const r = decodeBytes(run, enc);
        out += r.text;
        usedEnc = r.enc;
        if (r.fallback) fallback = true;
        // bytes that form valid multi-byte UTF-8 are very unlikely to be GBK / Big5 / Latin-1 text by chance
        if (legacy && run.length >= 2 && run.some((b) => b >= 0x80)) {
            try {
                const t = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(run));
                if (/[^\x00-\x7f]/.test(t)) utf8Looking = true;
            } catch {
                /* not UTF-8 */
            }
        }
        run = [];
    };
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '%' && isHex(s[i + 1]) && isHex(s[i + 2])) {
            run.push(parseInt(s.slice(i + 1, i + 3), 16));
            i += 2;
            continue;
        }
        flush();
        out += c === '+' && plusAsSpace ? ' ' : c;
    }
    flush();
    return { text: out, enc: usedEnc, fallback, utf8Looking };
}

/* ---------------- splitting ---------------- */

const URL_RE = /^(?:([a-zA-Z][a-zA-Z0-9+.-]*):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#([\s\S]*))?$/;

function classify(value: string): { kind: ValueKind; pretty?: string } {
    const v = value.trim();
    if (!v) return { kind: 'empty' };
    if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
        try {
            return { kind: 'json', pretty: JSON.stringify(JSON.parse(v), null, 2) };
        } catch {
            /* not JSON */
        }
    }
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/\S+/.test(v) || /^\/[^\s/]\S*\?\S+=/.test(v)) return { kind: 'url' };
    if (/^-?\d+(\.\d+)?$/.test(v)) return { kind: 'number' };
    return { kind: 'none' };
}

function parsePairs(query: string, o: ParseOptions): { params: Param[]; broken: number; utf8: number; fallback: number } {
    const params: Param[] = [];
    let broken = 0;
    let utf8 = 0;
    let fallback = 0;
    if (!query) return { params, broken, utf8, fallback };
    const seen = new Map<string, number>();
    query.split('&').forEach((pair) => {
        if (pair === '') return;
        const eq = pair.indexOf('=');
        const rawKey = eq < 0 ? pair : pair.slice(0, eq);
        const rawValue = eq < 0 ? '' : pair.slice(eq + 1);
        const k = decodeComponent(rawKey, o.encoding, o.plusAsSpace);
        const v = decodeComponent(rawValue, o.encoding, o.plusAsSpace);
        const looksUtf8 = k.utf8Looking || v.utf8Looking;
        const isBroken =
            looksUtf8 ||
            (k.text.includes('\uFFFD') && !rawKey.includes('\uFFFD')) ||
            (v.text.includes('\uFFFD') && !rawValue.includes('\uFFFD'));
        if (isBroken) broken++;
        if (looksUtf8) utf8++;
        if (k.fallback || v.fallback) fallback++;
        const c = classify(v.text);
        seen.set(k.text, (seen.get(k.text) ?? 0) + 1);
        params.push({
            index: params.length + 1,
            key: k.text,
            value: v.text,
            rawKey,
            rawValue,
            noEq: eq < 0,
            dup: false,
            kind: c.kind,
            pretty: c.pretty,
            broken: isBroken,
            utf8: looksUtf8,
            enc: v.fallback ? v.enc : k.fallback ? k.enc : v.enc,
        });
    });
    params.forEach((p) => {
        p.dup = (seen.get(p.key) ?? 0) > 1;
    });
    return { params, broken, utf8, fallback };
}

export function parseUrl(input: string, o: ParseOptions): ParsedUrl | null {
    // a pasted URL may have been wrapped over several lines
    const text = input.replace(/\s*[\r\n]+\s*/g, '').trim();
    if (!text) return null;

    let rest = text;
    let queryOnly = false;
    if (rest.startsWith('?')) {
        queryOnly = true;
        rest = rest.slice(1);
    } else if (!/[?#]/.test(rest) && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(rest) && rest.includes('=') && !rest.includes('/')) {
        queryOnly = true;
    }

    const empty: UrlParts = { scheme: '', userinfo: '', host: '', port: '', path: '', pathDecoded: '', query: '', hash: '', base: '' };

    if (queryOnly) {
        const hashAt = rest.indexOf('#');
        const q = hashAt < 0 ? rest : rest.slice(0, hashAt);
        const hash = hashAt < 0 ? '' : rest.slice(hashAt + 1);
        const main = parsePairs(q, o);
        const hp = splitHash(hash, o);
        return {
            isUrl: false,
            parts: { ...empty, query: q, hash },
            params: main.params,
            hashParams: hp.params,
            hashPath: hp.path,
            broken: main.broken + hp.broken,
            utf8: main.utf8 + hp.utf8,
            usedFallback: main.fallback + hp.fallback,
        };
    }

    const m = URL_RE.exec(rest);
    if (!m) return null;
    const [, scheme = '', authority = '', path = '', query = '', hash = ''] = m;
    let userinfo = '';
    let hostPort = authority;
    const at = authority.lastIndexOf('@');
    if (at >= 0) {
        userinfo = authority.slice(0, at);
        hostPort = authority.slice(at + 1);
    }
    let host = hostPort;
    let port = '';
    const pm = /^(.*):(\d*)$/.exec(hostPort);
    if (pm && !hostPort.endsWith(']')) {
        host = pm[1];
        port = pm[2];
    }
    const base = rest.slice(0, rest.length - (m[4] !== undefined ? m[4].length + 1 : 0) - (m[5] !== undefined ? m[5].length + 1 : 0));
    const main = parsePairs(query, o);
    const hp = splitHash(hash, o);
    return {
        isUrl: true,
        parts: {
            scheme,
            userinfo,
            host,
            port,
            path,
            pathDecoded: path ? decodeComponent(path, o.encoding, false).text : '',
            query,
            hash,
            base,
        },
        params: main.params,
        hashParams: hp.params,
        hashPath: hp.path,
        broken: main.broken + hp.broken,
        utf8: main.utf8 + hp.utf8,
        usedFallback: main.fallback + hp.fallback,
    };
}

function splitHash(hash: string, o: ParseOptions): { path: string; params: Param[]; broken: number; utf8: number; fallback: number } {
    const q = hash.indexOf('?');
    if (q < 0) return { path: '', params: [], broken: 0, utf8: 0, fallback: 0 };
    const r = parsePairs(hash.slice(q + 1), o);
    return { path: hash.slice(0, q), params: r.params, broken: r.broken, utf8: r.utf8, fallback: r.fallback };
}

export function sortParams(params: Param[], order: SortMode): Param[] {
    if (order === 'none') return params;
    const s = [...params].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.index - b.index));
    return order === 'desc' ? s.reverse() : s;
}

/* ---------------- output formats ---------------- */

/** repeated keys become arrays; "a[]" style keys are kept as written */
export function toObject(params: Param[]): Record<string, string | string[]> {
    const o: Record<string, string | string[]> = {};
    for (const p of params) {
        const cur = o[p.key];
        if (cur === undefined) o[p.key] = p.value;
        else if (Array.isArray(cur)) cur.push(p.value);
        else o[p.key] = [cur, p.value];
    }
    return o;
}

export function toJson(r: ParsedUrl, params: Param[]): string {
    const out: Record<string, unknown> = {};
    if (r.isUrl) {
        const p = r.parts;
        out.url = p.base;
        if (p.scheme) out.protocol = p.scheme;
        if (p.host) out.host = p.host;
        if (p.port) out.port = p.port;
        if (p.pathDecoded) out.path = p.pathDecoded;
    }
    out.params = toObject(params);
    if (r.parts.hash) out.hash = r.hashParams.length ? { path: r.hashPath, params: toObject(r.hashParams) } : r.parts.hash;
    return JSON.stringify(out, null, 2);
}

export function toText(params: Param[]): string {
    return params.map((p) => (p.noEq ? p.key : `${p.key}=${p.value}`)).join('\n');
}

export function toCsv(params: Param[]): string {
    const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    return ['key,value', ...params.map((p) => `${q(p.key)},${q(p.value)}`)].join('\n');
}

/* ---------------- rewriting the input ---------------- */

const enc = (s: string) => encodeURIComponent(s);
/** decoded text for reading: only the characters that would change the meaning stay escaped */
const readable = (s: string) => s.replace(/[%&=#+\r\n]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));

function rebuild(r: ParsedUrl, escape: (s: string) => string): string {
    const pairs = (ps: Param[]) => ps.map((p) => (p.noEq ? escape(p.key) : `${escape(p.key)}=${escape(p.value)}`)).join('&');
    let hash = r.parts.hash;
    if (r.hashParams.length) hash = `${r.hashPath}?${pairs(r.hashParams)}`;
    const q = pairs(r.params);
    const head = r.isUrl ? r.parts.base : '';
    return head + (q ? (r.isUrl ? '?' : '') + q : '') + (hash ? '#' + hash : '');
}

/** the whole input with every key and value percent-decoded (readable) */
export function rewriteDecoded(input: string, o: ParseOptions): string | null {
    const r = parseUrl(input, o);
    return r ? rebuild(r, readable) : null;
}

/** the whole input with every key and value re-encoded as UTF-8 (the canonical form) */
export function rewriteEncoded(input: string, o: ParseOptions): string | null {
    const r = parseUrl(input, o);
    return r ? rebuild(r, enc) : null;
}

/* ---------------- encoding and editing ---------------- */

const SAFE_CH = /^[A-Za-z0-9\-_.!~*'()]$/;
const MULTI_BYTE = new Set(['gbk', 'gb18030', 'big5', 'shift_jis', 'euc-jp', 'euc-kr']);
const charMaps = new Map<string, Map<string, number[]>>();

/** char -> bytes for a legacy encoding, built once by decoding every one- and two-byte sequence */
function charMap(enc: string): Map<string, number[]> {
    const hit = charMaps.get(enc);
    if (hit) return hit;
    const m = new Map<string, number[]>();
    const d = decoderFor(enc, false);
    const ok = (s: string) => !!s && !s.includes('\uFFFD') && [...s].length === 1;
    if (d) {
        for (let b = 0x80; b <= 0xff; b++) {
            const s = d.decode(Uint8Array.of(b));
            if (ok(s) && !m.has(s)) m.set(s, [b]);
        }
        if (MULTI_BYTE.has(enc)) {
            for (let a = 0x81; a <= 0xfe; a++) {
                for (let b = 0x40; b <= 0xfe; b++) {
                    const s = d.decode(Uint8Array.of(a, b));
                    if (ok(s) && !m.has(s)) m.set(s, [a, b]);
                }
            }
        }
    }
    charMaps.set(enc, m);
    return m;
}

/** Percent-encodes `text` as bytes of `enc` (the same characters encodeURIComponent leaves alone stay as typed). */
export function encodeComponent(text: string, enc: string): { text: string; lossy: number } {
    const e = enc === 'auto' ? 'utf-8' : enc;
    const wide = e === 'utf-16le' || e === 'utf-16be';
    const utf8 = new TextEncoder();
    const pct = (bytes: number[]) => bytes.map((b) => '%' + b.toString(16).toUpperCase().padStart(2, '0')).join('');
    let out = '';
    let lossy = 0;
    for (const ch of text) {
        if (!wide && SAFE_CH.test(ch)) {
            out += ch;
            continue;
        }
        let bytes: number[] | undefined;
        if (e === 'utf-8') bytes = Array.from(utf8.encode(ch));
        else if (wide) {
            bytes = [];
            for (let i = 0; i < ch.length; i++) {
                const u = ch.charCodeAt(i);
                bytes.push(...(e === 'utf-16le' ? [u & 255, u >> 8] : [u >> 8, u & 255]));
            }
        } else if (ch.charCodeAt(0) < 0x80) bytes = [ch.charCodeAt(0)];
        else bytes = charMap(e).get(ch);
        if (!bytes) {
            lossy++;
            bytes = [0x3f];
        }
        out += pct(bytes);
    }
    return { text: out, lossy };
}

export type EditOp =
    | { type: 'edit'; index: number; key: string; value: string }
    | { type: 'delete'; index: number }
    | { type: 'add'; key: string; value: string };

/**
 * Edits, deletes or adds one query parameter and returns the new input text. Parameters that are not
 * touched keep their original text; written keys and values are encoded with the chosen encoding
 * (UTF-8 for "auto"). `lossy` counts characters the encoding cannot represent (written as "?").
 */
export function editParams(input: string, o: ParseOptions, op: EditOp): { text: string; lossy: number } | null {
    const r = parseUrl(input, o);
    if (!r) return null;
    const text = input.replace(/\s*[\r\n]+\s*/g, '').trim();
    let lossy = 0;
    const esc = (s: string) => {
        const e = encodeComponent(s, o.encoding);
        lossy += e.lossy;
        return e.text;
    };
    const pairs = r.parts.query === '' ? [] : r.parts.query.split('&').filter((p) => p !== '');

    if (op.type === 'edit') {
        const p = r.params[op.index - 1];
        if (!p) return null;
        const rk = op.key === p.key ? p.rawKey : esc(op.key);
        const rv = op.value === p.value ? p.rawValue : esc(op.value);
        const next = p.noEq && op.value === '' ? rk : `${rk}=${rv}`;
        if (next === pairs[op.index - 1]) return null;
        pairs[op.index - 1] = next;
    } else if (op.type === 'delete') {
        if (!r.params[op.index - 1]) return null;
        pairs.splice(op.index - 1, 1);
    } else {
        if (!op.key) return null;
        pairs.push(`${esc(op.key)}=${esc(op.value)}`);
    }

    const body = pairs.join('&');
    const tail = text.includes('#') ? '#' + r.parts.hash : '';
    let head = '';
    let q = '';
    if (r.isUrl) {
        head = r.parts.base;
        q = body ? '?' + body : '';
    } else {
        const lead = text.startsWith('?');
        q = body ? (lead ? '?' : '') + body : lead ? '?' : '';
    }
    return { text: head + q + tail, lossy };
}

/* ---------------- samples ---------------- */

export const URL_SAMPLES: { id: string; label: string; text: string; encoding?: string }[] = [
    {
        id: 'search',
        label: '搜索（UTF-8 中文）',
        text: 'https://cn.bing.com/search?q=%E9%94%A4%E5%AD%90%E5%9C%A8%E7%BA%BF%E5%B7%A5%E5%85%B7%E7%BD%91&domain=toolhelper.cn',
    },
    {
        id: 'gbk',
        label: 'GBK 编码',
        text: 'https://www.baidu.com/s?wd=%D6%D0%CE%C4%B1%E0%C2%EB&ie=gbk&rsv_bp=1',
        encoding: 'gbk',
    },
    {
        id: 'big5',
        label: 'Big5 繁体',
        text: 'https://example.tw/search?keyword=%C1%63%C5%E9%A4%A4%A4%E5&page=2',
        encoding: 'big5',
    },
    {
        id: 'multi',
        label: '重复键与数组',
        text: 'https://api.example.com/v2/orders?status=paid&status=shipped&tags[]=vip&tags[]=new&sort=-createdAt&page=1&pageSize=20&debug&utm_source=wechat&utm_medium=social',
    },
    {
        id: 'nested',
        label: '嵌套 URL 和 JSON',
        text: 'https://passport.example.com/login?redirect=https%3A%2F%2Fapp.example.com%2Fhome%3Ftab%3Dorders%26from%3Dsms&filter=%7B%22status%22%3A%5B%22paid%22%2C%22shipped%22%5D%2C%22minAmount%22%3A100%7D&lang=zh-CN#/welcome?step=2&ref=banner',
    },
    {
        id: 'query',
        label: '只有参数串',
        text: 'userId=10086&nickname=%E6%9E%97%E5%B0%8F%E5%A4%8F&vip=true&from=app+store',
    },
];
