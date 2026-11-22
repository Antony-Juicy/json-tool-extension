import { useEffect, useState } from 'react';

/** App-wide toast: one pill, bottom centre, auto-dismisses. Call toast() from anywhere. */
type Tone = 'ok' | 'bad' | 'info';
interface Item {
    id: number;
    text: string;
    tone: Tone;
}

type Listener = (t: Item) => void;
const listeners = new Set<Listener>();
let seq = 0;

export function toast(text: string, tone: Tone = 'ok') {
    const t = { id: ++seq, text, tone };
    listeners.forEach((l) => l(t));
}

export function Toaster() {
    const [item, setItem] = useState<Item | null>(null);
    const [leaving, setLeaving] = useState(false);
    useEffect(() => {
        const l: Listener = (t) => {
            setLeaving(false);
            setItem(t);
        };
        listeners.add(l);
        return () => {
            listeners.delete(l);
        };
    }, []);
    useEffect(() => {
        if (!item) return;
        const a = window.setTimeout(() => setLeaving(true), 1700);
        const b = window.setTimeout(() => setItem(null), 1950);
        return () => {
            window.clearTimeout(a);
            window.clearTimeout(b);
        };
    }, [item]);
    if (!item) return null;
    return (
        <div className="toast-wrap" aria-live="polite" role="status">
            <div key={item.id} className={`toast ${item.tone}${leaving ? ' out' : ''}`}>
                <span className="toast-ico" aria-hidden="true">
                    {item.tone === 'bad' ? (
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                            <path d="M8 4.5v4.2M8 11.2v.1" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 8.4l2.6 2.5L12 5.4" />
                        </svg>
                    )}
                </span>
                {item.text}
            </div>
        </div>
    );
}

/** Four-point sparkle with a moving gradient, as used by the loading pill. */
export function Sparkle() {
    return (
        <svg className="sparkle" viewBox="0 0 24 24" aria-hidden="true">
            <defs>
                <linearGradient id="spk" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#5B5BF0">
                        <animate attributeName="stop-color" values="#5B5BF0;#C026D3;#EC4899;#5B5BF0" dur="2.4s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="1" stopColor="#EC4899">
                        <animate attributeName="stop-color" values="#EC4899;#5B5BF0;#C026D3;#EC4899" dur="2.4s" repeatCount="indefinite" />
                    </stop>
                </linearGradient>
            </defs>
            <path
                d="M12 2.5c.5 4.6 2.6 7.2 7.5 9.5-4.9 2.3-7 4.9-7.5 9.5-.5-4.6-2.6-7.2-7.5-9.5 4.9-2.3 7-4.9 7.5-9.5z"
                fill="none"
                stroke="url(#spk)"
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function LoadingPill({ text = '正在加载' }: { text?: string }) {
    return (
        <div className="loading-screen" role="status" aria-live="polite">
            <div className="loading-pill">
                <Sparkle />
                <span>
                    {text}
                    <span className="ldots" aria-hidden="true">
                        <i>.</i>
                        <i>.</i>
                        <i>.</i>
                    </span>
                </span>
            </div>
        </div>
    );
}
