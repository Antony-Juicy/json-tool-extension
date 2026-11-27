import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { lineCol, normalizeInput, prettyIfJson, repairInput, tryParse } from '../lib/transform';
import { formatBytes } from '../lib/parse';
import { APPLY_SAMPLE, DIFF_SAMPLE } from '../lib/diffSamples';
import { readPatch } from '../lib/patchApply';
import { JsonEditor } from './JsonEditor';
import { InputBar } from './InputBar';
import { Seg } from './Seg';
import { DiffResult, DiffView, SideError } from './DiffResult';
import { InputIssue, PatchApplyResult } from './PatchApplyResult';
import { IconAlert, IconCheck, IconIndent, IconTrash, IconSwap } from './icons';
import { usePersisted } from '../lib/settings';

type Side = 'a' | 'b';
type DiffMode = 'compare' | 'apply';

export function DiffTool() {
    const [a, setA] = useState('');
    const [inputsCollapsed, setInputsCollapsed] = useState(false);
    const [b, setB] = useState('');
    const [patchText, setPatchText] = useState('');
    const [mode, setMode] = usePersisted<DiffMode>('diff.mode', 'compare', ['compare', 'apply']);
    const [view, setView] = usePersisted<DiffView>('diff.view', 'split', ['split', 'list', 'patch']);
    const [sortKeys, setSortKeys] = usePersisted('diff.sortKeys', true);
    const [idMatch, setIdMatch] = usePersisted('diff.idMatch', true);
    const [stash, setStash] = useState<{ a: string; b: string; p: string; reason: string } | null>(null);
    const refA = useRef<HTMLTextAreaElement>(null);
    const refB = useRef<HTMLTextAreaElement>(null);
    const refP = useRef<HTMLTextAreaElement>(null);
    const [findReq, setFindReq] = useState({ a: 0, b: 0, p: 0 });
    const apply = mode === 'apply';

    const da = useDeferredValue(a);
    const db = useDeferredValue(b);
    const dp = useDeferredValue(patchText);
    const pa = useMemo(() => (da.trim() ? tryParse(da) : null), [da]);
    const pb = useMemo(() => (db.trim() ? tryParse(db) : null), [db]);
    const pp = useMemo(() => (dp.trim() ? tryParse(dp) : null), [dp]);
    const patchRead = useMemo(() => (pp && pp.ok ? readPatch(pp.node) : null), [pp]);
    const errP = pp && !pp.ok ? { ...lineCol(dp, pp.pos), message: pp.message, pos: pp.pos } : null;
    const fixA = useMemo(() => !!pa && !pa.ok && repairInput(da).ok, [pa, da]);
    const fixB = useMemo(() => !!pb && !pb.ok && repairInput(db).ok, [pb, db]);
    const fixP = useMemo(() => !!pp && !pp.ok && repairInput(dp).ok, [pp, dp]);

    const errOf = (side: Side): (SideError & { pos: number }) | null => {
        const p = side === 'a' ? pa : pb;
        const text = side === 'a' ? da : db;
        if (!p || p.ok) return null;
        return { side, ...lineCol(text, p.pos), message: p.message, pos: p.pos };
    };
    const errA = errOf('a');
    const errB = errOf('b');
    const errors = [errA, errB].filter((e): e is SideError & { pos: number } => !!e);

    const snapshot = (reason: string) => setStash({ a, b, p: patchText, reason });
    const editA = (v: string) => {
        setA(v);
        setStash(null);
    };
    const editB = (v: string) => {
        setB(v);
        setStash(null);
    };
    const editP = (v: string) => {
        setPatchText(v);
        setStash(null);
    };

    const jumpPatch = () => {
        const el = refP.current;
        if (!el || !errP) return;
        const p = Math.min(errP.pos, patchText.length);
        el.focus();
        el.setSelectionRange(p, Math.min(p + 1, patchText.length));
        el.scrollTop = Math.max(0, (errP.line - 4) * 20);
    };

    const formatPatch = () => {
        const r = normalizeInput(patchText, false, '2', 'none');
        if (!r.ok) {
            jumpPatch();
            return;
        }
        if (r.text === patchText) return;
        snapshot(r.fixed ? `已修复 JSON Patch 里的 ${r.fixed} 处格式问题` : '已格式化 JSON Patch');
        setPatchText(r.text);
    };

    const openInApply = (text: string) => {
        snapshot('已把生成的补丁放到「应用补丁」');
        setPatchText(text);
        setMode('apply');
    };

    const loadSample = () => {
        setInputsCollapsed(false);
        snapshot('已载入示例');
        setA(DIFF_SAMPLE.a);
        if (apply) setPatchText(APPLY_SAMPLE);
        else setB(DIFF_SAMPLE.b);
    };

    const resultReady = !!pa?.ok && (apply ? !!patchRead?.ok : !!pb?.ok);
    const hideInputs = resultReady && inputsCollapsed;

    const issues: InputIssue[] = [];
    if (errA) issues.push({ who: 'json', line: errA.line, col: errA.col, message: errA.message });
    if (errP) issues.push({ who: 'patch', line: errP.line, col: errP.col, message: errP.message });

    const jump = (side: Side) => {
        const el = side === 'a' ? refA.current : refB.current;
        const e = side === 'a' ? errA : errB;
        const text = side === 'a' ? a : b;
        if (!el || !e) return;
        const p = Math.min(e.pos, text.length);
        el.focus();
        el.setSelectionRange(p, Math.min(p + 1, text.length));
        el.scrollTop = Math.max(0, (e.line - 4) * 20);
    };

    const formatSide = (side: Side) => {
        const text = side === 'a' ? a : b;
        const r = normalizeInput(text, false, '2', 'none');
        if (!r.ok) {
            jump(side);
            return;
        }
        if (r.text === text) return;
        const label = apply ? '原 JSON' : side === 'a' ? '旧 JSON' : '新 JSON';
        snapshot(r.fixed ? `已修复${label}里的 ${r.fixed} 处格式问题` : `已格式化${label}`);
        if (side === 'a') setA(r.text);
        else setB(r.text);
    };

    const sizeOf = (t: string) => `${formatBytes(new TextEncoder().encode(t).length)} · ${t.split('\n').length} 行`;

    const patchPane = () => {
        const count = patchRead && patchRead.ok ? patchRead.ops.length : null;
        const bad = !!errP || (!!patchRead && !patchRead.ok);
        return (
            <section className={`card${bad ? ' has-error' : ''}`} aria-label="JSON Patch">
                <div className="card-head">
                    <h2 className="card-title">JSON Patch</h2>
                    <span className="card-meta">{patchText ? sizeOf(dp) : 'RFC 6902 操作数组'}</span>
                </div>
                <InputBar
                    actions={[
                        {
                            label: '格式化',
                            icon: <IconIndent />,
                            emphasis: 'primary',
                            onClick: formatPatch,
                            disabled: !patchText.trim(),
                            title: '格式化补丁，有格式问题时会先修复（Shift+Alt+F）',
                        },
                        {
                            label: '清空',
                            icon: <IconTrash />,
                            emphasis: 'destructive',
                            onClick: () => {
                                snapshot('已清空 JSON Patch');
                                setPatchText('');
                                refP.current?.focus();
                            },
                            disabled: !patchText,
                        },
                    ]}
                    onFind={() => setFindReq((r) => ({ ...r, p: r.p + 1 }))}
                    findDisabled={!patchText}
                />
                <div className="card-body">
                <JsonEditor
                    findRequest={findReq.p}
                    hideFindButton
                    value={patchText}
                    onChange={editP}
                    errorLine={errP ? errP.line : undefined}
                    textareaRef={refP}
                    placeholder={'[\n  { "op": "replace", "path": "/data/status", "value": "shipped" }\n]'}
                    label="JSON Patch 输入"
                    formatOnPaste={(t) => prettyIfJson(t, '2')}
                    onPasteFormatted={(raw) => setStash({ a, b, p: raw, reason: '已自动格式化粘贴的补丁' })}
                    onFormat={formatPatch}
                />
                </div>
                <div className="card-foot status">
                    {errP ? (
                        <>
                            <span className="bad" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                                <IconAlert />第 {errP.line} 行第 {errP.col} 列
                            </span>
                            <span className="msg">{errP.message}</span>
                            {fixP && (
                                <button type="button" className="link" onClick={formatPatch}>
                                    自动修复
                                </button>
                            )}
                            <button type="button" className="link" onClick={jumpPatch}>
                                跳到错误位置
                            </button>
                        </>
                    ) : patchRead && !patchRead.ok ? (
                        <span className="bad" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                            <IconAlert />
                            {patchRead.index >= 0 ? `第 ${patchRead.index + 1} 个操作：` : ''}
                            {patchRead.message}
                        </span>
                    ) : count !== null ? (
                        <span className="ok" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                            <IconCheck />
                            {count} 个操作
                        </span>
                    ) : (
                        <span>等待输入</span>
                    )}
                </div>
            </section>
        );
    };

    const pane = (side: Side) => {
        const text = side === 'a' ? a : b;
        const p = side === 'a' ? pa : pb;
        const e = side === 'a' ? errA : errB;
        const title = apply ? '原 JSON' : side === 'a' ? '旧 JSON' : '新 JSON';
        const sub = apply ? '补丁会应用到这里' : side === 'a' ? '对比基准' : '与左侧比较';
        return (
            <section className={`card${e ? ' has-error' : ''}`} aria-label={title}>
                <div className="card-head">
                    <h2 className="card-title">{title}</h2>
                    <span className={`side-tag ${apply ? 'base' : side === 'a' ? 'old' : 'new'}`}>{sub}</span>
                    {text && <span className="card-meta">{sizeOf(side === 'a' ? da : db)}</span>}
                </div>
                <InputBar
                    actions={[
                        {
                            label: '格式化',
                            icon: <IconIndent />,
                            emphasis: 'primary',
                            onClick: () => formatSide(side),
                            disabled: !text.trim(),
                            title: '格式化，有格式问题时会先修复（Shift+Alt+F）',
                        },
                        {
                            label: '清空',
                            icon: <IconTrash />,
                            emphasis: 'destructive',
                            onClick: () => {
                                snapshot(`已清空${title}`);
                                if (side === 'a') setA('');
                                else setB('');
                                (side === 'a' ? refA : refB).current?.focus();
                            },
                            disabled: !text,
                        },
                    ]}
                    onFind={() => setFindReq((r) => ({ ...r, [side]: r[side] + 1 }))}
                    findDisabled={!text}
                />
                <div className="card-body">
                <JsonEditor
                    findRequest={findReq[side]}
                    hideFindButton
                    value={text}
                    onChange={side === 'a' ? editA : editB}
                    errorLine={e ? e.line : undefined}
                    textareaRef={side === 'a' ? refA : refB}
                    placeholder={apply ? '粘贴要打补丁的 JSON' : side === 'a' ? '粘贴旧版本的 JSON' : '粘贴新版本的 JSON'}
                    label={apply ? '原 JSON 输入' : side === 'a' ? '旧 JSON 输入' : '新 JSON 输入'}
                    formatOnPaste={(t) => prettyIfJson(t, '2')}
                    onPasteFormatted={(raw) =>
                        setStash({
                            a: side === 'a' ? raw : a,
                            b: side === 'b' ? raw : b,
                            p: patchText,
                            reason: '已自动格式化粘贴的内容',
                        })
                    }
                    onFormat={() => formatSide(side)}
                />
                </div>
                <div className="card-foot status">
                    {e ? (
                        <>
                            <span className="bad" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                                <IconAlert />第 {e.line} 行第 {e.col} 列
                            </span>
                            <span className="msg">{e.message}</span>
                            {(side === 'a' ? fixA : fixB) && (
                                <button type="button" className="link" onClick={() => formatSide(side)}>
                                    自动修复
                                </button>
                            )}
                            <button type="button" className="link" onClick={() => jump(side)}>
                                跳到错误位置
                            </button>
                        </>
                    ) : p ? (
                        <span className="ok" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                            <IconCheck />
                            有效 JSON
                        </span>
                    ) : (
                        <span>等待输入</span>
                    )}
                </div>
            </section>
        );
    };

    return (
        <>
            <div className="toolbar" role="toolbar" aria-label="对比选项">
                <Seg<DiffMode>
                    label="模式"
                    value={mode}
                    onChange={(next) => {
                        setInputsCollapsed(false);
                        setMode(next);
                    }}
                    options={[
                        { v: 'compare', label: '对比两份 JSON' },
                        { v: 'apply', label: '应用补丁' },
                    ]}
                />
                <span className="tb-sep" aria-hidden="true" />
                <label className="check" title="先按键名排序，再逐行对比，避免键顺序不同造成的干扰">
                    <input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} />
                    忽略键顺序
                </label>
                <label className="check" title="数组元素都有 id、skuId 这类唯一字段时，按它配对而不是按下标">
                    <input type="checkbox" checked={idMatch} onChange={(e) => setIdMatch(e.target.checked)} />
                    数组按 id 匹配
                </label>
                <span className="tb-spacer" />
                {stash && (
                    <span className="opts-status" aria-live="polite">
                        {stash.reason}
                        <button
                            type="button"
                            className="link"
                            onClick={() => {
                                setA(stash.a);
                                setB(stash.b);
                                setPatchText(stash.p);
                                setStash(null);
                            }}
                        >
                            撤销
                        </button>
                    </span>
                )}
                <div className="actgroup" role="group" aria-label="操作">
                    {!apply && (
                        <button
                            type="button"
                            title="交换旧 JSON 和新 JSON"
                            onClick={() => {
                                snapshot('已交换左右');
                                setA(b);
                                setB(a);
                            }}
                            disabled={!a && !b}
                        >
                            <IconSwap />
                            交换
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={loadSample}
                    >
                        载入示例
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            snapshot('已清空');
                            setA('');
                            if (apply) setPatchText('');
                            else setB('');
                            refA.current?.focus();
                        }}
                        disabled={apply ? !a && !patchText : !a && !b}
                    >
                        全部清空
                    </button>
                </div>
            </div>

            {resultReady && (
                <div className="diff-workspace-actions">
                    <button type="button" className="btn sm" aria-expanded={!hideInputs} aria-controls="diff-inputs" onClick={() => setInputsCollapsed(!hideInputs)}>
                        {hideInputs ? '展开输入' : '收起输入'}
                    </button>
                    {!hideInputs && (
                        <button type="button" className="btn sm" onClick={() => {
                            const target = document.getElementById('diff-result');
                            target?.focus({ preventScroll: true });
                            target?.scrollIntoView({ block: 'start' });
                        }}>
                            {apply ? '查看应用结果' : '跳到差异'}
                        </button>
                    )}
                </div>
            )}
            <div className="diff-inputs" id="diff-inputs" hidden={hideInputs}>
                {pane('a')}
                {apply ? patchPane() : pane('b')}
            </div>

            {apply ? (
                <section className="card diff-card" id="diff-result" aria-label="应用结果" tabIndex={-1}>
                    <div className="card-head">
                        <h2 className="card-title">应用结果</h2>
                        <span className="card-meta">把补丁按顺序应用到原 JSON</span>
                    </div>
                    <div className="card-body pad">
                        <PatchApplyResult
                            original={pa && pa.ok ? pa.node : null}
                            rawOriginal={da}
                            rawPatch={dp}
                            issues={issues}
                            patch={patchRead}
                            sortKeys={sortKeys}
                            idMatch={idMatch}
                            onJump={(who) => (who === 'json' ? jump('a') : jumpPatch())}
                            onUseResult={(text) => {
                                snapshot('已把结果写回原 JSON');
                                setInputsCollapsed(false);
                                setA(text);
                            }}
                            onLoadSample={loadSample}
                        />
                    </div>
                </section>
            ) : (
                <section className={`card diff-card view-${view}`} id="diff-result" aria-label="对比结果" tabIndex={-1}>
                    <div className="card-head">
                        <h2 className="card-title">对比结果</h2>
                        <div className="vtabs" role="tablist" aria-label="结果视图">
                            {DIFF_VIEWS.map((x) => (
                                <button
                                    key={x.v}
                                    type="button"
                                    role="tab"
                                    aria-selected={view === x.v}
                                    title={x.title}
                                    onClick={() => setView(x.v)}
                                >
                                    {x.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className={`card-body${view === 'patch' ? ' pad' : ''}`}>
                        <DiffResult
                            nodeA={pa && pa.ok ? pa.node : null}
                            nodeB={pb && pb.ok ? pb.node : null}
                            rawA={da}
                            rawB={db}
                            errors={errors}
                            view={view}
                            onView={setView}
                            sortKeys={sortKeys}
                            idMatch={idMatch}
                            onJump={jump}
                            onOpenPatch={openInApply}
                            onLoadSample={loadSample}
                        />
                    </div>
                </section>
            )}
        </>
    );
}

const DIFF_VIEWS: { v: DiffView; label: string; title: string }[] = [
    { v: 'split', label: '并排对比', title: '左右逐行对比，改动处高亮' },
    { v: 'list', label: '差异列表', title: '按字段列出每一处差异' },
    { v: 'patch', label: 'JSON Patch', title: '生成 RFC 6902 补丁' },
];
