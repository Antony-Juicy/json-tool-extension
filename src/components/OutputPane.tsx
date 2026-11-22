import { useEffect, useRef, useState } from 'react';
import { downloadFile } from '../lib/platform';
import { Stats } from '../lib/model';
import { SchemaOptions } from '../lib/emitSchema';
import { useFolding } from '../lib/fold';
import { CodeView } from './CodeView';
import { useCodeSearch } from './SearchBar';
import { FoldControls, ResultFind } from './ResultFind';
import { usePersisted } from '../lib/settings';
import { toast } from './Toast';
import { IconCheck, IconCopy, IconDownload, IconRefresh } from './icons';
import { EmptyState, GhostBar } from './EmptyState';

export type Tab = 'ts' | 'zod' | 'schema' | 'mock';

interface Props {
    tab: Tab;
    onTab: (t: Tab) => void;
    code: string | null;
    stale: boolean;
    stats: Stats | null;
    fileName: string;
    mockCount: number;
    onMockCount: (n: number) => void;
    mockFormat: 'ts' | 'json';
    onMockFormat: (f: 'ts' | 'json') => void;
    onReseed: () => void;
    schemaOpts: SchemaOptions;
    onSchemaOpts: (o: SchemaOptions) => void;
    /** number of fixes when the output was generated from auto-repaired input */
    repairedCount: number;
    onApplyRepair: () => void;
    /** fill the input with a sample (empty-state button) */
    onLoadSample?: () => void;
}

const TABS: { id: Tab; label: string }[] = [
    { id: 'ts', label: 'TypeScript' },
    { id: 'zod', label: 'Zod' },
    { id: 'schema', label: 'JSON Schema' },
    { id: 'mock', label: 'Mock 数据' },
];

export async function copyText(text: string, what = '内容'): Promise<boolean> {
    const ok = await rawCopy(text);
    if (ok) toast(`已复制${what}`);
    else toast('复制失败，请手动选中后复制', 'bad');
    return ok;
}

async function rawCopy(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch {
            return false;
        }
    }
}

export function OutputPane(p: Props) {
    const [copyState, setCopyState] = useState<'idle' | 'done' | 'fail'>('idle');
    const [dlError, setDlError] = useState<string | null>(null);
    const [wrap, setWrap] = useState(false);
    const [lineNumbers, setLineNumbers] = usePersisted('code.lineNumbers', false);
    const timer = useRef<number | undefined>(undefined);
    const search = useCodeSearch(p.code, 'ts.search');
    const folding = useFolding(p.code);

    useEffect(() => () => window.clearTimeout(timer.current), []);
    useEffect(() => {
        setCopyState('idle');
        setDlError(null);
    }, [p.tab]);

    const flash = (s: 'done' | 'fail') => {
        setCopyState(s);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopyState('idle'), 1800);
    };

    const onCopy = async () => {
        if (!p.code) return;
        flash((await copyText(p.code, TABS.find((t) => t.id === p.tab)?.label ?? '内容')) ? 'done' : 'fail');
    };
    const onDownload = async () => {
        if (!p.code) return;
        setDlError(null);
        try {
            await downloadFile(p.fileName, new Blob([p.code], { type: 'text/plain' }));
        } catch (e) {
            setDlError(e instanceof Error ? e.message : '下载失败');
        }
    };

    return (
        <section className="card" aria-label="输出">
            <div className="card-head">
                <div className="vtabs" role="tablist" aria-label="输出格式">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={p.tab === t.id}
                            onClick={() => p.onTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="card-actions">
                    <button
                        type="button"
                        className={`btn sm${copyState === 'done' ? ' done' : ''}`}
                        onClick={onCopy}
                        disabled={!p.code}
                    >
                        {copyState === 'done' ? <IconCheck /> : <IconCopy />}
                        {copyState === 'done' ? '已复制' : copyState === 'fail' ? '复制失败' : '复制'}
                    </button>
                    <button
                        type="button"
                        className="btn sm primary"
                        onClick={onDownload}
                        disabled={!p.code}
                        title={`下载 ${p.fileName}`}
                    >
                        <IconDownload />
                        下载
                    </button>
                </div>
            </div>

            {p.repairedCount > 0 && (
                <div className="card-note warn">
                    <span>输入有 {p.repairedCount} 处格式问题，下面是按自动修复后的内容生成的</span>
                    <button type="button" className="link" onClick={p.onApplyRepair}>
                        应用修复到输入
                    </button>
                </div>
            )}
            {p.stale && p.code && <div className="card-note">输入暂时无效，下面是上一次成功解析的结果</div>}

            {(p.tab === 'mock' || p.tab === 'schema') && (
                <div className="card-sub">
                    {p.tab === 'mock' ? (
                        <>
                            <label className="inline-field">
                                <span>顶层数组条数</span>
                                <input
                                    className="text xs num mono"
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={p.mockCount}
                                    onChange={(e) => {
                                        const n = Math.round(Number(e.target.value));
                                        if (Number.isFinite(n)) p.onMockCount(Math.min(50, Math.max(1, n)));
                                    }}
                                />
                            </label>
                            <div className="seg xs" role="group" aria-label="Mock 输出格式">
                                <button type="button" aria-pressed={p.mockFormat === 'ts'} onClick={() => p.onMockFormat('ts')}>
                                    TS 常量
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={p.mockFormat === 'json'}
                                    onClick={() => p.onMockFormat('json')}
                                >
                                    JSON
                                </button>
                            </div>
                            <button type="button" className="btn xs" onClick={p.onReseed} disabled={!p.code}>
                                <IconRefresh />
                                重新生成
                            </button>
                        </>
                    ) : (
                        <>
                            <label className="inline-field">
                                <span>规范</span>
                                <select
                                    className="text xs"
                                    value={p.schemaOpts.draft}
                                    onChange={(e) =>
                                        p.onSchemaOpts({ ...p.schemaOpts, draft: e.target.value === '07' ? '07' : '2020-12' })
                                    }
                                >
                                    <option value="2020-12">Draft 2020-12</option>
                                    <option value="07">Draft-07</option>
                                </select>
                            </label>
                            <label className="check" title="每个对象都加上 additionalProperties: false，不允许出现样本里没有的字段">
                                <input
                                    type="checkbox"
                                    checked={p.schemaOpts.strict}
                                    onChange={(e) => p.onSchemaOpts({ ...p.schemaOpts, strict: e.target.checked })}
                                />
                                禁止额外字段
                            </label>
                            <label className="check" title="用样本里的值生成 examples">
                                <input
                                    type="checkbox"
                                    checked={p.schemaOpts.examples}
                                    onChange={(e) => p.onSchemaOpts({ ...p.schemaOpts, examples: e.target.checked })}
                                />
                                附带示例值
                            </label>
                        </>
                    )}
                </div>
            )}

            {!p.code && <GhostBar />}
            {p.code && (
                <ResultFind s={search} mode="search" onMode={() => undefined}>
                    <FoldControls
                        onExpand={folding.expandAll}
                        onCollapse={() => folding.foldFrom(1)}
                        onLevel={folding.foldFrom}
                        levels={folding.maxDepth + 1}
                        wrap={wrap}
                        onWrap={setWrap}
                        lineNumbers={lineNumbers}
                        onLineNumbers={setLineNumbers}
                    />
                </ResultFind>
            )}

            <div className="card-body">
                {p.code ? (
                    <CodeView
                        code={p.code}
                        dim={p.stale}
                        wrap={wrap}
                        hits={search.hits}
                        current={search.current}
                        folding={folding}
                        lineNumbers={lineNumbers}
                        className={p.tab === 'schema' || (p.tab === 'mock' && p.mockFormat === 'json') ? 'lang-json' : undefined}
                    />
                ) : (
                    <EmptyState
                        badge="TS"
                        title="粘贴 JSON 后生成类型"
                        desc="支持 TypeScript、Zod、JSON Schema 和 Mock 数据。"
                        action={p.onLoadSample ? { label: '载入示例', onClick: p.onLoadSample } : undefined}
                    />
                )}
            </div>

            <div className="card-foot">
                {dlError && <span className="ss-bad">{dlError}</span>}
                {p.stats && (
                    <span>
                        <b>{p.stats.types}</b> 个类型 · <b>{p.stats.fields}</b> 个字段 · <b>{p.stats.optional}</b> 个可选 ·{' '}
                        <b>{p.stats.nullable}</b> 个可空
                    </span>
                )}
            </div>
        </section>
    );
}
