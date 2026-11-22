export type ParseResult =
    | { state: 'empty' }
    | { state: 'ok'; value: unknown }
    | { state: 'error'; message: string; line?: number; col?: number; pos?: number };

export function parseJson(text: string): ParseResult {
    if (!text.trim()) return { state: 'empty' };
    try {
        return { state: 'ok', value: JSON.parse(text) };
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        let pos: number | undefined;
        let line: number | undefined;
        let col: number | undefined;
        const mPos = /position (\d+)/i.exec(message);
        const mLine = /line (\d+) column (\d+)/i.exec(message);
        if (mPos) pos = Number(mPos[1]);
        if (mLine) {
            line = Number(mLine[1]);
            col = Number(mLine[2]);
        }
        if (pos === undefined && line !== undefined && col !== undefined) {
            const lines = text.split('\n');
            pos = lines.slice(0, line - 1).reduce((s, l) => s + l.length + 1, 0) + (col - 1);
        }
        if (pos !== undefined && line === undefined) {
            const before = text.slice(0, pos).split('\n');
            line = before.length;
            col = before[before.length - 1].length + 1;
        }
        if (pos === undefined && /unexpected end/i.test(message)) {
            pos = text.length;
            const before = text.split('\n');
            line = before.length;
            col = before[before.length - 1].length + 1;
        }
        return { state: 'error', message, line, col, pos };
    }
}

export function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
