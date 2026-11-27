import { ClipboardEvent, Fragment, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
    ARRAY_STYLES,
    ArrayStyle,
    BUILD_SAMPLES,
    BuildRow,
    EXISTING_MODES,
    ExistingMode,
    NestedMode,
    SpaceStyle,
    ImportResult,
    buildUrl,
    importParams,
    looksLikeParamData,
} from '../lib/urlBuild';
import { ENCODINGS, SortMode, parseUrl } from '../lib/urlParams';
import { EmptyState } from './EmptyState';
import { toast } from './Toast';
import { UrlParamTable } from './UrlParamRows';
import { BuildRows } from './UrlBuildRows';
import { IconCheck, IconCopy, IconDownload, IconTrash } from './icons';

export interface BuildSeed {
    n: number;
    base: string;
    rows: { key: string; value: string }[];
}

interface Props {
    encoding: string;
    arrayStyle: ArrayStyle;
    spaceStyle: SpaceStyle;
    skipEmpty: boolean;
    existing: ExistingMode;
    order: SortMode;
    trimPaste: boolean;
    /** parameters handed over from the parse mode */
    seed: BuildSeed | null;
    /** check the built URL in the parse mode */
    onOpenParse: (url: string) => void;
    onCopy: (text: string, what: string) => void;
}

interface Snapshot {
    base: string;
    rows: BuildRow[];
    reason: string;
}

const encLabel = (id: string) => (id === 'auto' ? 'UTF-8' : (ENCODINGS.flatMap((g) => g.items).find((i) => i.id === id)?.label ?? id).split('（')[0]);
const KIND_LABEL = { json: 'JSON 对象', query: '参数串', lines: '每行一个 key=value' } as const;

/** The builder: base link + parameter rows on the left, the finished URL and what was written on the right. */
export function UrlBuild({ encoding, arrayStyle, spaceStyle, skipEmpty, existing, order, trimPaste, seed, onOpenParse, onCopy }: Props) {
    const nextId = useRef(1);
    const mk = (key = '', value = '', arr = false): BuildRow => ({ id: nextId.current++, key, value, arr });
    const [base, setBase] = useState('');
    const [rows, setRows] = useState<BuildRow[]>(() => [{ id: 0, key: '', value: '', arr: false }]);
    const [undo, setUndo] = useState<Snapshot | null>(null);
    const [focusId, setFocusId] = useState<number | null>(null);
    const [sampleId, setSampleId] = useState('');
    const [importOpen, setImportOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [nested, setNested] = useState<NestedMode>('json');
    const onFocused = useCallback(() => setFocusId(null), []);

    const snapshot = (reason: string) => setUndo({ base, rows, reason });

    // parameters handed over from the parse mode
    useEffect(() => {
        if (!seed) return;
        snapshot('已从解析结果带入');
        setBase(seed.base);
        const rs = seed.rows.map((r) => mk(r.key, r.value));
        setRows(rs.length ? rs : [mk()]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seed?.n]);

    const dBase = useDeferredValue(base);
    const dRows = useDeferredValue(rows);
    const result = useMemo(
        () => buildUrl(dBase, dRows, { encoding, arrayStyle, spaceStyle, skipEmpty, existing, order }),
        [dBase, dRows, encoding, arrayStyle, spaceStyle, skipEmpty, existing, order],
    );
    const preview = useMemo(
        () => (result.url ? parseUrl(result.url, { encoding, plusAsSpace: spaceStyle === 'plus' }) : null),
        [result.url, encoding, spaceStyle],
    );
    const sizes = useMemo(() => {
        const m = new Map<string, number>();
        for (const r of rows) {
            const k = r.key.trim();
            if (k) m.set(k, (m.get(k) ?? 0) + 1);
        }
        return m;
    }, [rows]);
    const paramCount = rows.filter((r) => r.key.trim()).length;
    const isEmpty = !base.trim() && rows.every((r) => !r.key.trim() && !r.value);
    const imp = useMemo(() => (importText.trim() ? importParams(importText, { encoding, nested }) : null), [importText, encoding, nested]);
    // the base link box holds parameter data (JSON, a=1&b=2, ...) instead of a link
    const baseIsData = useMemo(() => looksLikeParamData(base), [base]);
    const baseImp = useMemo(() => (baseIsData ? importParams(base, { encoding, nested }) : null), [baseIsData, base, encoding, nested]);

    const edited = () => setUndo(null);
    const setRow = (id: number, patch: Partial<BuildRow>) => {
        edited();
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    };
    const addRow = (afterId?: number) => {
        edited();
        const row = mk();
        setRows((rs) => {
            if (afterId === undefined) return [...rs, row];
            const i = rs.findIndex((r) => r.id === afterId);
            return [...rs.slice(0, i + 1), row, ...rs.slice(i + 1)];
        });
        setFocusId(row.id);
    };
    const removeRow = (id: number) => {
        edited();
        setRows((rs) => (rs.length <= 1 ? [mk()] : rs.filter((r) => r.id !== id)));
    };
    const clear = () => {
        snapshot('已清空');
        setBase('');
        setRows([mk()]);
        setImportOpen(false);
    };
    const loadSample = (id: string) => {
        const s = BUILD_SAMPLES.find((x) => x.id === id);
        if (!s) return;
        snapshot('已载入示例');
        setBase(s.base);
        setRows(s.rows.map((r) => mk(r.key, r.value, !!r.arr)));
    };
    type Imported = Extract<ImportResult, { ok: true }>;
    const addImported = (r: Imported, replace: boolean, reason: string) => {
        snapshot(reason);
        const added = r.rows.map((x) => mk(x.key, x.value, x.arr));
        setRows((rs) => {
            const all = [...(replace ? [] : rs.filter((x) => x.key || x.value)), ...added];
            return all.length ? all : [mk()];
        });
    };
    const doImport = (replace: boolean) => {
        if (!imp || !imp.ok || !imp.rows.length) return;
        addImported(imp, replace, `已${replace ? '替换为' : '导入'} ${imp.rows.length} 个参数`);
        setImportOpen(false);
        setImportText('');
    };
    /** parameter data pasted (or sitting) where a link belongs: turn it into rows */
    const importAsParams = (text: string, clearBase: boolean): boolean => {
        const r = importParams(text, { encoding, nested });
        if (!r.ok || !r.rows.length) {
            if (r.ok === false && r.error) toast(r.error, 'bad');
            return false;
        }
        addImported(r, false, `已把粘贴的内容识别为参数：${r.rows.length} 个${r.note ? `（${r.note}）` : ''}`);
        if (clearBase) setBase('');
        return true;
    };
    const undoLast = () => {
        if (!undo) return;
        setBase(undo.base);
        setRows(undo.rows);
        setUndo(null);
    };
    const onPasteBase = (e: ClipboardEvent<HTMLTextAreaElement>) => {
        const t = e.clipboardData.getData('text');
        const trimmed = t.trim();
        // JSON / key=value data pasted into the link box: use it as parameters, not as the link
        if (trimmed && looksLikeParamData(trimmed) && (trimmed.startsWith('{') || !base.trim())) {
            const el = e.currentTarget;
            if (importAsParams(trimmed, false)) {
                e.preventDefault();
                if (!el.value.trim()) setBase('');
                return;
            }
        }
        if (!trimPaste) return;
        if (!t || trimmed === t) return;
        e.preventDefault();
        const el = e.currentTarget;
        const a = el.selectionStart;
        const b = el.selectionEnd;
        snapshot('已去掉粘贴内容首尾的空格');
        setBase(base.slice(0, a) + trimmed + base.slice(b));
        const caret = a + trimmed.length;
        requestAnimationFrame(() => el.setSelectionRange(caret, caret));
    };

    const written = result.entries.filter((e) => e.isNew).length;
    const hasBoth = result.entries.some((e) => e.isNew) && result.entries.some((e) => !e.isNew);
    const existingLabel = EXISTING_MODES.find((m) => m.v === existing)?.label ?? '';
    const summary = [
        `编码 ${encLabel(encoding)}`,
        `数组 ${ARRAY_STYLES.find((a) => a.v === arrayStyle)?.short}`,
        `空格 ${spaceStyle === 'plus' ? '+' : '%20'}`,
        skipEmpty ? '跳过空值' : '保留空值',
        `已有参数 ${existingLabel}`,
    ].join(' · ');

    return (
        <main className="main">
            <section className="card" aria-label="基础链接与参数">
                <div className="card-head">
                    <h2 className="card-title">基础链接与参数</h2>
                    {!isEmpty && <span className="card-meta">{paramCount} 个参数</span>}
                    <div className="card-actions">
                        <label className="sr" htmlFor="bd-sample">
                            载入示例
                        </label>
                        <select
                            id="bd-sample"
                            className="text xs sample-pick"
                            value={sampleId}
                            onChange={(e) => {
                                const id = e.target.value;
                                setSampleId('');
                                loadSample(id);
                            }}
                        >
                            <option value="">示例</option>
                            {BUILD_SAMPLES.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="rbar ibar">
                    <div className="actgroup" role="group" aria-label="拼接操作">
                        <button type="button" className="input-action" data-emphasis="primary" onClick={() => setImportOpen((v) => !v)} aria-expanded={importOpen} title="粘贴 a=1&b=2、每行 key=value、整条 URL 或 JSON 对象，批量变成参数">
                            <IconDownload />
                            批量导入
                        </button>
                        <button type="button" className="input-action" data-emphasis="destructive" onClick={clear} disabled={isEmpty}>
                            <IconTrash />
                            清空
                        </button>
                    </div>
                    {result.url && (
                        <button type="button" className="btn sm url-result-jump" onClick={() => {
                            const target = document.getElementById('url-build-result');
                            target?.focus({ preventScroll: true });
                            target?.scrollIntoView({ block: 'start' });
                        }}>
                            查看结果
                        </button>
                    )}
                </div>
                <div className="card-body">
                    <div className="bd-body">
                        <label className="bd-lab" htmlFor="bd-base">
                            基础链接
                        </label>
                        <textarea
                            id="bd-base"
                            className={`bin mono${!base.trim() && paramCount > 0 ? ' need' : ''}`}
                            rows={2}
                            value={base}
                            onChange={(e) => {
                                edited();
                                setBase(e.target.value);
                            }}
                            onPaste={onPasteBase}
                            spellCheck={false}
                            autoCapitalize="off"
                            placeholder="例如 https://api.example.com/search（选填，不填则只生成参数串）"
                        />
                        {baseIsData && (
                            <div className={`bd-warn${baseImp && baseImp.ok ? '' : ' bad'}`} role="status">
                                {baseImp && baseImp.ok ? (
                                    <>
                                        <span>
                                            这段内容看起来是参数数据（{KIND_LABEL[baseImp.kind]}，{baseImp.rows.length} 个参数），不是链接。
                                        </span>
                                        <button type="button" className="link" onClick={() => importAsParams(base, true)}>
                                            转成参数
                                        </button>
                                    </>
                                ) : (
                                    <span>这段内容看起来是参数数据，但没能识别：{baseImp && !baseImp.ok ? baseImp.error : ''}</span>
                                )}
                            </div>
                        )}
                        <p className="bd-hint">
                            {result.existing > 0
                                ? `链接里已有 ${result.existing} 个参数，当前按「${existingLabel}」处理（可在上方工具栏修改）。`
                                : '可以带 #锚点；不填基础链接时，只生成参数串。'}
                        </p>

                        {importOpen && (
                            <div className="bd-import">
                                <div className="bd-imp-head">
                                    <b>批量导入</b>
                                    <span>粘贴 a=1&amp;b=2、每行 key=value、整条 URL，或 JSON 对象</span>
                                </div>
                                <textarea
                                    className="bin mono"
                                    rows={7}
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    spellCheck={false}
                                    autoFocus
                                    aria-label="要导入的参数"
                                    placeholder={'{\n  "sseBucket": { "quick_ref": "on" },\n  "tags": ["a", "b"]\n}'}
                                />
                                <div className={`bd-imp-hint${imp ? (imp.ok ? ' ok' : ' bad') : ''}`} role="status">
                                    {!imp && '内容格式不对时会自动修复，JSON 里被折断的字符串也会接起来。'}
                                    {imp && imp.ok && (
                                        <>
                                            <IconCheck />
                                            识别为{KIND_LABEL[imp.kind]}，{imp.rows.length} 个参数{imp.note ? `；${imp.note}` : ''}
                                        </>
                                    )}
                                    {imp && !imp.ok && imp.error}
                                </div>
                                <div className="bd-imp-bar">
                                    <label className="inline-lab">
                                        嵌套对象
                                        <select className="text xs" value={nested} onChange={(e) => setNested(e.target.value as NestedMode)} title="JSON 里的对象值怎么变成参数">
                                            <option value="json">转成 JSON 字符串</option>
                                            <option value="flatten">展开成 a[b][c]</option>
                                        </select>
                                    </label>
                                    <span className="tb-spacer" />
                                    <button type="button" className="btn sm" onClick={() => setImportOpen(false)}>
                                        取消
                                    </button>
                                    <button type="button" className="btn sm" disabled={!imp || !imp.ok} onClick={() => doImport(true)} title="清掉现有的参数，换成导入的">
                                        替换全部
                                    </button>
                                    <button type="button" className="btn sm primary" disabled={!imp || !imp.ok} onClick={() => doImport(false)}>
                                        追加到参数
                                    </button>
                                </div>
                            </div>
                        )}

                        <h3 className="bd-sec">
                            参数 <span>{paramCount}</span>
                        </h3>
                        <BuildRows rows={rows} sizes={sizes} focusId={focusId} onFocused={onFocused} onChange={setRow} onRemove={removeRow} onAdd={addRow} onPasteData={(t) => importAsParams(t, false)} />
                    </div>
                </div>
                <div className="card-foot status" aria-live="polite">
                    {undo ? (
                        <>
                            <span>{undo.reason}</span>
                            <button type="button" className="link" onClick={undoLast}>
                                撤销
                            </button>
                        </>
                    ) : (
                        <span>在值里按 Enter 添加下一行；同名的键会按数组写出</span>
                    )}
                </div>
            </section>

            <section className="card" id="url-build-result" aria-label="拼接结果" tabIndex={-1}>
                <div className="card-head">
                    <h2 className="card-title">拼接结果</h2>
                    {result.url && <span className="card-meta">{result.url.length} 个字符</span>}
                    <div className="card-actions">
                        <button type="button" className="btn sm" disabled={!result.url} onClick={() => onOpenParse(result.url)} title="在「解析」模式里打开这个 URL，检查每个参数">
                            去解析
                        </button>
                        <button type="button" className="btn sm primary" disabled={!result.url} onClick={() => onCopy(result.url, 'URL')}>
                            <IconCopy />
                            复制 URL
                        </button>
                    </div>
                </div>
                <div className="rbar">
                    <span className="ut-hint">{summary}</span>
                </div>
                {result.lossy > 0 && (
                    <div className="card-note ut-note" role="status">
                        <span>
                            有 {result.lossy} 个字符无法用 {encLabel(encoding)} 表示，已替换成 ?
                        </span>
                    </div>
                )}
                {!result.head && result.entries.length > 0 && (
                    <div className="card-note ut-note info" role="status">
                        <span>还没有填写基础链接，现在只生成了参数串，没有域名和路径。</span>
                        <button type="button" className="link" onClick={() => document.getElementById('bd-base')?.focus()}>
                            填写基础链接
                        </button>
                    </div>
                )}
                <div className="card-body">
                    {isEmpty ? (
                        <EmptyState
                            badge="URL"
                            title="填写基础链接和参数后生成 URL"
                            desc="支持数组、空格写法、已有参数处理，以及 UTF-8、GBK、Big5 等字符编码。"
                            action={{ label: '载入示例', onClick: () => loadSample('array') }}
                        />
                    ) : (
                        <div className="url-res">
                            {result.url ? (
                                <>
                                    <div className="bd-url" onClick={() => onCopy(result.url, 'URL')} title="单击复制">
                                        {result.head && <span className="u-head">{result.head}</span>}
                                        {result.entries.length > 0 && result.head && <span className="u-p">?</span>}
                                        {result.entries.map((e, i) => {
                                            const j = e.raw.indexOf('=');
                                            return (
                                                <Fragment key={i}>
                                                    {i > 0 && <span className="u-p">&amp;</span>}
                                                    <span className={`u-pair${hasBoth && e.isNew ? ' new' : ''}`}>
                                                        <span className="u-k">{j < 0 ? e.raw : e.raw.slice(0, j)}</span>
                                                        <span className="u-v">{j < 0 ? '' : e.raw.slice(j)}</span>
                                                    </span>
                                                </Fragment>
                                            );
                                        })}
                                        {result.hash && <span className="u-p">{result.hash}</span>}
                                    </div>
                                    {hasBoth && <p className="bd-hint">浅蓝底色的是这次写入的参数，其余是链接里原有的。</p>}
                                    {preview && (
                                        <>
                                            <h3 className="ut-sec">
                                                写出的参数 <span>{preview.params.length}</span>
                                            </h3>
                                            <UrlParamTable params={preview.params} onCopy={onCopy} onOpenUrl={onOpenParse} filtered={false} />
                                            {preview.hashParams.length > 0 && (
                                                <>
                                                    <h3 className="ut-sec">
                                                        锚点中的参数 <span>{preview.hashParams.length}</span>
                                                    </h3>
                                                    <UrlParamTable params={preview.hashParams} onCopy={onCopy} onOpenUrl={onOpenParse} filtered={false} />
                                                </>
                                            )}
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="ut-none">还没有可以写出的参数：键不能为空{skipEmpty ? '，空值也被跳过了' : ''}</div>
                            )}
                        </div>
                    )}
                </div>
                <div className="card-foot">
                    {result.url ? (
                        <span>
                            写入 <b>{written}</b> 个参数
                            {result.kept > 0 && (
                                <>
                                    {' '}
                                    · 保留原有 <b>{result.kept}</b> 个
                                </>
                            )}
                            {result.removed > 0 && (
                                <>
                                    {' '}
                                    · {existing === 'replace' ? '丢弃' : '覆盖'}原有 <b>{result.removed}</b> 个
                                </>
                            )}
                            {result.skipped > 0 && (
                                <>
                                    {' '}
                                    · 跳过 <b>{result.skipped}</b> 个空值
                                </>
                            )}
                        </span>
                    ) : (
                        <span>单击拼好的 URL 即可复制</span>
                    )}
                </div>
            </section>
        </main>
    );
}
