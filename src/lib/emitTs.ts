import { hasNull, Named, propKey, stripNull, TNode } from './model';
import { declDoc, fieldDoc } from './jsdoc';

export interface TsOptions {
    declStyle: 'interface' | 'type';
    arrayStyle: 'bracket' | 'generic';
    nullStyle: 'union' | 'optional';
    exportKw: boolean;
    readonly: boolean;
    allOptional: boolean;
    jsdoc: boolean;
}

const nullLast = (types: TNode[]) =>
    [...types].sort((a, b) => Number(a.kind === 'null') - Number(b.kind === 'null'));

export function emitTs(named: Named, o: TsOptions): string {
    const { root, rootName, names, decls } = named;
    const ex = o.exportKw ? 'export ' : '';

    const tsType = (n: TNode): string => {
        switch (n.kind) {
            case 'string':
            case 'number':
            case 'boolean':
            case 'null':
            case 'unknown':
                return n.kind;
            case 'object':
                return names.get(n) ?? 'Record<string, unknown>';
            case 'array': {
                const inner = tsType(n.item);
                if (o.arrayStyle === 'generic') return `Array<${inner}>`;
                return n.item.kind === 'union' ? `(${inner})[]` : `${inner}[]`;
            }
            case 'union':
                return nullLast(n.types).map(tsType).join(' | ');
        }
    };

    const out: string[] = [];
    if (!(root.kind === 'object' && names.get(root) === rootName)) {
        out.push(`${ex}type ${rootName} = ${tsType(root)};`);
    }
    for (const d of decls) {
        const lines = d.node.fields.flatMap((f) => {
            let t = f.type;
            let opt = f.optional || o.allOptional;
            if (o.nullStyle === 'optional' && t.kind !== 'null' && hasNull(t)) {
                t = stripNull(t);
                opt = true;
            }
            const doc = o.jsdoc ? fieldDoc(f).map((l) => `  ${l}`) : [];
            return [...doc, `  ${o.readonly ? 'readonly ' : ''}${propKey(f.key)}${opt ? '?' : ''}: ${tsType(t)};`];
        });
        const body = lines.join('\n');
        const head = o.jsdoc ? declDoc(d).join('\n') + '\n' : '';
        out.push(
            head +
                (o.declStyle === 'interface'
                    ? `${ex}interface ${d.name} {\n${body}\n}`
                    : `${ex}type ${d.name} = {\n${body}\n};`),
        );
    }
    return out.join('\n\n') + '\n';
}
