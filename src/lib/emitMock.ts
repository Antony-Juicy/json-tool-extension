import { Named, NumberNode, StringNode, TNode } from './model';

function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const CN_NAMES = ['林小夏', '陈一鸣', '周若溪', '王子豪', '李思远', '赵可欣', '孙浩然', '吴雨桐', '许安然', '郑书阳'];
const EN_NAMES = ['Alex Chen', 'Mia Wang', 'Leo Zhang', 'Emma Liu', 'Noah Li', 'Ava Zhou', 'Ethan Wu', 'Lily Sun'];
const HANDLES = ['xiaxia', 'yiming', 'ruoxi', 'zihao', 'siyuan', 'kexin', 'haoran', 'yutong'];
const BASE_TIME = Date.UTC(2026, 10, 21, 8, 0, 0);

export interface MockOptions {
    count: number;
    seed: number;
    format: 'ts' | 'json';
}

export function emitMock(named: Named, o: MockOptions): string {
    const rnd = mulberry32(o.seed);
    const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
    const int = (lo: number, hi: number) => Math.floor(lo + rnd() * (hi - lo + 1));
    const hex = (len: number) => Array.from({ length: len }, () => Math.floor(rnd() * 16).toString(16)).join('');
    const mimic = (s: string) => s.replace(/\d/g, () => String(int(0, 9)));

    const genString = (n: StringNode, key: string, idx: number): string => {
        const k = key.toLowerCase();
        const nonAscii = n.samples.some((s) => /[^\x00-\x7F]/.test(s));
        switch (n.format) {
            case 'uuid':
                return `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(['8', '9', 'a', 'b'])}${hex(3)}-${hex(12)}`;
            case 'email':
                return `${pick(HANDLES)}${idx + 1}@example.com`;
            case 'url':
                if (/avatar|image|img|cover|icon|pic|photo|thumb/.test(k))
                    return `https://cdn.example.com/${k.replace(/[^a-z]/g, '') || 'img'}/${int(1000, 99999)}.png`;
                return `https://example.com/${k.replace(/[^a-z]/g, '') || 'page'}/${int(1, 9999)}`;
            case 'datetime':
                return new Date(BASE_TIME - int(0, 30 * 24 * 3600) * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
            case 'date':
                return new Date(BASE_TIME - int(0, 365) * 86400000).toISOString().slice(0, 10);
        }
        if (/(^|_)(nick)?name$|nickname|username|realname/.test(k) || k === 'name')
            return pick(nonAscii || !n.samples.length ? CN_NAMES : EN_NAMES);
        if (/phone|mobile|tel/.test(k)) return `1${pick(['38', '39', '58', '86', '77'])}${String(int(0, 99999999)).padStart(8, '0')}`;
        if (n.samples.length) {
            const s = pick(n.samples);
            return /\d/.test(s) && s.length < 48 ? mimic(s) : s;
        }
        return `${key}-${idx + 1}`;
    };

    const genNumber = (n: NumberNode): number => {
        let lo = n.min;
        let hi = n.max;
        if (lo === hi) {
            if (n.integer && Math.abs(lo) <= 1) return lo;
            hi = lo === 0 ? 10 : lo + Math.max(1, Math.abs(lo));
        }
        if (n.integer) return int(Math.ceil(lo), Math.floor(hi));
        return Math.round((lo + rnd() * (hi - lo)) * 100) / 100;
    };

    const gen = (n: TNode, key: string, idx: number, arrDepth: number): unknown => {
        switch (n.kind) {
            case 'string':
                return genString(n, key, idx);
            case 'number':
                return genNumber(n);
            case 'boolean':
                return rnd() < 0.5;
            case 'null':
            case 'unknown':
                return null;
            case 'array': {
                const len = arrDepth === 0 ? o.count : int(1, 3);
                return Array.from({ length: len }, (_, i) => gen(n.item, key, i, arrDepth + 1));
            }
            case 'object': {
                const obj: Record<string, unknown> = {};
                for (const f of n.fields) {
                    if (f.optional && rnd() > 0.7) continue;
                    obj[f.key] = gen(f.type, f.key, idx, arrDepth);
                }
                return obj;
            }
            case 'union': {
                const rest = n.types.filter((t) => t.kind !== 'null');
                if (rest.length !== n.types.length && (rnd() < 0.3 || !rest.length)) return null;
                return gen(pick(rest), key, idx, arrDepth);
            }
        }
    };

    const value = gen(named.root, named.rootName, 0, 0);
    const json = JSON.stringify(value, null, 2);
    if (o.format === 'json') return json + '\n';
    return `export const mock${named.rootName}: ${named.rootName} = ${json};\n`;
}
