import { analyze, Analysis, J, JsonSyntaxError, parse, SortOrder, stringify } from './jsonAst';
import { Fix, repairJson, RepairResult } from './repair';

export type Mode = 'format' | 'compress' | 'escape' | 'unescape';
export type Indent = '2' | '4' | 'tab';

export interface TransformOptions {
    mode: Mode;
    order: SortOrder;
    indent: Indent;
    autoFix: boolean;
}

export interface SyntaxIssue {
    message: string;
    pos: number;
    line: number;
    col: number;
}

export interface RepairInfo {
    fixes: Fix[];
    /** the strict parser's error on the original input */
    error: SyntaxIssue;
}

export type OkResult = {
    kind: 'ok';
    output: string;
    json: boolean;
    notes: string[];
    escapedHint: boolean;
    analysis?: Analysis;
    /** parsed document, present when the output is JSON */
    node?: J;
    indent?: string;
    order?: SortOrder;
    /** present when the input was invalid and this result comes from the automatic repair */
    repaired?: RepairInfo;
};
export type ErrorResult = {
    kind: 'error';
    message: string;
    pos: number;
    line: number;
    col: number;
    escapedHint: boolean;
    /** the input can be repaired automatically */
    repairable: boolean;
};
export type Result = { kind: 'empty' } | OkResult | ErrorResult;

type Parsed = { ok: true; node: J } | { ok: false; message: string; pos: number };

const INDENT: Record<Indent, string> = { '2': '  ', '4': '    ', tab: '\t' };
export const indentText = (i: Indent) => INDENT[i];

export function tryParse(text: string): Parsed {
    try {
        return { ok: true, node: parse(text) };
    } catch (e) {
        if (e instanceof JsonSyntaxError) return { ok: false, message: e.message, pos: e.pos };
        if (e instanceof RangeError) return { ok: false, message: '嵌套层级过深，无法解析', pos: 0 };
        return { ok: false, message: e instanceof Error ? e.message : String(e), pos: 0 };
    }
}

export function lineCol(text: string, pos: number): { line: number; col: number } {
    let line = 1;
    let last = -1;
    const end = Math.min(pos, text.length);
    for (let i = 0; i < end; i++) {
        if (text.charCodeAt(i) === 10) {
            line++;
            last = i;
        }
    }
    return { line, col: end - last };
}

const isContainer = (n: J) => n.t === 'obj' || n.t === 'arr';

function isJsonContainerText(s: string): boolean {
    const t = s.trim();
    if (!(t.startsWith('{') || t.startsWith('['))) return false;
    const p = tryParse(t);
    return p.ok && isContainer(p.node);
}

function asStringLiteral(x: string): string | null {
    try {
        const v: unknown = JSON.parse(x);
        return typeof v === 'string' ? v : null;
    } catch {
        return null;
    }
}

function lenient(x: string): string {
    return x.replace(/\\(u[0-9a-fA-F]{4}|["\\/bfnrt])/g, (_m, g: string) => {
        if (g[0] === 'u') return String.fromCharCode(parseInt(g.slice(1), 16));
        const map: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
        return map[g] ?? g;
    });
}

/** Removes one layer of escaping, or returns null when there is nothing to remove. */
function peel(x: string): string | null {
    const t = x.trim();
    if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
        const v = asStringLiteral(t);
        if (v !== null) return v;
    }
    if (/\\["\\/bfnrtu]/.test(t)) {
        const v = asStringLiteral('"' + t.replace(/\r?\n/g, '\\n') + '"');
        return v ?? lenient(t);
    }
    return null;
}

export function unescapeText(input: string): { value: string; layers: number } {
    let cur = input;
    let layers = 0;
    while (layers < 6) {
        const next = peel(cur);
        if (next === null || next === cur) break;
        cur = next;
        layers++;
        if (isJsonContainerText(cur)) break;
    }
    return { value: cur, layers };
}

function okJson(node: J, indent: string, order: SortOrder, notes: string[]): OkResult {
    const analysis = analyze(node);
    if (analysis.bigInts) notes.push(`含 ${analysis.bigInts} 个超出 JS 安全范围的大整数，已原样保留`);
    return {
        kind: 'ok',
        output: stringify(node, indent, order),
        json: true,
        notes,
        escapedHint: false,
        analysis,
        node,
        indent,
        order,
    };
}

function looksEscapedJson(node: J): boolean {
    return node.t === 'str' && isJsonContainerText(node.v);
}

export type NormalizeResult = { ok: true; text: string; note: string; fixed: number } | { ok: false };

/** Repairs broken JSON. Escaped JSON (\" everywhere) is unescaped first. */
export function repairInput(input: string): RepairResult {
    if (/\\"/.test(input)) {
        const u = unescapeText(input);
        if (u.layers) {
            const p = tryParse(u.value);
            const unesc: Fix = { pos: -1, detail: '去掉了转义（输入是被转义过的 JSON）' };
            if (p.ok && isContainer(p.node)) return { ok: true, text: u.value, fixes: [unesc] };
            const r = repairJson(u.value, false);
            if (r.ok) return { ok: true, text: r.text, fixes: [unesc, ...r.fixes] };
        }
    }
    return repairJson(input, true);
}

/** Rewrites the input itself: formatted or compacted. Unwraps escaped JSON and repairs broken JSON. */
export function normalizeInput(input: string, compact: boolean, indent: Indent, order: SortOrder): NormalizeResult {
    if (!input.trim()) return { ok: false };
    const ind = compact ? '' : INDENT[indent];
    const verb = compact ? '已压缩输入' : '已格式化输入';
    const p = tryParse(input);
    if (p.ok) {
        if (p.node.t === 'str' && isJsonContainerText(p.node.v)) {
            const inner = tryParse(p.node.v.trim());
            if (inner.ok)
                return { ok: true, text: stringify(inner.node, ind, order), note: `${verb}（已先反转义）`, fixed: 0 };
        }
        return { ok: true, text: stringify(p.node, ind, order), note: verb, fixed: 0 };
    }
    const u = unescapeText(input);
    if (u.layers) {
        const q = tryParse(u.value);
        if (q.ok && isContainer(q.node))
            return { ok: true, text: stringify(q.node, ind, order), note: `${verb}（已先反转义）`, fixed: 0 };
    }
    const r = repairInput(input);
    if (r.ok) {
        const q = tryParse(r.text);
        if (q.ok)
            return {
                ok: true,
                text: stringify(q.node, ind, order),
                note: `已修复 ${r.fixes.length} 处格式问题并${compact ? '压缩' : '格式化'}`,
                fixed: r.fixes.length,
            };
    }
    return { ok: false };
}

/** Pretty-prints valid object / array JSON (keeps key order and big numbers); null when not applicable. */
export function prettyIfJson(text: string, indent: Indent): string | null {
    if (!text.trim()) return null;
    const p = tryParse(text);
    if (!p.ok || !isContainer(p.node)) return null;
    const out = stringify(p.node, INDENT[indent], 'none');
    return out === text ? null : out;
}

export function transform(input: string, o: TransformOptions): Result {
    if (!input.trim()) return { kind: 'empty' };
    const ind = INDENT[o.indent];
    const notes: string[] = [];

    if (o.mode === 'escape') {
        const p = tryParse(input);
        if (p.ok) {
            notes.push('已先压缩为单行再转义');
            const compact = stringify(p.node, '', o.order);
            return { kind: 'ok', output: JSON.stringify(compact).slice(1, -1), json: false, notes, escapedHint: false };
        }
        notes.push('输入不是合法 JSON，已按原文转义');
        return { kind: 'ok', output: JSON.stringify(input).slice(1, -1), json: false, notes, escapedHint: false };
    }

    if (o.mode === 'unescape') {
        const direct = tryParse(input);
        if (direct.ok && isContainer(direct.node)) {
            notes.push('输入已经是合法 JSON，无需反转义，已直接格式化');
            return okJson(direct.node, ind, o.order, notes);
        }
        const u = unescapeText(input);
        if (!u.layers) {
            notes.push('输入中没有需要反转义的内容');
            return { kind: 'ok', output: input, json: false, notes, escapedHint: false };
        }
        const p = tryParse(u.value);
        if (p.ok && isContainer(p.node)) {
            notes.push(u.layers > 1 ? `已去除 ${u.layers} 层转义，结果是合法 JSON，已格式化` : '反转义后是合法 JSON，已格式化');
            return okJson(p.node, ind, o.order, notes);
        }
        notes.push(u.layers > 1 ? `已去除 ${u.layers} 层转义，结果不是 JSON，按纯文本展示` : '已反转义，结果不是 JSON，按纯文本展示');
        return { kind: 'ok', output: u.value, json: false, notes, escapedHint: false };
    }

    const p = tryParse(input);
    if (!p.ok) {
        const { line, col } = lineCol(input, p.pos);
        const error: SyntaxIssue = { message: p.message, pos: p.pos, line, col };
        const rep = repairInput(input);
        const q = rep.ok ? tryParse(rep.text) : null;
        if (o.autoFix && rep.ok && q && q.ok) {
            const r = okJson(q.node, o.mode === 'format' ? ind : '', o.order, notes);
            r.repaired = { fixes: rep.fixes, error };
            return r;
        }
        return { kind: 'error', ...error, escapedHint: /\\"/.test(input), repairable: !!(rep.ok && q && q.ok) };
    }
    const r = okJson(p.node, o.mode === 'format' ? ind : '', o.order, notes);
    r.escapedHint = looksEscapedJson(p.node);
    return r;
}
