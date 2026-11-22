import { useEffect, useMemo, useRef, useState } from 'react';
import { downloadFile } from '../lib/platform';
import { J, stringify } from '../lib/jsonAst';
import { applyPatch, equalJ, generatePatch, PatchOp, PatchOpName, patchToJ, selectionRisk } from '../lib/patch';
import { CodeView } from './CodeView';
import { copyText } from './OutputPane';
import { Seg } from './Seg';
import { IconAlert, IconCheck, IconCopy, IconDownload } from './icons';
import { usePersisted } from '../lib/settings';

const OP_LABEL: Record<PatchOpName, string> = { add: '新增', remove: '删除', replace: '替换', move: '移动' };
const MAX_LIST = 1500;

function preview(n: J | undefined): string {
    if (!n) return '';
    const s = stringify(n, '', 'none');
    return s.length > 80 ? s.slice(0, 79) + '…' : s;
}

interface Props {
    a: J;
    b: J;
    idMatch: boolean;
    onOpenInApply?: (patchText: string) => void;
}

export function PatchView({ a, b, idMatch, onOpenInApply }: Props) {
    const ops = useMemo(() => generatePatch(a, b, idMatch), [a, b, idMatch]);
    const [sel, setSel] = useState<boolean[]>(() => ops.map(() => true));
    const [out, setOut] = usePersisted<'patch' | 'merged'>('diff.patchOut', 'patch', ['patch', 'merged']);
    const [copyState, setCopyState] = useState<'idle' | 'done' | 'fail'>('idle');
    const [dlError, setDlError] = useState<string | null>(null);
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => setSel(ops.map(() => true)), [ops]);
    useEffect(() => () => window.clearTimeout(timer.current), []);

    const chosen = useMemo(() => ops.filter((_, i) => sel[i] !== false), [ops, sel]);
    const allOn = chosen.length === ops.length;

    const verified = useMemo(() => {
        const r = applyPatch(a, ops);
        return r.ok && equalJ(r.doc, b);
    }, [a, b, ops]);

    const applied = useMemo(() => applyPatch(a, chosen), [a, chosen]);
    const risk = useMemo(() => !allOn && selectionRisk(ops, sel), [allOn, ops, sel]);

    const text = useMemo(() => {
        if (out === 'patch') return stringify(patchToJ(chosen), '  ', 'none');
        return applied.ok ? stringify(applied.doc, '  ', 'none') : '';
    }, [out, chosen, applied]);

    const counts = useMemo(() => {
        const c: Record<PatchOpName, number> = { add: 0, remove: 0, replace: 0, move: 0 };
        for (const o of ops) c[o.op]++;
        return c;
    }, [ops]);

    const fileName = out === 'patch' ? 'patch.json' : 'merged.json';

    const onCopy = async () => {
        const ok = await copyText(text);
        setCopyState(ok ? 'done' : 'fail');
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopyState('idle'), 1800);
    };
    const onDownload = async () => {
        setDlError(null);
        try {
            await downloadFile(fileName, new Blob([text], { type: 'application/json' }));
        } catch (e) {
            setDlError(e instanceof Error ? e.message : '下载失败');
        }
    };

    const toggle = (i: number) => setSel((s) => s.map((v, k) => (k === i ? !v : v)));
    const setAll = (v: boolean) => setSel(ops.map(() => v));

    if (!ops.length) {
        return (
            <div className="okbox">
                <h3>
                    <IconCheck />
                    不需要任何补丁操作
                </h3>
                <p>两份 JSON 的内容一致。</p>
            </div>
        );
    }

    return (
        <div className="patch">
            <div className="patch-head">
                <span className="diff-total">
                    <b>{ops.length}</b> 个操作
                    {!allOn && (
                        <>
                            ，已选 <b>{chosen.length}</b> 个
                        </>
                    )}
                </span>
                <div className="diff-sum">
                    {(Object.keys(counts) as PatchOpName[])
                        .filter((k) => counts[k])
                        .map((k) => (
                            <span key={k} className={`badge p-${k}`}>
                                {OP_LABEL[k]} {counts[k]}
                            </span>
                        ))}
                </div>
                <span className={verified ? 'verify ok' : 'verify bad'}>
                    {verified ? <IconCheck /> : <IconAlert />}
                    {verified ? '已验证：应用到旧 JSON 后与新 JSON 完全一致' : '验证未通过：补丁不能完整还原新 JSON'}
                </span>
            </div>

            <div className="patch-grid">
                <section className="patch-ops" aria-label="补丁操作">
                    <div className="patch-ops-head">
                        <label className="check">
                            <input
                                type="checkbox"
                                checked={allOn}
                                ref={(el) => {
                                    if (el) el.indeterminate = !allOn && chosen.length > 0;
                                }}
                                onChange={(e) => setAll(e.target.checked)}
                            />
                            全选
                        </label>
                        <span className="patch-hint">取消勾选可以只应用部分改动</span>
                    </div>
                    <div className="patch-list" role="list">
                        {ops.slice(0, MAX_LIST).map((o: PatchOp, i) => (
                            <label key={i} role="listitem" className={`pl-row${sel[i] === false ? ' off' : ''}`}>
                                <input type="checkbox" checked={sel[i] !== false} onChange={() => toggle(i)} />
                                <span className={`badge p-${o.op}`}>{OP_LABEL[o.op]}</span>
                                <span className="pl-main">
                                    <span className="pl-path mono">
                                        {o.from !== undefined && (
                                            <>
                                                <span className="pl-from">{o.from}</span>
                                                <span className="dv-arrow"> → </span>
                                            </>
                                        )}
                                        {o.path || '（根）'}
                                    </span>
                                    {(o.old || o.value) && (
                                        <span className="dl-vals mono">
                                            {o.old && <span className="dv-old">{preview(o.old)}</span>}
                                            {o.old && o.value && <span className="dv-arrow">→</span>}
                                            {o.value && <span className="dv-new">{preview(o.value)}</span>}
                                        </span>
                                    )}
                                </span>
                            </label>
                        ))}
                        {ops.length > MAX_LIST && <div className="dlist-more">只列出前 {MAX_LIST} 个操作，输出包含全部已选操作</div>}
                    </div>
                </section>

                <section className="patch-out" aria-label="补丁输出">
                    <div className="patch-out-head">
                        <Seg<'patch' | 'merged'>
                            label="输出内容"
                            value={out}
                            onChange={setOut}
                            options={[
                                { v: 'patch', label: 'JSON Patch' },
                                { v: 'merged', label: '应用后的 JSON' },
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
                            {onOpenInApply && (
                                <button
                                    type="button"
                                    className="btn sm"
                                    disabled={!chosen.length}
                                    title="切换到「应用补丁」，把已选操作应用到旧 JSON 上逐步检查"
                                    onClick={() => onOpenInApply(stringify(patchToJ(chosen), '  ', 'none'))}
                                >
                                    在「应用补丁」中打开
                                </button>
                            )}
                            <button type="button" className="btn sm primary" onClick={onDownload} disabled={!text}>
                                <IconDownload />
                                下载 <span className="mono">{fileName}</span>
                            </button>
                        </div>
                    </div>
                    {risk && (
                        <div className="notice">
                            跳过了数组里的部分新增、删除或移动，后面同一数组里的操作下标可能会错位，请检查应用后的结果。
                        </div>
                    )}
                    {dlError && <div className="notice">{dlError}</div>}
                    {out === 'merged' && !applied.ok ? (
                        <div className="errbox short" role="alert">
                            <h3>
                                <IconAlert />第 {applied.index + 1} 个已选操作无法应用
                            </h3>
                            <p className="errmsg">{applied.message}。通常是跳过了它依赖的前一个操作，可以把相关操作一起勾选。</p>
                        </div>
                    ) : out === 'patch' && !chosen.length ? (
                        <div className="empty short">
                            <span>还没有勾选任何操作</span>
                        </div>
                    ) : (
                        <CodeView code={text} />
                    )}
                    <p className="patch-foot">
                        符合 <span className="mono">RFC 6902</span>，操作按顺序执行；
                        {idMatch ? '数组按 id 类字段匹配，顺序变化用 move 表示' : '数组按内容和位置匹配'}。
                    </p>
                </section>
            </div>
        </div>
    );
}
