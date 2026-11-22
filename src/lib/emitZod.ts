import { Decl, Named, ObjectNode, propKey, TNode } from './model';

export function emitZod(named: Named): string {
    const { root, rootName, names, decls } = named;
    const schema = (n: string) => `${n}Schema`;

    const zt = (n: TNode): string => {
        switch (n.kind) {
            case 'string': {
                const f = n.format;
                if (f === 'email') return 'z.string().email()';
                if (f === 'url') return 'z.string().url()';
                if (f === 'uuid') return 'z.string().uuid()';
                if (f === 'datetime') return 'z.string().datetime({ offset: true })';
                if (f === 'date') return 'z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)';
                return 'z.string()';
            }
            case 'number':
                return n.integer ? 'z.number().int()' : 'z.number()';
            case 'boolean':
                return 'z.boolean()';
            case 'null':
                return 'z.null()';
            case 'unknown':
                return 'z.unknown()';
            case 'object': {
                const nm = names.get(n);
                return nm ? schema(nm) : 'z.record(z.string(), z.unknown())';
            }
            case 'array':
                return `z.array(${zt(n.item)})`;
            case 'union': {
                const rest = n.types.filter((t) => t.kind !== 'null');
                const nullable = rest.length !== n.types.length;
                const base = rest.length === 1 ? zt(rest[0]) : `z.union([${rest.map(zt).join(', ')}])`;
                return nullable ? `${base}.nullable()` : base;
            }
        }
    };

    // dependency-first ordering so every schema is declared before use
    const byName = new Map<string, Decl>(decls.map((d) => [d.name, d]));
    const deps = (n: TNode, acc: Set<string>) => {
        if (n.kind === 'object') {
            const nm = names.get(n);
            if (nm) acc.add(nm);
        } else if (n.kind === 'array') deps(n.item, acc);
        else if (n.kind === 'union') n.types.forEach((t) => deps(t, acc));
    };
    const ordered: Decl[] = [];
    const seen = new Set<string>();
    const visit = (d: Decl) => {
        if (seen.has(d.name)) return;
        seen.add(d.name);
        const acc = new Set<string>();
        (d.node as ObjectNode).fields.forEach((f) => deps(f.type, acc));
        acc.forEach((nm) => {
            const dep = byName.get(nm);
            if (dep) visit(dep);
        });
        ordered.push(d);
    };
    decls.forEach(visit);

    const out: string[] = [`import { z } from 'zod';`];
    for (const d of ordered) {
        const lines = d.node.fields.map(
            (f) => `  ${propKey(f.key)}: ${zt(f.type)}${f.optional ? '.optional()' : ''},`,
        );
        out.push(
            `export const ${schema(d.name)} = z.object({\n${lines.join('\n')}\n});\nexport type ${d.name} = z.infer<typeof ${schema(d.name)}>;`,
        );
    }
    if (!(root.kind === 'object' && names.get(root) === rootName)) {
        out.push(
            `export const ${schema(rootName)} = ${zt(root)};\nexport type ${rootName} = z.infer<typeof ${schema(rootName)}>;`,
        );
    }
    return out.join('\n\n') + '\n';
}
