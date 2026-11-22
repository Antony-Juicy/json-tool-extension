/** Field-level editing on the lossless AST: locate, change, rename, delete, and replace in fields. */
import { J, SortOrder } from './jsonAst';
import { Step } from './jsonpath';
import { escapeRe } from '../components/SearchBar';

export function getAt(root: J, path: Step[]): J | undefined {
    let n: J | undefined = root;
    for (const k of path) {
        if (!n) return undefined;
        if (n.t === 'obj' && typeof k === 'string') n = n.entries.find((e) => e[0] === k)?.[1];
        else if (n.t === 'arr' && typeof k === 'number') n = n.items[k];
        else return undefined;
    }
    return n;
}

export interface Change {
    /** replacement value */
    node?: J;
    /** new key name (object members only) */
    key?: string;
    remove?: boolean;
}

/** Returns a new root with the change applied; untouched subtrees are shared. */
export function editAt(root: J, path: Step[], c: Change): J {
    if (!path.length) {
        if (c.remove) throw new Error('不能删除根节点');
        return c.node ?? root;
    }
    const go = (n: J, i: number): J => {
        const k = path[i];
        const last = i === path.length - 1;
        if (n.t === 'obj' && typeof k === 'string') {
            const idx = n.entries.findIndex((e) => e[0] === k);
            if (idx < 0) throw new Error('字段不存在，可能输入已经变了');
            const entries = n.entries.slice();
            if (!last) entries[idx] = [k, go(entries[idx][1], i + 1)];
            else if (c.remove) entries.splice(idx, 1);
            else {
                const nk = c.key ?? k;
                if (nk !== k && entries.some((e, j) => j !== idx && e[0] === nk)) throw new Error(`已经有名为「${nk}」的键`);
                entries[idx] = [nk, c.node ?? entries[idx][1]];
            }
            return { t: 'obj', entries };
        }
        if (n.t === 'arr' && typeof k === 'number') {
            if (k < 0 || k >= n.items.length) throw new Error('数组下标越界，可能输入已经变了');
            const items = n.items.slice();
            if (!last) items[k] = go(items[k], i + 1);
            else if (c.remove) items.splice(k, 1);
            else items[k] = c.node ?? items[k];
            return { t: 'arr', items };
        }
        throw new Error('字段不存在，可能输入已经变了');
    };
    return go(root, 0);
}

/* ---------------- line → path for the formatted code view ---------------- */

export interface LineInfo {
    path: Step[];
    /** closing bracket line of a container */
    close?: boolean;
}

const cmp = (a: [string, J], b: [string, J]) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

/** One entry per line of stringify(root, indent, order) when indent is non-empty. */
export function lineMap(root: J, order: SortOrder): LineInfo[] {
    const out: LineInfo[] = [];
    const w = (n: J, path: Step[]) => {
        if (n.t === 'obj' && n.entries.length) {
            out.push({ path });
            let es = n.entries;
            if (order !== 'none') {
                es = [...es].sort(cmp);
                if (order === 'desc') es.reverse();
            }
            for (const [k, v] of es) w(v, [...path, k]);
            out.push({ path, close: true });
        } else if (n.t === 'arr' && n.items.length) {
            out.push({ path });
            n.items.forEach((v, i) => w(v, [...path, i]));
            out.push({ path, close: true });
        } else out.push({ path });
    };
    w(root, []);
    return out;
}

/* ---------------- replace inside fields ---------------- */

export type ReplaceScope = 'value' | 'key' | 'both';

export type ReplaceResult = { ok: true; node: J; count: number; fields: number } | { ok: false; message: string };

export type ReplaceOneResult = { ok: true; node: J } | { ok: false; message: string };

/**
 * Replace one occurrence: the occurrence-th match (0-based) inside the key or the string value at
 * `path`. Used by the 替换 button next to the current match.
 */
export function replaceAtMatch(
    root: J,
    path: Step[],
    part: 'key' | 'value',
    occurrence: number,
    query: string,
    replacement: string,
    opts: { regex: boolean; caseSens: boolean },
): ReplaceOneResult {
    if (!query) return { ok: false, message: '先输入要查找的内容' };
    let re: RegExp;
    try {
        re = new RegExp(opts.regex ? query : escapeRe(query), opts.caseSens ? 'g' : 'gi');
    } catch {
        return { ok: false, message: '正则无效' };
    }
    if (opts.regex && new RegExp(re.source, re.flags.replace('g', '')).test('')) {
        return { ok: false, message: '这个正则会匹配空字符串，无法替换' };
    }
    const node = getAt(root, path);
    if (!node) return { ok: false, message: '字段已经不存在' };
    let text: string;
    if (part === 'key') {
        const k = path[path.length - 1];
        if (typeof k !== 'string') return { ok: false, message: '这里没有键名' };
        text = k;
    } else {
        if (node.t !== 'str') return { ok: false, message: '数字、布尔值和 null 里的内容请用 ✎ 编辑' };
        text = node.v;
    }
    const all: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
        if (!m[0].length) {
            re.lastIndex++;
            continue;
        }
        all.push(m);
    }
    if (!all.length) return { ok: false, message: '这一处含有转义字符，请用 ✎ 编辑这个字段' };
    const hit = all[Math.min(occurrence, all.length - 1)];
    const one = new RegExp(re.source, re.flags.replace('g', ''));
    const rep = opts.regex ? hit[0].replace(one, replacement) : replacement;
    const next = text.slice(0, hit.index) + rep + text.slice(hit.index + hit[0].length);
    try {
        return {
            ok: true,
            node: part === 'key' ? editAt(root, path, { key: next }) : editAt(root, path, { node: { t: 'str', v: next } }),
        };
    } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
}

export function replaceInFields(
    root: J,
    query: string,
    replacement: string,
    opts: { regex: boolean; caseSens: boolean; scope: ReplaceScope },
): ReplaceResult {
    if (!query) return { ok: false, message: '先输入要查找的内容' };
    let re: RegExp;
    try {
        re = new RegExp(opts.regex ? query : escapeRe(query), opts.caseSens ? 'g' : 'gi');
    } catch {
        return { ok: false, message: '正则无效' };
    }
    if (opts.regex && new RegExp(re.source, re.flags.replace('g', '')).test('')) {
        return { ok: false, message: '这个正则会匹配空字符串，无法替换' };
    }
    let count = 0;
    let fields = 0;
    const rep = (s: string): string => {
        re.lastIndex = 0;
        const m = s.match(re);
        if (!m) return s;
        count += m.length;
        fields++;
        re.lastIndex = 0;
        return opts.regex ? s.replace(re, replacement) : s.replace(re, () => replacement);
    };
    const doKeys = opts.scope !== 'value';
    const doVals = opts.scope !== 'key';
    const walk = (n: J): J => {
        if (n.t === 'str') return doVals ? { t: 'str', v: rep(n.v) } : n;
        if (n.t === 'arr') return { t: 'arr', items: n.items.map(walk) };
        if (n.t === 'obj') {
            const entries = n.entries.map(([k, v]) => [doKeys ? rep(k) : k, walk(v)] as [string, J]);
            if (doKeys) {
                const seen = new Set<string>();
                for (const [k] of entries) {
                    if (seen.has(k)) throw new Error(`替换后同一个对象里会出现重复的键「${k}」`);
                    seen.add(k);
                }
            }
            return { t: 'obj', entries };
        }
        return n;
    };
    try {
        const node = walk(root);
        return { ok: true, node, count, fields };
    } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
}
