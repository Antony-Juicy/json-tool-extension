import { infer, Named, nameTypes, ObjectNode, TNode } from './model';
import { J } from './jsonAst';

export type SchemaDraft = '2020-12' | '07';

export interface SchemaOptions {
    draft: SchemaDraft;
    /** additionalProperties: false on every object */
    strict: boolean;
    /** examples taken from the sample values */
    examples: boolean;
}

type R = Record<string, unknown>;

const FORMAT = { email: 'email', url: 'uri', uuid: 'uuid', datetime: 'date-time', date: 'date' } as const;
const MAX_EXAMPLES = 3;

export function schemaFromJ(node: J, o: SchemaOptions, title = 'Root'): string {
    const model = infer(toPlain(node));
    return emitSchema(nameTypes(model, title), o);
}

function toPlain(n: J): unknown {
    switch (n.t) {
        case 'obj': {
            const o: Record<string, unknown> = {};
            for (const [k, v] of n.entries) o[k] = toPlain(v);
            return o;
        }
        case 'arr':
            return n.items.map(toPlain);
        case 'str':
            return n.v;
        case 'num':
            return Number(n.raw);
        case 'bool':
            return n.v;
        case 'null':
            return null;
    }
}

export function emitSchema(named: Named, o: SchemaOptions): string {
    const defsKey = o.draft === '2020-12' ? '$defs' : 'definitions';
    const rootObj = named.root.kind === 'object' && named.names.get(named.root) === named.rootName ? named.root : null;
    const ref = (name: string): R => (rootObj && name === named.rootName ? { $ref: '#' } : { $ref: `#/${defsKey}/${name}` });

    const objectBody = (n: ObjectNode): R => {
        const props: R = {};
        const required: string[] = [];
        for (const f of n.fields) {
            props[f.key] = schema(f.type);
            if (!f.optional) required.push(f.key);
        }
        const s: R = { type: 'object', properties: props };
        if (required.length) s.required = required;
        if (o.strict) s.additionalProperties = false;
        return s;
    };

    const schema = (n: TNode): R => {
        switch (n.kind) {
            case 'string': {
                const s: R = { type: 'string' };
                if (n.format) s.format = FORMAT[n.format];
                if (o.examples && n.samples.length) s.examples = n.samples.slice(0, MAX_EXAMPLES);
                return s;
            }
            case 'number': {
                const s: R = { type: n.integer ? 'integer' : 'number' };
                if (o.examples) s.examples = n.min === n.max ? [n.min] : [n.min, n.max];
                return s;
            }
            case 'boolean':
                return { type: 'boolean' };
            case 'null':
                return { type: 'null' };
            case 'unknown':
                return {};
            case 'array':
                return n.item.kind === 'unknown' ? { type: 'array' } : { type: 'array', items: schema(n.item) };
            case 'object': {
                const name = named.names.get(n);
                return name ? ref(name) : objectBody(n);
            }
            case 'union': {
                const rest = n.types.filter((t) => t.kind !== 'null');
                const nullable = rest.length !== n.types.length;
                const parts = rest.map(schema);
                if (nullable && parts.length === 1) {
                    const p = parts[0];
                    if (typeof p.type === 'string') return { ...p, type: [p.type, 'null'] };
                    return { anyOf: [p, { type: 'null' }] };
                }
                // several plain types collapse to a type list: "type": ["string", "number"]
                if (parts.every((p) => typeof p.type === 'string' && Object.keys(p).length === 1)) {
                    const types = parts.map((p) => p.type as string);
                    if (nullable) types.push('null');
                    return { type: types };
                }
                return { anyOf: nullable ? [...parts, { type: 'null' }] : parts };
            }
        }
    };

    const root: R = {
        $schema:
            o.draft === '2020-12'
                ? 'https://json-schema.org/draft/2020-12/schema'
                : 'http://json-schema.org/draft-07/schema#',
        title: named.rootName,
    };
    Object.assign(root, rootObj ? objectBody(rootObj) : schema(named.root));

    const defs: R = {};
    for (const d of named.decls) {
        if (d.node === rootObj) continue;
        defs[d.name] = { ...(d.path ? { description: `JSON 路径：${d.path}` } : {}), ...objectBody(d.node) };
    }
    if (Object.keys(defs).length) root[defsKey] = defs;
    return JSON.stringify(root, null, 2) + '\n';
}
