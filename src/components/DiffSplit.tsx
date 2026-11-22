import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { inlineRanges, Row } from '../lib/diff';
import { tokenize } from './CodeView';
import { IconUnfold } from './icons';

const CTX = 3;

type Item = { t: 'row'; i: number } | { t: 'fold'; from: number; to: number };

export interface DiffTarget {
    row: number;
    n: number;
}

interface Props {
    A: string[];
    B: string[];
    rows: Row[];
    target: DiffTarget | null;
}

/** Syntax-colored line, with an optional [start, end) span wrapped in a change highlight. */
function Text({ s, range, side }: { s: string; range: [number, number] | null; side: 'l' | 'r' }) {
    if (!s) return <> </>;
    const toks = tokenize(s);
    const out: ReactNode[] = [];
    let pos = 0;
    let key = 0;
    let hl: ReactNode[] = [];
    const piece = (text: string, cls?: string) =>
        cls ? (
            <span key={key++} className={cls}>
                {text}
            </span>
        ) : (
            <span key={key++}>{text}</span>
        );
    for (const t of toks) {
        const end = pos + t.text.length;
        let cut = pos;
        const marks = range ? [range[0], range[1]].filter((m) => m > pos && m < end) : [];
        for (const m of [...marks, end]) {
            const text = t.text.slice(cut - pos, m - pos);
            const inside = !!range && cut >= range[0] && cut < range[1];
            if (inside) hl.push(piece(text, t.cls));
            else {
                if (hl.length) {
                    out.push(
                        <span key={key++} className={side === 'l' ? 'dx dx-old' : 'dx dx-new'}>
                            {hl}
                        </span>,
                    );
                    hl = [];
                }
                out.push(piece(text, t.cls));
            }
            cut = m;
        }
        pos = end;
    }
    if (hl.length)
        out.push(
            <span key={key++} className={side === 'l' ? 'dx dx-old' : 'dx dx-new'}>
                {hl}
            </span>,
        );
    return <>{out}</>;
}

export function DiffSplit({ A, B, rows, target }: Props) {
    const [st, setSt] = useState<{ rows: Row[]; opened: Set<number> }>({ rows, opened: new Set() });
    let opened = st.opened;
    if (st.rows !== rows) {
        opened = new Set();
        setSt({ rows, opened });
    }
    const box = useRef<HTMLDivElement>(null);
    const [flash, setFlash] = useState(-1);
    const [pending, setPending] = useState<DiffTarget | null>(null);

    const items = useMemo(() => {
        const out: Item[] = [];
        const n = rows.length;
        let i = 0;
        while (i < n) {
            if (rows[i].k !== 'eq') {
                out.push({ t: 'row', i });
                i++;
                continue;
            }
            let j = i;
            while (j < n && rows[j].k === 'eq') j++;
            const from = i + (i === 0 ? 0 : CTX);
            const to = j - (j === n ? 0 : CTX);
            if (to - from >= 4 && !opened.has(from)) {
                for (let k = i; k < from; k++) out.push({ t: 'row', i: k });
                out.push({ t: 'fold', from, to });
                for (let k = to; k < j; k++) out.push({ t: 'row', i: k });
            } else {
                for (let k = i; k < j; k++) out.push({ t: 'row', i: k });
            }
            i = j;
        }
        return out;
    }, [rows, opened]);

    // open the fold that hides the target, then scroll once it is rendered
    useEffect(() => {
        if (!target || target.row < 0) return;
        const fold = items.find((it) => it.t === 'fold' && target.row >= it.from && target.row < it.to);
        if (fold && fold.t === 'fold') setSt((p) => ({ ...p, opened: new Set(p.opened).add(fold.from) }));
        setPending(target);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);

    useEffect(() => {
        if (!pending) return;
        const el = box.current?.querySelector<HTMLElement>(`[data-row="${pending.row}"]`);
        const c = box.current;
        if (!el || !c) return;
        c.scrollTop = Math.max(0, el.offsetTop - c.clientHeight / 3);
        setFlash(pending.row);
        setPending(null);
        const t = window.setTimeout(() => setFlash(-1), 1600);
        return () => window.clearTimeout(t);
    }, [pending, items]);

    return (
        <div className="dsplit" ref={box} role="region" aria-label="并排对比" tabIndex={0}>
            <div className="dhead-row">
                <div>旧 JSON</div>
                <div>新 JSON</div>
            </div>
            {items.map((it) => {
                if (it.t === 'fold') {
                    return (
                        <button
                            key={'f' + it.from}
                            type="button"
                            className="dfold"
                            onClick={() => setSt((p) => ({ ...p, opened: new Set(p.opened).add(it.from) }))}
                        >
                            <IconUnfold />
                            展开 {it.to - it.from} 行相同内容
                        </button>
                    );
                }
                const r = rows[it.i];
                const L = r.l >= 0 ? A[r.l] : null;
                const R = r.r >= 0 ? B[r.r] : null;
                const mod = r.k === 'mod';
                const rg = mod && L !== null && R !== null ? inlineRanges(L, R) : { a: null, b: null };
                const minus = r.k === 'del' || mod;
                const plus = r.k === 'ins' || mod;
                return (
                    <div key={it.i} data-row={it.i} className={`drow ${r.k}${flash === it.i ? ' flash' : ''}`}>
                        <div className={`dcell${minus ? ' minus' : ''}${L === null ? ' blank' : ''}`}>
                            <span className="dln">{r.l >= 0 ? r.l + 1 : ''}</span>
                            <span className="dsign" aria-hidden="true">
                                {minus && L !== null ? '−' : ''}
                            </span>
                            <span className="dtx">{L !== null && <Text s={L} range={rg.a} side="l" />}</span>
                        </div>
                        <div className={`dcell${plus ? ' plus' : ''}${R === null ? ' blank' : ''}`}>
                            <span className="dln">{r.r >= 0 ? r.r + 1 : ''}</span>
                            <span className="dsign" aria-hidden="true">
                                {plus && R !== null ? '+' : ''}
                            </span>
                            <span className="dtx">{R !== null && <Text s={R} range={rg.b} side="r" />}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
