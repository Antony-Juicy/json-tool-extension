import { Decl, Field, hasNull, stripNull, StrFormat, TNode } from './model';

const FORMAT_LABEL: Record<StrFormat, string> = {
    uuid: 'UUID',
    datetime: 'ISO 8601 日期时间',
    date: '日期（YYYY-MM-DD）',
    email: '邮箱地址',
    url: 'URL',
};

const MAX_EXAMPLE = 72;

const safe = (s: string) => s.replace(/\*\//g, '*\\/');

function clip(s: string): string {
    return s.length > MAX_EXAMPLE ? s.slice(0, MAX_EXAMPLE - 1) + '…' : s;
}

function primitiveExample(t: TNode): string | null {
    if (t.kind === 'string' && t.samples.length) return clip(JSON.stringify(t.samples[0]));
    if (t.kind === 'number') return String(t.min);
    return null;
}

function example(t: TNode): string | null {
    const base = stripNull(t);
    if (base.kind === 'array') {
        const item = stripNull(base.item);
        if (item.kind === 'string' && item.samples.length) {
            return clip(`[${item.samples.slice(0, 3).map((s) => JSON.stringify(s)).join(', ')}]`);
        }
        if (item.kind === 'number') {
            const vals = item.min === item.max ? [item.min] : [item.min, item.max];
            return `[${vals.join(', ')}]`;
        }
        return null;
    }
    if (base.kind === 'union') {
        for (const x of base.types) {
            const e = primitiveExample(x);
            if (e) return e;
        }
        return null;
    }
    return primitiveExample(base);
}

function describe(f: Field): string[] {
    const notes: string[] = [];
    const base = stripNull(f.type);
    if (base.kind === 'string' && base.format) notes.push(FORMAT_LABEL[base.format]);
    if (base.kind === 'number') {
        const kind = base.integer ? '整数' : '数值';
        notes.push(base.min === base.max ? kind : `${kind}，样本范围 ${base.min} ~ ${base.max}`);
    }
    if (base.kind === 'array' && base.item.kind === 'unknown') notes.push('样本中为空数组，元素类型未知');
    if (f.type.kind === 'null') notes.push('样本中始终为 null，实际类型待确认');
    else if (hasNull(f.type)) notes.push('可能为 null');
    if (f.optional) notes.push('部分样本中缺失此字段');
    return notes;
}

/** JSDoc lines (without indentation) for a field, or [] when there is nothing worth saying. */
export function fieldDoc(f: Field): string[] {
    const notes = describe(f);
    const ex = example(f.type);
    const body: string[] = [];
    if (notes.length) body.push(notes.join('；'));
    if (ex) body.push(`@example ${ex}`);
    if (!body.length) return [];
    if (body.length === 1) return [`/** ${safe(body[0])} */`];
    return ['/**', ...body.map((l) => ` * ${safe(l)}`), ' */'];
}

export function declDoc(d: Decl): string[] {
    if (!d.path) return ['/** 根对象 */'];
    return [`/** JSON 路径：${safe(d.path)} */`];
}
