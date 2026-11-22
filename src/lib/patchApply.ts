/**
 * Apply an external RFC 6902 JSON Patch (add / remove / replace / move / copy / test)
 * to the lossless AST, op by op, with a Chinese explanation for every failure.
 */
import { J, stringify } from './jsonAst';
import { equalJ } from './patch';

export type ExtOpName = 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
export const EXT_OPS: ExtOpName[] = ['add', 'remove', 'replace', 'move', 'copy', 'test'];

export interface ExtOp {
    op: ExtOpName;
    path: string;
    from?: string;
    value?: J;
}

export type ReadResult = { ok: true; ops: ExtOp[]; wrapped: boolean } | { ok: false; index: number; message: string };

type Obj = Extract<J, { t: 'obj' }>;
const field = (o: Obj, k: string) => o.entries.find((e) => e[0] === k)?.[1];

function checkPointer(p: string, name: string): string | null {
    if (p !== '' && !p.startsWith('/')) return `${name} 必须为空字符串或以 / 开头，实际是「${p}」`;
    if (/~(?![01])/.test(p)) return `${name} 里的 ~ 只能写成 ~0（表示 ~）或 ~1（表示 /）`;
    return null;
}

/** Validates the patch document's shape. A single op object is accepted and wrapped. */
export function readPatch(doc: J): ReadResult {
    let items: J[];
    let wrapped = false;
    if (doc.t === 'arr') items = doc.items;
    else if (doc.t === 'obj' && field(doc, 'op')) {
        items = [doc];
        wrapped = true;
    } else {
        return {
            ok: false,
            index: -1,
            message: 'JSON Patch 应该是一个操作数组，例如 [{ "op": "add", "path": "/a", "value": 1 }]',
        };
    }
    const ops: ExtOp[] = [];
    const fail = (index: number, message: string): ReadResult => ({ ok: false, index, message });
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.t !== 'obj') return fail(i, '每个操作都应该是一个对象');
        const op = field(it, 'op');
        if (!op) return fail(i, '缺少 op 字段');
        if (op.t !== 'str') return fail(i, 'op 应该是字符串');
        if (!EXT_OPS.includes(op.v as ExtOpName))
            return fail(i, `不支持的 op「${op.v}」，可选 add / remove / replace / move / copy / test`);
        const name = op.v as ExtOpName;
        const path = field(it, 'path');
        if (!path) return fail(i, '缺少 path 字段');
        if (path.t !== 'str') return fail(i, 'path 应该是字符串');
        const pe = checkPointer(path.v, 'path');
        if (pe) return fail(i, pe);
        const e: ExtOp = { op: name, path: path.v };
        if (name === 'add' || name === 'replace' || name === 'test') {
            const v = field(it, 'value');
            if (v === undefined) return fail(i, `${name} 操作缺少 value 字段`);
            e.value = v;
        }
        if (name === 'move' || name === 'copy') {
            const f = field(it, 'from');
            if (!f) return fail(i, `${name} 操作缺少 from 字段`);
            if (f.t !== 'str') return fail(i, 'from 应该是字符串');
            const fe = checkPointer(f.v, 'from');
            if (fe) return fail(i, fe);
            e.from = f.v;
        }
        ops.push(e);
    }
    return { ok: true, ops, wrapped };
}

/* ---------------- engine ---------------- */

function clone(n: J): J {
    if (n.t === 'obj') return { t: 'obj', entries: n.entries.map(([k, v]) => [k, clone(v)]) };
    if (n.t === 'arr') return { t: 'arr', items: n.items.map(clone) };
    return n;
}

const TYPE_NAME = { str: '字符串', num: '数字', bool: '布尔值', null: 'null', obj: '对象', arr: '数组' } as const;
const INDEX = /^(0|[1-9]\d*)$/;

function split(p: string): string[] {
    if (p === '') return [];
    return p
        .slice(1)
        .split('/')
        .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
}

const join = (segs: string[]) => (segs.length ? '/' + segs.map((s) => s.replace(/~/g, '~0').replace(/\//g, '~1')).join('/') : '（根）');

function preview(n: J): string {
    const s = stringify(n, '', 'none');
    return s.length > 60 ? s.slice(0, 59) + '…' : s;
}

class OpError extends Error {}

export type StepStatus = { s: 'ok' } | { s: 'off' } | { s: 'fail'; message: string } | { s: 'notrun' };

export interface Outcome {
    /** the document after every op that ran (before the failing op when one failed) */
    doc: J;
    steps: StepStatus[];
    failedAt: number;
}

export function runPatch(input: J, ops: ExtOp[], enabled: boolean[]): Outcome {
    let root = clone(input);

    const lookup = (segs: string[]): J | undefined => {
        let n: J | undefined = root;
        for (const s of segs) {
            if (!n) return undefined;
            if (n.t === 'obj') n = n.entries.find((e) => e[0] === s)?.[1];
            else if (n.t === 'arr') n = INDEX.test(s) ? n.items[Number(s)] : undefined;
            else return undefined;
        }
        return n;
    };

    const parentOf = (segs: string[]) => {
        const ps = segs.slice(0, -1);
        const parent = lookup(ps);
        if (!parent) throw new OpError(`父路径 ${join(ps)} 不存在`);
        if (parent.t !== 'obj' && parent.t !== 'arr')
            throw new OpError(`${join(ps)} 是${TYPE_NAME[parent.t]}，不能包含子节点`);
        return { parent, last: segs[segs.length - 1] };
    };

    const arrIndex = (last: string, len: number, allowEnd: boolean) => {
        if (allowEnd && last === '-') return len;
        if (!INDEX.test(last)) throw new OpError(`数组下标必须是非负整数${allowEnd ? '或 -' : ''}，实际是「${last}」`);
        const i = Number(last);
        if (allowEnd ? i > len : i >= len) throw new OpError(`数组下标 ${i} 越界，数组长度为 ${len}`);
        return i;
    };

    const add = (path: string, v: J) => {
        const segs = split(path);
        if (!segs.length) {
            root = v;
            return;
        }
        const { parent, last } = parentOf(segs);
        if (parent.t === 'obj') {
            const i = parent.entries.findIndex((e) => e[0] === last);
            if (i >= 0) parent.entries[i] = [last, v];
            else parent.entries.push([last, v]);
        } else if (parent.t === 'arr') {
            parent.items.splice(arrIndex(last, parent.items.length, true), 0, v);
        }
    };

    const remove = (path: string): J => {
        const segs = split(path);
        if (!segs.length) throw new OpError('不能删除根节点');
        const { parent, last } = parentOf(segs);
        if (parent.t === 'obj') {
            const i = parent.entries.findIndex((e) => e[0] === last);
            if (i < 0) throw new OpError(`键「${last}」不存在`);
            return parent.entries.splice(i, 1)[0][1];
        }
        if (parent.t === 'arr') return parent.items.splice(arrIndex(last, parent.items.length, false), 1)[0];
        throw new OpError('无法删除');
    };

    const replace = (path: string, v: J) => {
        const segs = split(path);
        if (!segs.length) {
            root = v;
            return;
        }
        const { parent, last } = parentOf(segs);
        if (parent.t === 'obj') {
            const i = parent.entries.findIndex((e) => e[0] === last);
            if (i < 0) throw new OpError(`路径 ${path} 不存在，replace 只能替换已有的值（新建请用 add）`);
            parent.entries[i] = [last, v];
        } else if (parent.t === 'arr') {
            parent.items[arrIndex(last, parent.items.length, false)] = v;
        }
    };

    const valueAt = (path: string, role: string): J => {
        const v = lookup(split(path));
        if (v === undefined) throw new OpError(`${role} ${path || '（根）'} 不存在`);
        return v;
    };

    const steps: StepStatus[] = ops.map(() => ({ s: 'notrun' }));
    let failedAt = -1;
    for (let k = 0; k < ops.length; k++) {
        if (enabled[k] === false) {
            steps[k] = { s: 'off' };
            continue;
        }
        const o = ops[k];
        const snapshot = root;
        try {
            root = clone(root);
            switch (o.op) {
                case 'add':
                    add(o.path, clone(o.value ?? { t: 'null' }));
                    break;
                case 'remove':
                    remove(o.path);
                    break;
                case 'replace':
                    replace(o.path, clone(o.value ?? { t: 'null' }));
                    break;
                case 'move': {
                    const from = o.from ?? '';
                    if (from === o.path) break;
                    if (o.path.startsWith(from + '/') || from === '')
                        throw new OpError('不能把节点移动到它自己的子节点里');
                    valueAt(from, 'from');
                    add(o.path, remove(from));
                    break;
                }
                case 'copy':
                    add(o.path, clone(valueAt(o.from ?? '', 'from')));
                    break;
                case 'test': {
                    const actual = lookup(split(o.path));
                    if (actual === undefined) throw new OpError(`test 未通过：路径 ${o.path || '（根）'} 不存在`);
                    if (!equalJ(actual, o.value ?? { t: 'null' }))
                        throw new OpError(
                            `test 未通过：实际值是 ${preview(actual)}，期望 ${preview(o.value ?? { t: 'null' })}`,
                        );
                    break;
                }
            }
            steps[k] = { s: 'ok' };
        } catch (e) {
            root = snapshot;
            steps[k] = { s: 'fail', message: e instanceof Error ? e.message : String(e) };
            failedAt = k;
            break;
        }
    }
    return { doc: root, steps, failedAt };
}
