import { useMemo, useState } from 'react';
import { lineCol, RepairInfo } from '../lib/transform';
import { IconWrench } from './icons';

const MAX_LIST = 300;

interface Props {
    info: RepairInfo;
    /** the text the fix positions refer to */
    input: string;
    onApply: () => void;
    onJump: (pos: number) => void;
}

export function RepairNotice({ info, input, onApply, onJump }: Props) {
    const [open, setOpen] = useState(false);
    const groups = useMemo(() => {
        const m = new Map<string, number>();
        for (const f of info.fixes) m.set(f.detail, (m.get(f.detail) ?? 0) + 1);
        return [...m.entries()].sort((a, b) => b[1] - a[1]);
    }, [info]);
    const summary =
        groups
            .slice(0, 3)
            .map(([d, n]) => (n > 1 ? `${d} ${n} 处` : d))
            .join('、') + (groups.length > 3 ? ` 等 ${groups.length} 类` : '');

    return (
        <div className="repair" role="status">
            <div className="repair-main">
                <span className="repair-ico" aria-hidden="true">
                    <IconWrench />
                </span>
                <div className="repair-text">
                    <b>输入不是合法 JSON，已自动修复 {info.fixes.length} 处</b>
                    <span className="repair-sum">{summary}</span>
                </div>
                <div className="tools">
                    <button type="button" className="btn sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                        {open ? '收起详情' : '查看详情'}
                    </button>
                    <button
                        type="button"
                        className="btn sm primary"
                        onClick={onApply}
                        title="用修复后的 JSON 替换输入框里的内容，可以撤销"
                    >
                        应用到输入
                    </button>
                </div>
            </div>
            {open && (
                <div className="repair-detail">
                    <p className="repair-orig">
                        原始错误：第 {info.error.line} 行第 {info.error.col} 列，{info.error.message}
                        <button type="button" className="link" onClick={() => onJump(info.error.pos)}>
                            定位
                        </button>
                    </p>
                    <ol className="repair-list">
                        {info.fixes.slice(0, MAX_LIST).map((f, i) => {
                            const lc = f.pos >= 0 ? lineCol(input, f.pos) : null;
                            return (
                                <li key={i}>
                                    {lc ? (
                                        <button
                                            type="button"
                                            className="repair-loc mono"
                                            title="在输入中定位"
                                            onClick={() => onJump(f.pos)}
                                        >
                                            {lc.line}:{lc.col}
                                        </button>
                                    ) : (
                                        <span className="repair-loc all">整体</span>
                                    )}
                                    <span className="repair-what">{f.detail}</span>
                                    {f.sample && <span className="repair-sample mono">{f.sample}</span>}
                                </li>
                            );
                        })}
                    </ol>
                    {info.fixes.length > MAX_LIST && <p className="repair-more">只列出前 {MAX_LIST} 处</p>}
                </div>
            )}
        </div>
    );
}
