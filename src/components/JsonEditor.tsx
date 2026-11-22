import {
    KeyboardEvent,
    memo,
    MutableRefObject,
    ReactNode,
    Ref,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Hit, Range, renderLine, Tok, tokenize } from './CodeView';
import { useCodeSearch } from './SearchBar';
import { FindWidget } from './FindWidget';
import { IconSearch } from './icons';

/**
 * Plain textarea for editing, with a syntax-colored mirror layer behind it (the textarea text is
 * transparent, the caret stays visible). The mirror also draws search matches and the caret line,
 * so the input can show the same matches as the result. Very large inputs skip the colors.
 */
const RICH_MAX_CHARS = 400_000;
const RICH_MAX_LINES = 8000;

interface Props {
    value: string;
    onChange: (v: string) => void;
    errorLine?: number;
    textareaRef: Ref<HTMLTextAreaElement>;
    placeholder: string;
    label: string;
    onFormat?: () => void;
    className?: string;
    /** how errorLine is marked: red for a syntax error, amber for an auto-repaired problem */
    tone?: 'error' | 'warn';
    /** called with the text after a paste; return the formatted text, or null to keep it as pasted */
    formatOnPaste?: (text: string) => string | null;
    /** after a paste was formatted: the text as pasted (for undo) and the formatted result */
    onPasteFormatted?: (raw: string, after: string) => void;
    /** bump to open the find widget from outside */
    findRequest?: number;
    /** hide the floating search button (the card has its own 查找 button) */
    hideFindButton?: boolean;
    /** matches of a search running elsewhere (the result pane), drawn when the find widget is closed */
    extHits?: Hit[];
    extCurrent?: number;
    /** ⌘F inside the editor: hand it to a shared search instead of the local widget (⌥⌘F still opens it) */
    onFindShortcut?: (selection: string) => void;
}

/** Bracket pair colors (cycling by depth) and underlined URLs, on top of the syntax tokens. */
function colorize(toks: Tok[], depth: number): Tok[] {
    const out: Tok[] = [];
    let d = depth;
    for (const t of toks) {
        if (t.cls) {
            out.push(t.cls === 't-string' && /^"https?:\/\//.test(t.text) ? { ...t, cls: 't-string t-url' } : t);
            continue;
        }
        let buf = '';
        for (const ch of t.text) {
            const open = ch === '{' || ch === '[';
            const close = ch === '}' || ch === ']';
            if (!open && !close) {
                buf += ch;
                continue;
            }
            if (buf) {
                out.push({ text: buf });
                buf = '';
            }
            if (close) d = Math.max(0, d - 1);
            out.push({ text: ch, cls: `br b${d % 3}` });
            if (open) d++;
        }
        if (buf) out.push({ text: buf });
    }
    return out;
}

const MLine = memo(
    ({
        text,
        ranges,
        cur,
        caret,
        err,
        depth,
        unit,
        bracket,
    }: {
        text: string;
        ranges?: Range[];
        cur: number;
        caret: boolean;
        err: boolean;
        depth: number;
        unit: number;
        bracket: number;
    }) => {
        const toks = useMemo(() => colorize(tokenize(text), bracket), [text, bracket]);
        const guides: ReactNode[] = [];
        for (let k = 0; k < depth; k++)
            guides.push(<i key={k} className="mig" style={{ left: `calc(12px + ${k * unit + 0.5}ch)` }} />);
        return (
            <div className={`ml${caret ? ' caret' : ''}${err ? ' err' : ''}`}>
                {guides}
                {text ? renderLine(toks, ranges, cur, 'ihit') : '\u200b'}
            </div>
        );
    },
);

function lineOf(text: string, pos: number): number {
    let n = 0;
    const end = Math.min(pos, text.length);
    for (let i = 0; i < end; i++) if (text.charCodeAt(i) === 10) n++;
    return n;
}

export function JsonEditor({
    value,
    onChange,
    errorLine,
    textareaRef,
    placeholder,
    label,
    onFormat,
    className,
    tone = 'error',
    formatOnPaste,
    onPasteFormatted,
    findRequest = 0,
    hideFindButton = false,
    extHits,
    extCurrent = -1,
    onFindShortcut,
}: Props) {
    const pasteBefore = useRef<string | null>(null);
    const change = (next: string) => {
        const before = pasteBefore.current;
        pasteBefore.current = null;
        if (before !== null && formatOnPaste) {
            const f = formatOnPaste(next);
            if (f !== null && f !== next) {
                onChange(f);
                onPasteFormatted?.(next, f);
                return;
            }
        }
        onChange(next);
    };
    const gutter = useRef<HTMLDivElement>(null);
    const ta = useRef<HTMLTextAreaElement | null>(null);
    const mirror = useRef<HTMLDivElement>(null);
    const findInput = useRef<HTMLInputElement>(null);
    const [findOpen, setFindOpen] = useState(false);
    const [focusReq, setFocusReq] = useState(0);
    const [caretLine, setCaretLine] = useState(-1);
    const [focused, setFocused] = useState(false);
    const find = useCodeSearch(findOpen ? value : null, 'input.search');

    const setRefs = useCallback(
        (el: HTMLTextAreaElement | null) => {
            ta.current = el;
            if (typeof textareaRef === 'function') textareaRef(el);
            else if (textareaRef) (textareaRef as MutableRefObject<HTMLTextAreaElement | null>).current = el;
        },
        [textareaRef],
    );

    const lines = useMemo(() => value.split('\n'), [value]);
    const count = lines.length;
    const rich = value.length <= RICH_MAX_CHARS && count <= RICH_MAX_LINES;
    // indent guides: the smallest space indent is one level (tabs count as one level, 2ch wide);
    // bracket depth at the start of each line, for bracket pair colors
    const indent = useMemo(() => {
        if (!rich) return { unit: 2, depths: [] as number[], brackets: [] as number[] };
        const leads = lines.map((l) => /^[ \t]*/.exec(l)?.[0] ?? '');
        let unit = 0;
        for (const ld of leads) if (ld.length && !ld.includes('\t') && (unit === 0 || ld.length < unit)) unit = ld.length;
        unit = unit || 2;
        // guides only below lines that actually have content to the right
        const depths = leads.map((ld, i) => {
            if (!lines[i].trim()) return 0;
            if (ld.includes('\t')) return Math.min(40, ld.split('\t').length - 1);
            return Math.min(40, Math.floor(ld.length / unit));
        });
        const brackets: number[] = [];
        let d = 0;
        for (const l of lines) {
            brackets.push(d);
            let inStr = false;
            for (let i = 0; i < l.length; i++) {
                const c = l[i];
                if (inStr) {
                    if (c === '\\') i++;
                    else if (c === '"') inStr = false;
                } else if (c === '"') inStr = true;
                else if (c === '{' || c === '[') d++;
                else if (c === '}' || c === ']') d = Math.max(0, d - 1);
            }
        }
        return { unit, depths, brackets };
    }, [rich, lines]);
    const lineStarts = useMemo(() => {
        const out: number[] = [];
        let p = 0;
        for (const l of lines) {
            out.push(p);
            p += l.length + 1;
        }
        return out;
    }, [lines]);

    const hits = findOpen ? find.hits : (extHits ?? []);
    const current = findOpen ? find.current : extCurrent;
    const byLine = useMemo(() => {
        const m = new Map<number, Range[]>();
        hits.forEach((h, idx) => {
            const r = { start: h.start, end: h.end, idx };
            const arr = m.get(h.line);
            if (arr) arr.push(r);
            else m.set(h.line, [r]);
        });
        return m;
    }, [hits]);

    const caret = value && caretLine >= 0 && caretLine < count ? caretLine : -1;

    // gutter: one text run per block, with spans for the error line and the caret line
    const gutterContent = useMemo(() => {
        const marks = new Map<number, string>();
        if (focused && caret >= 0) marks.set(caret + 1, 'cur');
        if (errorLine && errorLine <= count) marks.set(errorLine, 'bad');
        const sorted = [...marks.keys()].sort((a, b) => a - b);
        const out: ReactNode[] = [];
        let from = 1;
        for (const ln of sorted) {
            if (ln > from) out.push(seq(from, ln - 1) + '\n');
            out.push(
                <span key={ln} className={marks.get(ln)}>
                    {ln}
                </span>,
            );
            if (ln < count) out.push('\n');
            from = ln + 1;
        }
        if (from <= count) out.push(seq(from, count));
        return out;
    }, [count, errorLine, caret, focused]);

    const syncScroll = () => {
        const el = ta.current;
        if (!el) return;
        if (gutter.current) gutter.current.scrollTop = el.scrollTop;
        if (mirror.current) mirror.current.style.transform = `translate(${-el.scrollLeft}px, ${-el.scrollTop}px)`;
    };

    const trackCaret = () => {
        const el = ta.current;
        if (!el) return;
        const ln = lineOf(el.value, el.selectionStart);
        setCaretLine((c) => (c === ln ? c : ln));
    };

    const openFind = () => {
        const el = ta.current;
        if (el && el.selectionEnd > el.selectionStart) {
            const sel = value.slice(el.selectionStart, el.selectionEnd);
            if (sel.length <= 200 && !sel.includes('\n')) find.setQuery(sel);
        }
        setFindOpen(true);
        setFocusReq((n) => n + 1);
    };

    useEffect(() => {
        if (!focusReq) return;
        findInput.current?.focus();
        findInput.current?.select();
    }, [focusReq]);

    const openRef = useRef(openFind);
    openRef.current = openFind;
    useEffect(() => {
        if (findRequest) openRef.current();
    }, [findRequest]);

    const closeFind = (selectCurrent: boolean) => {
        const h = find.hits[find.current];
        setFindOpen(false);
        const el = ta.current;
        if (!el) return;
        el.focus({ preventScroll: true });
        if (selectCurrent && h) {
            const a = lineStarts[h.line] + h.start;
            el.setSelectionRange(a, lineStarts[h.line] + h.end);
        }
    };

    // keep the current match in view (only when the match moves, not while typing in the editor)
    const lastScrollKey = useRef('');
    const scrollKey = findOpen
        ? `w|${find.query}|${find.current}|${find.caseSens}|${find.regex}`
        : `x|${extCurrent}|${extHits?.length ?? 0}|${extHits?.[0]?.line ?? -1}:${extHits?.[0]?.start ?? -1}`;
    useLayoutEffect(() => {
        syncScroll();
        if (current < 0 || (findOpen && find.pending)) return;
        if (scrollKey === lastScrollKey.current) return;
        const el = ta.current;
        const mk = mirror.current?.querySelector<HTMLElement>('mark.cur');
        if (!el || !mk) return;
        lastScrollKey.current = scrollKey;
        const line = mk.closest<HTMLElement>('.ml');
        const top = line ? line.offsetTop : mk.offsetTop;
        const left = mk.offsetLeft;
        if (top < el.scrollTop + 40 || top + 20 > el.scrollTop + el.clientHeight - 8) {
            el.scrollTop = Math.max(0, top - el.clientHeight / 3);
        }
        if (left < el.scrollLeft + 20 || left + mk.offsetWidth > el.scrollLeft + el.clientWidth - 20) {
            el.scrollLeft = Math.max(0, left - el.clientWidth / 2);
        }
        syncScroll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollKey, current, hits]);

    // keep the mirror in sync after every render (content height may change)
    useLayoutEffect(() => syncScroll());

    const showMirror = rich ? !!value : hits.length > 0;

    const mirrorRows = useMemo(() => {
        if (!showMirror) return null;
        if (!rich) {
            // plain fallback: only the matches, text stays transparent
            return lines.map((l, i) => (
                <div key={i} className="ml plain">
                    {l ? renderLine([{ text: l }], byLine.get(i), current, 'ihit') : '\u200b'}
                </div>
            ));
        }
        return lines.map((l, i) => (
            <MLine
                key={i}
                text={l}
                ranges={byLine.get(i)}
                cur={current}
                caret={focused && i === caret}
                err={!!errorLine && i === errorLine - 1}
                depth={indent.depths[i] ?? 0}
                unit={indent.unit}
                bracket={indent.brackets[i] ?? 0}
            />
        ));
    }, [showMirror, rich, lines, byLine, current, caret, focused, errorLine, indent]);

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        const mod = e.metaKey || e.ctrlKey;
        if (mod && !e.shiftKey && e.code === 'KeyF') {
            e.preventDefault();
            e.stopPropagation();
            if (onFindShortcut && !e.altKey) {
                const el = e.currentTarget;
                const sel = el.selectionEnd > el.selectionStart ? value.slice(el.selectionStart, el.selectionEnd) : '';
                onFindShortcut(sel.length <= 200 && !sel.includes('\n') ? sel : '');
            } else openFind();
            return;
        }
        if (e.key === 'Escape' && findOpen) {
            e.preventDefault();
            setFindOpen(false);
            return;
        }
        if (onFormat && e.shiftKey && e.altKey && e.code === 'KeyF') {
            e.preventDefault();
            onFormat();
            return;
        }
        if (e.key !== 'Tab' || e.shiftKey) return;
        e.preventDefault();
        const el = e.currentTarget;
        const s = el.selectionStart;
        const end = el.selectionEnd;
        onChange(value.slice(0, s) + '  ' + value.slice(end));
        requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
    };

    return (
        <div
            className={`editor${errorLine ? (tone === 'warn' ? ' warn' : ' err') : ''}${rich && value ? ' rich' : ''}${className ? ' ' + className : ''}`}
            data-search-scope=""
        >
            <div className="gutter" ref={gutter} aria-hidden="true">
                {gutterContent}
            </div>
            <div className="ed-area">
                {mirrorRows && (
                    <div className="ed-mirror" aria-hidden="true">
                        <div className="ed-mirror-inner" ref={mirror}>
                            {mirrorRows}
                        </div>
                    </div>
                )}
                <textarea
                    ref={setRefs}
                    aria-label={label}
                    value={value}
                    wrap="off"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    placeholder={placeholder}
                    onPaste={() => {
                        pasteBefore.current = value;
                    }}
                    onChange={(e) => {
                        change(e.target.value);
                        trackCaret();
                    }}
                    onKeyDown={onKeyDown}
                    onKeyUp={trackCaret}
                    onClick={trackCaret}
                    onSelect={trackCaret}
                    onFocus={() => {
                        setFocused(true);
                        trackCaret();
                    }}
                    onBlur={() => setFocused(false)}
                    onScroll={syncScroll}
                />
                {findOpen ? (
                    <FindWidget
                        s={find}
                        value={value}
                        onChange={onChange}
                        lineStarts={lineStarts}
                        inputRef={findInput}
                        onClose={closeFind}
                    />
                ) : (
                    value &&
                    !hideFindButton && (
                        <button
                            type="button"
                            className="ed-find-btn"
                            aria-label="在输入中查找"
                            title="查找和替换（⌘F / Ctrl+F）"
                            onClick={openFind}
                        >
                            <IconSearch />
                        </button>
                    )
                )}
            </div>
        </div>
    );
}

function seq(a: number, b: number) {
    const arr: number[] = [];
    for (let i = a; i <= b; i++) arr.push(i);
    return arr.join('\n');
}
