import { useEffect, useMemo, useRef, useState } from 'react';
import { J, stringify } from '../lib/jsonAst';
import { Step } from '../lib/jsonpath';
import { editAt, getAt } from '../lib/edit';
import { jsPath } from '../lib/tree';
import { tryParse } from '../lib/transform';
import { Seg } from './Seg';
import { IconPencil } from './icons';

type Kind = 'string' | 'number' | 'boolean' | 'null' | 'json';

const KINDS: { v: Kind; label: string }[] = [
    { v: 'string', label: '字符串' },
    { v: 'number', label: '数字' },
    { v: 'boolean', label: '布尔' },
    { v: 'null', label: 'null' },
    { v: 'json', label: '对象/数组' },
];

const NUM = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;

function kindOf(n: J): Kind {
    switch (n.t) {
        case 'str':
            return 'string';
        case 'num':
            return 'number';
        case 'bool':
            return 'boolean';
        case 'null':
            return 'null';
        default:
            return 'json';
    }
}

function textOf(n: J): string {
    switch (n.t) {
        case 'str':
            return n.v;
        case 'num':
            return n.raw;
        case 'bool':
            return n.v ? 'true' : 'false';
        case 'null':
            return '';
        default:
            return stringify(n, '  ', 'none');
    }
}

interface Props {
    root: J;
    path: Step[];
    onCommit: (root: J, description: string) => void;
    onClose: () => void;
}

export function FieldEditor({ root, path, onCommit, onClose }: Props) {
    const node = useMemo(() => getAt(root, path), [root, path]);
    const parentIsObj = path.length > 0 && typeof path[path.length - 1] === 'string';
    const origKey = parentIsObj ? String(path[path.length - 1]) : '';
    const [key, setKey] = useState(origKey);
    const [kind, setKind] = useState<Kind>(node ? kindOf(node) : 'string');
    const [text, setText] = useState(node ? textOf(node) : '');
    const [bool, setBool] = useState(node?.t === 'bool' ? node.v : true);
    const [error, setError] = useState<string | null>(null);
    const first = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const where = jsPath(path) || '根节点';

    useEffect(() => {
        if (!node) return;
        setKey(origKey);
        setKind(kindOf(node));
        setText(textOf(node));
        setBool(node.t === 'bool' ? node.v : true);
        setError(null);
        requestAnimationFrame(() => {
            const el = first.current;
            if (!el) return;
            el.focus();
            if ('select' in el) el.select();
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path.join('\u0001')]);

    if (!node) {
        return (
            <div className="fedit" role="dialog" aria-label="编辑字段">
                <div className="fe-head">
                    <span className="fe-title">这个字段已经不存在了</span>
                    <button type="button" className="btn sm" onClick={onClose}>
                        关闭
                    </button>
                </div>
            </div>
        );
    }

    const switchKind = (k: Kind) => {
        setError(null);
        if (k === kind) return;
        // carry the value over where it makes sense
        if (k === 'json' && kind !== 'json') {
            const cur = build();
            setText(cur ? stringify(cur, '  ', 'none') : text);
        } else if (kind === 'json' && k === 'string') {
            const p = tryParse(text);
            if (p.ok && p.node.t === 'str') setText(p.node.v);
        } else if (k === 'number' && kind === 'string' && !NUM.test(text.trim())) setText('0');
        setKind(k);
    };

    function build(): J | null {
        switch (kind) {
            case 'string':
                return { t: 'str', v: text };
            case 'number': {
                const t = text.trim();
                if (!NUM.test(t)) return null;
                return { t: 'num', raw: t };
            }
            case 'boolean':
                return { t: 'bool', v: bool };
            case 'null':
                return { t: 'null' };
            case 'json': {
                const p = tryParse(text);
                return p.ok ? p.node : null;
            }
        }
    }

    const save = () => {
        const v = build();
        if (!v) {
            setError(kind === 'number' ? '不是有效的数字，例如 42、-1.5、3e8' : 'JSON 格式不对，请检查括号、引号和逗号');
            return;
        }
        const k = key.trim();
        if (parentIsObj && !k) {
            setError('键名不能为空');
            return;
        }
        try {
            const next = editAt(root, path, { node: v, key: parentIsObj ? k : undefined });
            const renamed = parentIsObj && k !== origKey;
            onCommit(next, renamed ? `已把 ${where} 改名为「${k}」并更新值` : `已修改 ${where}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    const remove = () => {
        try {
            onCommit(editAt(root, path, { remove: true }), `已删除 ${where}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    const onKey = (e: React.KeyboardEvent, multiline: boolean) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        } else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
        }
    };

    const multiline = kind === 'json' || (kind === 'string' && (text.includes('\n') || text.length > 60));

    return (
        <div className="fedit" role="dialog" aria-label={`编辑 ${where}`}>
            <div className="fe-head">
                <span className="fe-ico" aria-hidden="true">
                    <IconPencil />
                </span>
                <span className="fe-title">编辑字段</span>
                <span className="fe-path mono" title={where}>
                    {where}
                </span>
                <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
                        <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                </button>
            </div>
            <div className="fe-body">
                {parentIsObj && (
                    <label className="fe-field">
                        <span>键名</span>
                        <input
                            ref={(el) => {
                                first.current = el;
                            }}
                            className="text mono fe-key"
                            value={key}
                            spellCheck={false}
                            onChange={(e) => {
                                setKey(e.target.value);
                                setError(null);
                            }}
                            onKeyDown={(e) => onKey(e, false)}
                        />
                    </label>
                )}
                <div className="fe-field">
                    <span>类型</span>
                    <Seg<Kind> label="值的类型" value={kind} onChange={switchKind} options={KINDS} />
                </div>
                <div className="fe-field fe-value">
                    <span>值</span>
                    {kind === 'boolean' ? (
                        <Seg<'true' | 'false'>
                            label="布尔值"
                            value={bool ? 'true' : 'false'}
                            onChange={(v) => setBool(v === 'true')}
                            options={[
                                { v: 'true', label: 'true' },
                                { v: 'false', label: 'false' },
                            ]}
                        />
                    ) : kind === 'null' ? (
                        <span className="fe-null mono">null</span>
                    ) : multiline ? (
                        <textarea
                            ref={(el) => {
                                if (!parentIsObj) first.current = el;
                            }}
                            className="text mono fe-text"
                            rows={kind === 'json' ? 6 : 3}
                            value={text}
                            spellCheck={false}
                            onChange={(e) => {
                                setText(e.target.value);
                                setError(null);
                            }}
                            onKeyDown={(e) => onKey(e, true)}
                        />
                    ) : (
                        <input
                            ref={(el) => {
                                if (!parentIsObj) first.current = el;
                            }}
                            className="text mono fe-input"
                            value={text}
                            inputMode={kind === 'number' ? 'decimal' : undefined}
                            spellCheck={false}
                            onChange={(e) => {
                                setText(e.target.value);
                                setError(null);
                            }}
                            onKeyDown={(e) => onKey(e, false)}
                        />
                    )}
                </div>
            </div>
            <div className="fe-foot">
                {error ? <span className="fe-err">{error}</span> : <span className="fe-hint">{multiline ? '⌘Enter 保存' : 'Enter 保存'}，Esc 取消。只修改右侧结果，左侧输入保持不变</span>}
                <div className="fe-actions">
                    {path.length > 0 && (
                        <button type="button" className="btn sm danger" onClick={remove}>
                            删除字段
                        </button>
                    )}
                    <button type="button" className="btn sm" onClick={onClose}>
                        取消
                    </button>
                    <button type="button" className="btn sm primary" onClick={save}>
                        保存
                    </button>
                </div>
            </div>
        </div>
    );
}
