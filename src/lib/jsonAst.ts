/**
 * A small JSON parser that keeps number literals as written (no precision loss for big IDs),
 * keeps key order exactly as in the source, and reports errors in Chinese with an exact position.
 */
export type J =
    | { t: 'obj'; entries: [string, J][] }
    | { t: 'arr'; items: J[] }
    | { t: 'str'; v: string }
    | { t: 'num'; raw: string }
    | { t: 'bool'; v: boolean }
    | { t: 'null' };

export type SortOrder = 'none' | 'asc' | 'desc';

export class JsonSyntaxError extends Error {
    pos: number;
    constructor(message: string, pos: number) {
        super(message);
        this.pos = pos;
    }
}

const NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const ESC: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };

export function parse(src: string): J {
    let i = src.charCodeAt(0) === 0xfeff ? 1 : 0;
    const n = src.length;
    const err = (msg: string, at = i) => new JsonSyntaxError(msg, at);
    const show = () => {
        const c = src[i];
        if (c === undefined) return '输入结束';
        if (c === '\n' || c === '\r') return '换行';
        return `“${c}”`;
    };
    const ws = () => {
        while (i < n) {
            const c = src.charCodeAt(i);
            if (c === 32 || c === 9 || c === 10 || c === 13) i++;
            else break;
        }
    };

    const str = (): string => {
        const begin = i;
        i++;
        let out = '';
        let start = i;
        while (i < n) {
            const c = src.charCodeAt(i);
            if (c === 34) {
                out += src.slice(start, i);
                i++;
                return out;
            }
            if (c === 92) {
                out += src.slice(start, i);
                const e = src[i + 1];
                if (e === 'u') {
                    const hex = src.slice(i + 2, i + 6);
                    if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw err('无效的 \\u 转义，应为 4 位十六进制数');
                    out += String.fromCharCode(parseInt(hex, 16));
                    i += 6;
                } else if (e !== undefined && ESC[e] !== undefined) {
                    out += ESC[e];
                    i += 2;
                } else {
                    throw err(`无效的转义序列 \\${e ?? ''}`);
                }
                start = i;
                continue;
            }
            if (c < 32) throw err(c === 10 ? '字符串中有未转义的换行符' : '字符串中有未转义的控制字符');
            i++;
        }
        throw err('字符串没有结束，缺少右双引号', begin);
    };

    const num = (): J => {
        NUM.lastIndex = i;
        const m = NUM.exec(src);
        if (!m || !m[0] || m[0] === '-') throw err('数字格式无效');
        i += m[0].length;
        return { t: 'num', raw: m[0] };
    };

    const value = (): J => {
        ws();
        if (i >= n) throw err('意外的输入结束，此处应为一个值');
        const c = src[i];
        if (c === '{') return obj();
        if (c === '[') return arr();
        if (c === '"') return { t: 'str', v: str() };
        if (c === '-' || (c >= '0' && c <= '9')) return num();
        if (src.startsWith('true', i)) {
            i += 4;
            return { t: 'bool', v: true };
        }
        if (src.startsWith('false', i)) {
            i += 5;
            return { t: 'bool', v: false };
        }
        if (src.startsWith('null', i)) {
            i += 4;
            return { t: 'null' };
        }
        if (c === "'") throw err('JSON 字符串必须使用双引号，不能用单引号');
        if (c === '/') throw err('JSON 不支持注释');
        for (const w of ['undefined', 'NaN', 'Infinity']) {
            if (src.startsWith(w, i)) throw err(`JSON 不支持 ${w}`);
        }
        throw err(`此处应为一个值，实际是 ${show()}`);
    };

    const obj = (): J => {
        i++;
        const entries: [string, J][] = [];
        ws();
        if (src[i] === '}') {
            i++;
            return { t: 'obj', entries };
        }
        for (;;) {
            ws();
            if (i >= n) throw err('意外的输入结束，对象没有用 } 闭合');
            if (src[i] !== '"') {
                if (src[i] === "'") throw err('键名必须使用双引号，不能用单引号');
                if (/[A-Za-z_$]/.test(src[i])) throw err('键名必须用双引号包起来');
                throw err(`此处应为键名（双引号字符串），实际是 ${show()}`);
            }
            const k = str();
            ws();
            if (src[i] !== ':') throw err(i >= n ? '意外的输入结束，键名后缺少冒号' : `键名后缺少冒号，实际是 ${show()}`);
            i++;
            entries.push([k, value()]);
            ws();
            if (src[i] === ',') {
                const comma = i;
                i++;
                ws();
                if (src[i] === '}') throw err('对象最后一项后面多了一个逗号', comma);
                continue;
            }
            if (src[i] === '}') {
                i++;
                return { t: 'obj', entries };
            }
            throw err(i >= n ? '意外的输入结束，对象没有用 } 闭合' : `缺少逗号，或对象没有用 } 闭合，实际是 ${show()}`);
        }
    };

    const arr = (): J => {
        i++;
        const items: J[] = [];
        ws();
        if (src[i] === ']') {
            i++;
            return { t: 'arr', items };
        }
        for (;;) {
            items.push(value());
            ws();
            if (src[i] === ',') {
                const comma = i;
                i++;
                ws();
                if (src[i] === ']') throw err('数组最后一项后面多了一个逗号', comma);
                continue;
            }
            if (src[i] === ']') {
                i++;
                return { t: 'arr', items };
            }
            throw err(i >= n ? '意外的输入结束，数组没有用 ] 闭合' : `缺少逗号，或数组没有用 ] 闭合，实际是 ${show()}`);
        }
    };

    const root = value();
    ws();
    if (i < n) throw err(`JSON 结束后还有多余内容：${show()}`);
    return root;
}

export function stringify(node: J, indent: string, order: SortOrder): string {
    const out: string[] = [];
    const nl = indent ? '\n' : '';
    const colon = indent ? ': ' : ':';
    const cmp = (a: [string, J], b: [string, J]) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    const w = (x: J, pad: string): void => {
        switch (x.t) {
            case 'str':
                out.push(JSON.stringify(x.v));
                return;
            case 'num':
                out.push(x.raw);
                return;
            case 'bool':
                out.push(x.v ? 'true' : 'false');
                return;
            case 'null':
                out.push('null');
                return;
            case 'arr': {
                if (!x.items.length) {
                    out.push('[]');
                    return;
                }
                const inner = pad + indent;
                out.push('[' + nl);
                x.items.forEach((it, idx) => {
                    if (idx) out.push(',' + nl);
                    out.push(inner);
                    w(it, inner);
                });
                out.push(nl + pad + ']');
                return;
            }
            case 'obj': {
                if (!x.entries.length) {
                    out.push('{}');
                    return;
                }
                let es = x.entries;
                if (order !== 'none') {
                    es = [...es].sort(cmp);
                    if (order === 'desc') es.reverse();
                }
                const inner = pad + indent;
                out.push('{' + nl);
                es.forEach(([k, v], idx) => {
                    if (idx) out.push(',' + nl);
                    out.push(inner + JSON.stringify(k) + colon);
                    w(v, inner);
                });
                out.push(nl + pad + '}');
                return;
            }
        }
    };
    w(node, '');
    return out.join('');
}

export interface Analysis {
    keys: number;
    depth: number;
    bigInts: number;
}

export function analyze(node: J): Analysis {
    let keys = 0;
    let depth = 0;
    let bigInts = 0;
    const stack: [J, number][] = [[node, 0]];
    while (stack.length) {
        const top = stack.pop();
        if (!top) break;
        const [x, d] = top;
        if (x.t === 'obj') {
            depth = Math.max(depth, d + 1);
            keys += x.entries.length;
            for (const [, v] of x.entries) stack.push([v, d + 1]);
        } else if (x.t === 'arr') {
            depth = Math.max(depth, d + 1);
            for (const v of x.items) stack.push([v, d + 1]);
        } else if (x.t === 'num' && /^-?\d+$/.test(x.raw) && !Number.isSafeInteger(Number(x.raw))) {
            bigInts++;
        }
    }
    return { keys, depth, bigInts };
}
