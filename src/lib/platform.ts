/**
 * Where settings are kept and how files are saved. Everything that depends on where the tool runs
 * lives here, so the rest of the app does not care.
 *
 *  - Chrome extension page: chrome.storage.local, plain browser download.
 *  - Normal browser tab (npm run dev): window.localStorage, plain browser download.
 */
interface ExtStorage {
    get: (key: string) => Promise<Record<string, unknown>>;
    set: (items: Record<string, unknown>) => Promise<void>;
    remove: (key: string) => Promise<void>;
}

function extStorage(): ExtStorage | null {
    const c = (globalThis as unknown as { chrome?: { runtime?: { id?: string }; storage?: { local?: ExtStorage } } }).chrome;
    return c?.runtime?.id && c.storage?.local ? c.storage.local : null;
}

export const isExtension = (): boolean => extStorage() !== null;

const k = (table: string, key: string) => `${table}:${key}`;

export async function readSettings(table: string, key: string): Promise<string | null> {
    const s = extStorage();
    if (s) {
        const r = await s.get(k(table, key));
        const v = r[k(table, key)];
        return typeof v === 'string' ? v : null;
    }
    try {
        return window.localStorage.getItem(k(table, key));
    } catch {
        return null;
    }
}

export async function writeSettings(table: string, key: string, value: string): Promise<void> {
    const s = extStorage();
    if (s) {
        await s.set({ [k(table, key)]: value });
        return;
    }
    window.localStorage.setItem(k(table, key), value);
}

export async function removeSettings(table: string, key: string): Promise<void> {
    const s = extStorage();
    if (s) {
        await s.remove(k(table, key));
        return;
    }
    window.localStorage.removeItem(k(table, key));
}

export async function downloadFile(name: string, blob: Blob): Promise<void> {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
