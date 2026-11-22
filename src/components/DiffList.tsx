import { useState } from 'react';
import { stringify } from '../lib/jsonAst';
import { Change, ChangeKind } from '../lib/diff';
import { formatPath } from '../lib/jsonpath';
import { copyText } from './OutputPane';
import { IconCopy } from './icons';

export const KIND_LABEL: Record<ChangeKind, string> = {
    added: '新增',
    removed: '删除',
    changed: '修改',
    type: '类型变化',
};

const TYPE_NAME = { str: '字符串', num: '数字', bool: '布尔', null: 'null', obj: '对象', arr: '数组' } as const;

const MAX_ROWS = 1000;

function preview(n: Change['a']): string {
    if (!n) return '';
    const s = stringify(n, '', 'none');
    return s.length > 90 ? s.slice(0, 89) + '…' : s;
}

interface Props {
    changes: Change[];
    onLocate: (c: Change) => void;
}

export function DiffList({ changes, onLocate }: Props) {
    const [flash, setFlash] = useState<number | null>(null);
    const shown = changes.slice(0, MAX_ROWS);

    if (!changes.length) return <div className="dlist-empty">当前筛选下没有差异</div>;

    return (
        <div className="dlist" role="list" aria-label="差异列表">
            {shown.map((c, i) => {
                const path = formatPath((c.kind === 'removed' ? c.pathA : c.pathB) ?? []);
                return (
                    <div
                        key={i}
                        role="listitem"
                        tabIndex={0}
                        className="dl-row"
                        title="在并排视图中定位"
                        onClick={() => onLocate(c)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onLocate(c);
                        }}
                    >
                        <span className={`badge b-${c.kind}`}>{KIND_LABEL[c.kind]}</span>
                        <span className="dl-path mono">{path}</span>
                        <span className="dl-vals mono">
                            {c.kind === 'type' && c.a && c.b && (
                                <span className="dv-type">
                                    {TYPE_NAME[c.a.t]} → {TYPE_NAME[c.b.t]}
                                </span>
                            )}
                            {c.a && <span className="dv-old">{preview(c.a)}</span>}
                            {c.a && c.b && <span className="dv-arrow">→</span>}
                            {c.b && <span className="dv-new">{preview(c.b)}</span>}
                        </span>
                        <button
                            type="button"
                            className={`icon-btn${flash === i ? ' done' : ''}`}
                            aria-label="复制路径"
                            title={flash === i ? '已复制' : '复制路径'}
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (await copyText(path)) {
                                    setFlash(i);
                                    window.setTimeout(() => setFlash((f) => (f === i ? null : f)), 1500);
                                }
                            }}
                        >
                            <IconCopy />
                        </button>
                    </div>
                );
            })}
            {changes.length > MAX_ROWS && (
                <div className="dlist-more">只显示前 {MAX_ROWS} 条，共 {changes.length} 条差异</div>
            )}
        </div>
    );
}
