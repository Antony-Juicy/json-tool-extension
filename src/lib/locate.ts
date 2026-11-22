import { Step } from './jsonpath';

export interface Loc {
    /** start / end of the value */
    start: number;
    end: number;
    /** start / end of the key text including its quotes, when the target is an object member */
    keyStart?: number;
    keyEnd?: number;
}

/**
 * Finds a node of a strictly valid JSON text by its path, without building a tree.
 * Returns null when the text does not contain that path.
 */
export function locate(text: string, path: Step[]): Loc | null {
    const n = text.length;
    let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

    const ws = () => {
        while (i < n) {
            const c = text.charCodeAt(i);
            if (c === 32 || c === 9 || c === 10 || c === 13) i++;
            else break;
        }
    };
    const readString = (): string | null => {
        const s = i;
        if (text[i] !== '"') return null;
        i++;
        while (i < n) {
            const c = text[i];
            if (c === '\\') i += 2;
            else if (c === '"') {
                i++;
                try {
                    return JSON.parse(text.slice(s, i)) as string;
                } catch {
                    return null;
                }
            } else i++;
        }
        return null;
    };
    const skipValue = (): boolean => {
        ws();
        const c = text[i];
        if (c === undefined) return false;
        if (c === '"') return readString() !== null;
        if (c === '{' || c === '[') {
            let depth = 0;
            while (i < n) {
                const ch = text[i];
                if (ch === '"') {
                    if (readString() === null) return false;
                    continue;
                }
                if (ch === '{' || ch === '[') depth++;
                else if (ch === '}' || ch === ']') {
                    depth--;
                    if (depth === 0) {
                        i++;
                        return true;
                    }
                }
                i++;
            }
            return false;
        }
        // number / true / false / null
        while (i < n && !/[\s,\]}]/.test(text[i])) i++;
        return true;
    };

    ws();
    let pos = i;
    let keyStart: number | undefined;
    let keyEnd: number | undefined;

    for (const seg of path) {
        i = pos;
        keyStart = undefined;
        keyEnd = undefined;
        if (typeof seg === 'string') {
            if (text[i] !== '{') return null;
            i++;
            let found = false;
            for (;;) {
                ws();
                if (text[i] === '}' || i >= n) return null;
                const ks = i;
                const key = readString();
                if (key === null) return null;
                const ke = i;
                ws();
                if (text[i] !== ':') return null;
                i++;
                ws();
                if (key === seg) {
                    pos = i;
                    keyStart = ks;
                    keyEnd = ke;
                    found = true;
                    break;
                }
                if (!skipValue()) return null;
                ws();
                if (text[i] === ',') i++;
            }
            if (!found) return null;
        } else {
            if (text[i] !== '[') return null;
            i++;
            let idx = 0;
            for (;;) {
                ws();
                if (text[i] === ']' || i >= n) return null;
                if (idx === seg) {
                    pos = i;
                    break;
                }
                if (!skipValue()) return null;
                ws();
                if (text[i] === ',') i++;
                idx++;
            }
        }
    }

    i = pos;
    if (!skipValue()) return null;
    return { start: pos, end: i, keyStart, keyEnd };
}
