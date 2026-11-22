import { useEffect, useMemo, useRef, useState } from 'react';
import { downloadFile } from '../lib/platform';
import { J, stringify } from '../lib/jsonAst';
import { ExtOp, ExtOpName, ReadResult, runPatch } from '../lib/patchApply';
import { CodeView } from './CodeView';
import { copyText } from './OutputPane';
import { Seg } from './Seg';
import { DiffResult, DiffView } from './DiffResult';
import { IconAlert, IconCheck, IconCopy, IconDownload } from './icons';
import { EmptyState } from './EmptyState';
import { usePersisted } from '../lib/settings';

export const EXT_LABEL: Record<ExtOpName, string> = {
    add: '新增',
    remove: '删除',
    replace: '替换',
    move: '移动',
    copy: '复制',
    test: '校验',
};

const MAX_LIST = 1500;

function preview(n: J | undefined): string {
    if (!n) return '';
    const s = stringify(n, '', 'none');
    return s.length > 80 ? s.slice(0, 79) + '…' : s;
}

export interface InputIssue {
    who: 'json' | 'patch';
    line: number;
    col: number;
    message: string;
}

interface Props {
    original: J | null;
    rawOriginal: string;
    rawPatch: string;
    issues: InputIssue[];
    patch: ReadResult | null;
    sortKeys: boolean;
    idMatch: boolean;
    onJump: (who: 'json' | 'patch') => void;
    onUseResult: (text: string) => void;
    /** fill the original JSON and the patch with the sample (empty-state button) */
    onLoadSample?: () => void;
}

export function PatchApplyResult(p: Props) {
    const ops: ExtOp[] = p.patch && p.patch.ok ? p.patch.ops : [];
    const [enabled, setEnabled] = useState<boolean[]>(() => ops.map(() => true));
    const [out, setOut] = usePersisted<'json' | 'diff'>('apply.out', 'json', ['json', 'diff']);
    const [diffView, setDiffView] = useState<'split' | 'list'>('split');
    const [partial, setPartial] = useState(false);
    const [copyState, setCopyState] = useState<'idle' | 'done' | 'fail'>('idle');
    const [dlError, setDlError] = useState<string | null>(null);
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => {
        setEnabled(ops.map(() => true));
        setPartial(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [p.patch]);
    useEffect(() => () => window.clearTimeout(timer.current), []);

    const outcome = useMemo(
        () => (p.original && ops.length ? runPatch(p.original, ops, enabled) : null),
        [p.original, ops, enabled],
    );
    const failed = !!outcome && outcome.failedAt >= 0;
    const showDoc = outcome && (!failed || partial) ? outcome.doc : null;
    const text = useMemo(() => (showDoc ? stringify(showDoc, '  ', 'none') : ''), [showDoc]);

    const counts = useMemo(() => {
        const c = new Map<ExtOpName, number>();
        for (const o of ops) c.set(o.op, (c.get(o.op) ?? 0) + 1);
        return c;
    }, [ops]);

    if (p.issues.length) {
        return (
            <div className="errbox short" role="alert">
                {p.issues.map((e) => (
                    <div key={e.who} className="diff-err">
                        <h3>
                            <IconAlert />
                            {e.who === 'json' ? '原 JSON' : 'JSON Patch'}第 {e.line} 行第 {e.col} 列附近有语法错误
                        </h3>
                        <p className="errmsg">{e.message}</p>
                        <button type="button" className="btn" onClick={() => p.onJump(e.who)}>
                            跳到错误位置
                        </button>
                    </div>
                ))}
            </div>
        );
    }

    if (!p.original || !p.patch) {
        const both = !p.rawOriginal.trim() && !p.rawPatch.trim();
        const need = both ? '原 JSON 和 JSON Patch' : !p.rawOriginal.trim() ? '原 JSON' : 'JSON Patch';
        return (
            <EmptyState
                badge="PATCH"
                title={both ? '粘贴原 JSON 和补丁后应用' : `还缺${need}`}
                desc={
                    both
                        ? '按 RFC 6902 依次执行补丁，可逐条取消勾选并预览结果。'
                        : `粘贴${need}后，这里会显示应用结果。`
                }
                action={both && p.onLoadSample ? { label: '载入示例', onClick: p.onLoadSample } : undefined}
            />
        );
    }

    if (!p.patch.ok) {
        return (
            <div className="errbox short" role="alert">
                <h3>
                    <IconAlert />
                    {p.patch.index >= 0 ? `第 ${p.patch.index + 1} 个操作写法有误` : '这不是有效的 JSON Patch'}
                </h3>
                <p className="errmsg">{p.patch.message}</p>
            </div>
        );
    }

    if (!ops.length) {
        return (
            <EmptyState badge="[ ]" title="补丁是空数组" desc="里面没有要执行的操作，补上操作后这里会显示结果。" />
        );
    }

    const onCount = enabled.filter((v) => v !== false).length;
    const allOn = onCount === ops.length;

    const onCopy = async () => {
        const ok = await copyText(text);
        setCopyState(ok ? 'done' : 'fail');
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopyState('idle'), 1800);
    };
    const onDownload = async () => {
        setDlError(null);
        try {
            await downloadFile('patched.json', new Blob([text], { type: 'application/json' }));
        } catch (e) {
            setDlError(e instanceof Error ? e.message : '下载失败');
        }
    };

    return (
        <div className="patch">
            <div className="patch-head">
                <span className="diff-total">
                    <b>{ops.length}</b> 个操作
                    {!allOn && (
                        <>
                            ，启用 <b>{onCount}</b> 个
                        </>
                    )}
                </span>
                <div className="diff-sum">
                    {[...counts.entries()].map(([k, n]) => (
                        <span key={k} className={`badge p-${k}`}>
                            {EXT_LABEL[k]} {n}
                        </span>
                    ))}
                </div>
                {outcome && (
                    <span className={failed ? 'verify bad' : 'verify ok'}>
                        {failed ? <IconAlert /> : <IconCheck />}
                        {failed
                            ? `第 ${outcome.failedAt + 1} 个操作失败，补丁整体未生效`
                            : `已全部应用${p.patch.wrapped ? '（单个操作已按数组处理）' : ''}`}
                    </span>
                )}
            </div>

            <div className={`patch-grid${out === 'diff' && showDoc ? ' wide' : ''}`}>
                <section className="patch-ops" aria-label="补丁操作">
                    <div className="patch-ops-head">
                        <label className="check">
                            <input
                                type="checkbox"
                                checked={allOn}
                                ref={(el) => {
                                    if (el) el.indeterminate = !allOn && onCount > 0;
                                }}
                                onChange={(e) => setEnabled(ops.map(() => e.target.checked))}
                            />
                            全部启用
                        </label>
                        <span className="patch-hint">按顺序执行，取消勾选可跳过某个操作</span>
                    </div>
                    <div className="patch-list" role="list">
                        {ops.slice(0, MAX_LIST).map((o, i) => {
                            const st = outcome?.steps[i];
                            return (
                                <label
                                    key={i}
                                    role="listitem"
                                    className={`pl-row st${enabled[i] === false ? ' off' : ''}${st?.s === 'fail' ? ' failed' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={enabled[i] !== false}
                                        onChange={() => setEnabled((s) => s.map((v, k) => (k === i ? !v : v)))}
                                    />
                                    <span className={`badge p-${o.op}`}>{EXT_LABEL[o.op]}</span>
                                    <span className="pl-main">
                                        <span className="pl-path mono">
                                            {o.from !== undefined && (
                                                <>
                                                    <span className="pl-from">{o.from || '（根）'}</span>
                                                    <span className="dv-arrow"> → </span>
                                                </>
                                            )}
                                            {o.path || '（根）'}
                                        </span>
                                        {o.value && (
                                            <span className="dl-vals mono">
                                                <span className={o.op === 'test' ? 'dv-test' : 'dv-new'}>
                                                    {o.op === 'test' ? '期望 ' : ''}
                                                    {preview(o.value)}
                                                </span>
                                            </span>
                                        )}
                                        {st?.s === 'fail' && <span className="pl-err">{st.message}</span>}
                                    </span>
                                    <span className={`pl-st s-${st?.s ?? 'notrun'}`} title={STATUS_TITLE[st?.s ?? 'notrun']}>
                                        {st?.s === 'ok' ? (
                                            <IconCheck />
                                        ) : st?.s === 'fail' ? (
                                            <IconAlert />
                                        ) : st?.s === 'off' ? (
                                            '跳过'
                                        ) : (
                                            '未执行'
                                        )}
                                    </span>
                                </label>
                            );
                        })}
                        {ops.length > MAX_LIST && <div className="dlist-more">只列出前 {MAX_LIST} 个操作，全部操作都会执行</div>}
                    </div>
                </section>

                <section className="patch-out" aria-label="应用结果">
                    <div className="patch-out-head">
                        <Seg<'json' | 'diff'>
                            label="结果视图"
                            value={out}
                            onChange={setOut}
                            options={[
                                { v: 'json', label: '结果 JSON' },
                                { v: 'diff', label: '改动对比' },
                            ]}
                        />
                        <div className="tools">
                            <button
                                type="button"
                                className={`btn sm${copyState === 'done' ? ' done' : ''}`}
                                onClick={onCopy}
                                disabled={!text}
                            >
                                {copyState === 'done' ? <IconCheck /> : <IconCopy />}
                                {copyState === 'done' ? '已复制' : copyState === 'fail' ? '复制失败' : '复制'}
                            </button>
                            <button
                                type="button"
                                className="btn sm"
                                onClick={() => p.onUseResult(text)}
                                disabled={!text || failed}
                                title="把结果写回左侧的原 JSON，可以继续应用下一份补丁"
                            >
                                写回原 JSON
                            </button>
                            <button type="button" className="btn sm primary" onClick={onDownload} disabled={!text}>
                                <IconDownload />
                                下载 <span className="mono">patched.json</span>
                            </button>
                        </div>
                    </div>
                    {failed && (
                        <div className="notice apply-fail">
                            <span>
                                按 RFC 6902，任何一个操作失败，整个补丁都不生效。
                                {partial ? '下面是失败之前的中间结果，仅供排查。' : ''}
                            </span>
                            <label className="check">
                                <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} />
                                预览失败前的结果
                            </label>
                        </div>
                    )}
                    {dlError && <div className="notice">{dlError}</div>}
                    {!showDoc ? (
                        <div className="empty short apply-empty">
                            <IconAlert />
                            <span>
                                补丁没有应用。可以修正第 {(outcome?.failedAt ?? 0) + 1} 个操作、取消勾选它，或勾选上方的「预览失败前的结果」
                            </span>
                        </div>
                    ) : out === 'json' ? (
                        <CodeView code={text} />
                    ) : (
                        <div className="apply-diff">
                            <DiffResult
                                nodeA={p.original}
                                nodeB={showDoc}
                                rawA={stringify(p.original, '  ', 'none')}
                                rawB={text}
                                errors={[]}
                                view={diffView}
                                onView={(v: DiffView) => {
                                    if (v !== 'patch') setDiffView(v);
                                }}
                                sortKeys={p.sortKeys}
                                idMatch={p.idMatch}
                                onJump={() => undefined}
                            />
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

const STATUS_TITLE = { ok: '已执行', fail: '执行失败', off: '已跳过', notrun: '因前面的操作失败而未执行' } as const;
