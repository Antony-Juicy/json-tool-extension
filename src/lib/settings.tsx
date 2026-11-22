import { createContext, Dispatch, ReactNode, SetStateAction, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { readSettings, removeSettings, writeSettings } from './platform';
import { LoadingPill } from '../components/Toast';

/**
 * Per-user settings (indent, sort order, active tab, encodings, ...), kept as one JSON document in
 * chrome.storage.local (see platform.ts). Writes are debounced. The text typed into the tools is never saved.
 */
const TABLE = 'json-tool-settings';
const KEY = 'v1';
const SAVE_DELAY = 700;
const LOAD_TIMEOUT = 2500;

type Bag = Record<string, unknown>;

export type SaveState =
    | { kind: 'idle' }
    | { kind: 'saving' }
    | { kind: 'saved' }
    | { kind: 'error'; message: string }
    | { kind: 'reset'; previous: Bag };

interface Ctx {
    bag: Bag;
    set: (k: string, v: unknown) => void;
    status: SaveState;
    retry: () => void;
    reset: () => void;
    undoReset: () => void;
    dismiss: () => void;
    loadError: string | null;
}

const SettingsCtx = createContext<Ctx | null>(null);

const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'string' ? e : '未知错误');

export function SettingsProvider({ children }: { children: (epoch: number) => ReactNode }) {
    const bag = useRef<Bag>({});
    const dirty = useRef<Set<string>>(new Set());
    const [ready, setReady] = useState(false);
    const [epoch, setEpoch] = useState(0);
    const [status, setStatus] = useState<SaveState>({ kind: 'idle' });
    const [loadError, setLoadError] = useState<string | null>(null);
    const timer = useRef<number | undefined>(undefined);
    const prevRef = useRef<Bag | null>(null);

    useEffect(() => {
        let done = false;
        const t = window.setTimeout(() => {
            if (done) return;
            done = true;
            setReady(true);
        }, LOAD_TIMEOUT);
        readSettings(TABLE, KEY)
            .then((raw) => {
                if (done) return;
                if (raw) {
                    try {
                        const parsed: unknown = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) bag.current = parsed as Bag;
                    } catch {
                        /* corrupted settings: start from defaults */
                    }
                }
            })
            .catch((e: unknown) => {
                if (!done) setLoadError(errMsg(e));
            })
            .finally(() => {
                if (done) return;
                done = true;
                window.clearTimeout(t);
                setReady(true);
            });
        return () => window.clearTimeout(t);
    }, []);

    const flush = useCallback(async () => {
        window.clearTimeout(timer.current);
        setStatus({ kind: 'saving' });
        try {
            // Several tabs share one stored document: write back only the keys THIS tab changed, merged
            // into the latest stored value, so tabs never overwrite each other's choices.
            const keys = [...dirty.current];
            let base: Bag = {};
            try {
                const raw = await readSettings(TABLE, KEY);
                const parsed: unknown = raw ? JSON.parse(raw) : null;
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) base = parsed as Bag;
            } catch {
                /* unreadable stored value: fall back to this tab's own settings */
                base = {};
            }
            const merged: Bag = { ...base };
            for (const k of keys) merged[k] = bag.current[k];
            await writeSettings(TABLE, KEY, JSON.stringify(merged));
            dirty.current = new Set();
            setStatus({ kind: 'saved' });
        } catch (e) {
            setStatus({ kind: 'error', message: errMsg(e) });
        }
    }, []);

    const schedule = useCallback(() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void flush(), SAVE_DELAY);
    }, [flush]);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const set = useCallback(
        (k: string, v: unknown) => {
            if (JSON.stringify(bag.current[k]) === JSON.stringify(v)) return;
            bag.current = { ...bag.current, [k]: v };
            dirty.current.add(k);
            schedule();
        },
        [schedule],
    );

    const reset = useCallback(() => {
        window.clearTimeout(timer.current);
        const previous = bag.current;
        prevRef.current = previous;
        bag.current = {};
        dirty.current = new Set();
        setEpoch((n) => n + 1);
        setStatus({ kind: 'reset', previous });
        removeSettings(TABLE, KEY).catch((e: unknown) =>
            setStatus({ kind: 'error', message: errMsg(e) }),
        );
    }, []);

    const undoReset = useCallback(() => {
        const p = prevRef.current;
        if (!p) return;
        prevRef.current = null;
        bag.current = p;
        dirty.current = new Set(Object.keys(p));
        setEpoch((n) => n + 1);
        void flush();
    }, [flush]);

    const value = useMemo<Ctx>(
        () => ({
            bag: bag.current,
            set,
            status,
            retry: () => void flush(),
            reset,
            undoReset,
            dismiss: () => setStatus({ kind: 'idle' }),
            loadError,
        }),
        // bag.current is read at remount time (epoch) on purpose
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [set, status, flush, reset, undoReset, loadError, epoch],
    );

    if (!ready) return <LoadingPill text="正在加载" />;
    return <SettingsCtx.Provider value={value}>{children(epoch)}</SettingsCtx.Provider>;
}

export function useSettings(): Ctx | null {
    return useContext(SettingsCtx);
}

function readValue<T>(raw: unknown, def: T, allowed?: readonly T[]): T {
    if (raw === undefined || raw === null) return def;
    if (typeof def === 'object' && def !== null && !Array.isArray(def)) {
        if (typeof raw !== 'object' || Array.isArray(raw)) return def;
        const out: Bag = { ...(def as Bag) };
        for (const k of Object.keys(def as Bag)) {
            const r = (raw as Bag)[k];
            if (r !== undefined && typeof r === typeof (def as Bag)[k]) out[k] = r;
        }
        return out as T;
    }
    if (typeof raw !== typeof def) return def;
    if (typeof raw === 'number' && !Number.isFinite(raw)) return def;
    if (allowed && !allowed.includes(raw as T)) return def;
    return raw as T;
}

/** useState that remembers its value for this user across sessions. */
export function usePersisted<T>(key: string, def: T, allowed?: readonly T[]): [T, Dispatch<SetStateAction<T>>] {
    const ctx = useContext(SettingsCtx);
    const [v, setV] = useState<T>(() => readValue(ctx?.bag[key], def, allowed));
    const defJson = JSON.stringify(def);
    useEffect(() => {
        if (!ctx) return;
        const stored = ctx.bag[key];
        const now = JSON.stringify(v);
        if (stored === undefined ? now === defJson : JSON.stringify(stored) === now) return;
        ctx.set(key, v);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [v]);
    return [v, setV];
}
