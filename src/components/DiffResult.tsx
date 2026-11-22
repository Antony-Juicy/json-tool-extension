import { useMemo, useState } from 'react';
import { J } from '../lib/jsonAst';
import { buildRows, Change, ChangeKind, diffJson, pathKey, render } from '../lib/diff';
import { DiffList, KIND_LABEL } from './DiffList';
import { DiffSplit, DiffTarget } from './DiffSplit';
import { IconAlert, IconCheck } from './icons';
import { EmptyState } from './EmptyState';
import { PatchView } from './PatchView';

export type DiffView = 'split' | 'list' | 'patch';

export interface SideError {
    side: 'a' | 'b';
    line: number;
    col: number;
    message: string;
}

interface Props {
    nodeA: J | null;
    nodeB: J | null;
    rawA: string;
    rawB: string;
    errors: SideError[];
    view: DiffView;
    onView: (v: DiffView) => void;
    sortKeys: boolean;
    idMatch: boolean;
    onJump: (side: 'a' | 'b') => void;
    onOpenPatch?: (patchText: string) => void;
    /** fill both sides with the sample (empty-state button) */
    onLoadSample?: () => void;
}

const KINDS: ChangeKind[] = ['added', 'removed', 'changed', 'type'];
const SIDE = { a: '旧 JSON', b: '新 JSON' };

export function DiffResult(p: Props) {
    const { nodeA, nodeB } = p;
    const sd = useMemo(() => (nodeA && nodeB ? diffJson(nodeA, nodeB, p.idMatch) : null), [nodeA, nodeB, p.idMatch]);
    const ra = useMemo(() => (nodeA ? render(nodeA, '  ', p.sortKeys) : null), [nodeA, p.sortKeys]);
    const rb = useMemo(() => (nodeB ? render(nodeB, '  ', p.sortKeys) : null), [nodeB, p.sortKeys]);
    const rows = useMemo(() => (ra && rb ? buildRows(ra.lines, rb.lines) : null), [ra, rb]);
    const hunks = useMemo(() => {
        if (!rows) return [];
        const h: number[] = [];
        rows.forEach((r, i) => {
            if (r.k !== 'eq' && (i === 0 || rows[i - 1].k === 'eq')) h.push(i);
        });
        return h;
    }, [rows]);

    const [kinds, setKinds] = useState<Set<ChangeKind>>(new Set());
    const [target, setTarget] = useState<DiffTarget | null>(null);
    const [hunk, setHunk] = useState(-1);

    const goHunk = (d: number) => {
        if (!hunks.length) return;
        const next = hunk < 0 ? (d > 0 ? 0 : hunks.length - 1) : (hunk + d + hunks.length) % hunks.length;
        setHunk(next);
        setTarget((t) => ({ row: hunks[next], n: (t?.n ?? 0) + 1 }));
    };

    const locate = (c: Change) => {
        if (!ra || !rb || !rows) return;
        const removed = c.kind === 'removed';
        const line = removed ? ra.at.get(pathKey(c.pathA ?? [])) : rb.at.get(pathKey(c.pathB ?? []));
        if (line === undefined) return;
        const idx = rows.findIndex((r) => (removed ? r.l === line : r.r === line));
        if (idx < 0) return;
        let h = -1;
        hunks.forEach((s, i) => {
            if (s <= idx) h = i;
        });
        setHunk(h);
        p.onView('split');
        setTarget((t) => ({ row: idx, n: (t?.n ?? 0) + 1 }));
    };

    if (p.errors.length) {
        return (
            <div className="errbox short" role="alert">
                {p.errors.map((e) => (
                    <div key={e.side} className="diff-err">
                        <h3>
                            <IconAlert />
                            {SIDE[e.side]}第 {e.line} 行第 {e.col} 列附近有语法错误
                        </h3>
                        <p className="errmsg">{e.message}</p>
                        <button type="button" className="btn" onClick={() => p.onJump(e.side)}>
                            跳到错误位置
                        </button>
                    </div>
                ))}
            </div>
        );
    }

    if (!sd || !rows) {
        const both = !p.rawA.trim() && !p.rawB.trim();
        const missing = both ? '两份' : !p.rawA.trim() ? '旧' : '新';
        return (
            <EmptyState
                badge="DIFF"
                title={both ? '粘贴两份 JSON 后查看差异' : `还缺${missing} JSON`}
                desc={
                    both
                        ? '支持并排对比、差异列表和 JSON Patch，可忽略键顺序、按 id 匹配数组。'
                        : `在${missing === '旧' ? '左侧' : '右侧'}粘贴${missing} JSON，这里会显示差异。`
                }
                action={both && p.onLoadSample ? { label: '载入示例', onClick: p.onLoadSample } : undefined}
            />
        );
    }

    if (p.view === 'patch' && nodeA && nodeB) {
        return <PatchView a={nodeA} b={nodeB} idMatch={p.idMatch} onOpenInApply={p.onOpenPatch} />;
    }

    if (!sd.changes.length) {
        const lineDiff = rows.some((r) => r.k !== 'eq');
        const sameText = p.rawA === p.rawB;
        return (
            <div className="okbox">
                <h3>
                    <IconCheck />
                    两份 JSON 内容一致
                </h3>
                <p>
                    {sameText
                        ? '文本完全相同。'
                        : lineDiff
                          ? '只有键的顺序不同。勾选「忽略键顺序」可以不显示这类差异。'
                          : '只有格式（空格、换行、缩进）不同。'}
                </p>
            </div>
        );
    }

    const filtered = kinds.size ? sd.changes.filter((c) => kinds.has(c.kind)) : sd.changes;
    const toggleKind = (k: ChangeKind) => {
        const s = new Set(kinds);
        if (s.has(k)) s.delete(k);
        else s.add(k);
        setKinds(s);
        if (p.view === 'split') p.onView('list');
    };

    return (
        <>
            <div className="diff-head">
                <span className="diff-total">
                    共 <b>{sd.changes.length}</b> 处差异{sd.capped ? '（已达上限）' : ''}
                </span>
                <div className="diff-sum" role="group" aria-label="按差异类型筛选">
                    {KINDS.filter((k) => sd.counts[k]).map((k) => (
                        <button
                            key={k}
                            type="button"
                            className={`sum-chip c-${k}`}
                            aria-pressed={kinds.has(k)}
                            title={p.view === 'split' ? '在差异列表中只看这一类' : '筛选这一类差异'}
                            onClick={() => toggleKind(k)}
                        >
                            {KIND_LABEL[k]} <b>{sd.counts[k]}</b>
                        </button>
                    ))}
                    {kinds.size > 0 && p.view === 'list' && (
                        <button type="button" className="link" onClick={() => setKinds(new Set())}>
                            清除筛选
                        </button>
                    )}
                </div>
                {p.view === 'split' && hunks.length > 0 && (
                    <div className="diff-nav">
                        <span>
                            改动块 {hunk >= 0 ? `${hunk + 1} / ` : ''}
                            {hunks.length}
                        </span>
                        <div className="seg small" role="group" aria-label="切换改动块">
                            <button type="button" onClick={() => goHunk(-1)}>
                                上一处
                            </button>
                            <button type="button" onClick={() => goHunk(1)}>
                                下一处
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {sd.notes.length > 0 && <p className="diff-notes">{sd.notes.join('；')}</p>}
            {p.view === 'split' ? (
                <DiffSplit A={ra?.lines ?? []} B={rb?.lines ?? []} rows={rows} target={target} />
            ) : (
                <DiffList changes={filtered} onLocate={locate} />
            )}
        </>
    );
}
