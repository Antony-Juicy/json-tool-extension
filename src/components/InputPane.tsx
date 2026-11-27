import { useEffect, useMemo, useRef, useState } from 'react';
import { formatBytes, ParseResult } from '../lib/parse';
import { SAMPLES, Sample } from '../lib/samples';
import { normalizeInput, prettyIfJson, repairInput } from '../lib/transform';
import { IconAlert, IconCheck, IconIndent, IconTrash } from './icons';
import { JsonEditor } from './JsonEditor';
import { InputBar } from './InputBar';

interface Props {
    input: string;
    onInput: (v: string) => void;
    parsed: ParseResult;
    fieldCount: number;
    onSample: (s: Sample) => void;
    /** bump to run 格式化 (with repair) from outside, keeping undo */
    formatRequest?: number;
}

export function InputPane({ input, onInput, parsed, fieldCount, onSample, formatRequest = 0 }: Props) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const [stash, setStash] = useState<{ text: string; reason: string } | null>(null);
    const [sampleId, setSampleId] = useState('');
    const [findReq, setFindReq] = useState(0);
    const repairable = useMemo(() => parsed.state === 'error' && repairInput(input).ok, [parsed, input]);

    const edit = (v: string) => {
        setStash(null);
        onInput(v);
    };
    const format = () => {
        const r = normalizeInput(input, false, '2', 'none');
        if (!r.ok) {
            jump();
            return;
        }
        if (r.text === input) return;
        setStash({ text: input, reason: r.fixed ? `已修复 ${r.fixed} 处格式问题` : '已格式化输入' });
        onInput(r.text);
    };
    const clear = () => {
        setStash({ text: input, reason: '已清空输入' });
        onInput('');
        ref.current?.focus();
    };
    const formatRef = useRef(format);
    formatRef.current = format;
    useEffect(() => {
        if (formatRequest) formatRef.current();
    }, [formatRequest]);
    const undo = () => {
        if (!stash) return;
        onInput(stash.text);
        setStash(null);
    };
    const jump = () => {
        if (parsed.state !== 'error' || parsed.pos === undefined || !ref.current) return;
        const el = ref.current;
        const p = Math.min(parsed.pos, input.length);
        el.focus();
        el.setSelectionRange(p, Math.min(p + 1, input.length));
        const line = parsed.line ?? 1;
        el.scrollTop = Math.max(0, (line - 6) * 20);
    };

    const bytes = new Blob([input]).size;
    const lineCount = useMemo(() => input.split('\n').length, [input]);

    return (
        <section className={`card${parsed.state === 'error' ? ' has-error' : ''}`} aria-label="输入">
            <div className="card-head">
                <h2 className="card-title">输入 JSON</h2>
                {input && (
                    <span className="card-meta">
                        {formatBytes(bytes)} · {lineCount} 行
                    </span>
                )}
                <div className="card-actions">
                    <label className="sr" htmlFor="sample">
                        载入示例
                    </label>
                    <select
                        id="sample"
                        className="text xs sample-pick"
                        value={sampleId}
                        onChange={(e) => {
                            const s = SAMPLES.find((x) => x.id === e.target.value);
                            setSampleId('');
                            if (s) onSample(s);
                        }}
                    >
                        <option value="">示例</option>
                        {SAMPLES.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <InputBar
                actions={[
                    {
                        label: '格式化',
                        icon: <IconIndent />,
                        emphasis: 'primary',
                        onClick: format,
                        disabled: !input.trim(),
                        title: '格式化输入；格式有问题时会先自动修复（Shift+Alt+F）',
                    },
                    { label: '清空', icon: <IconTrash />, emphasis: 'destructive', onClick: clear, disabled: !input },
                ]}
                onFind={() => setFindReq((n) => n + 1)}
                findDisabled={!input}
            />
            <div className="card-body">
                <JsonEditor
                    findRequest={findReq}
                    hideFindButton
                    value={input}
                    onChange={edit}
                    errorLine={parsed.state === 'error' ? parsed.line : undefined}
                    textareaRef={ref}
                    onFormat={format}
                    placeholder={'{\n  "id": 10086,\n  "nickname": "林小夏"\n}'}
                    label="JSON 输入"
                    formatOnPaste={(t) => prettyIfJson(t, '2')}
                    onPasteFormatted={(raw) => setStash({ text: raw, reason: '已自动格式化粘贴的内容' })}
                />
            </div>
            <div className="card-foot status" aria-live="polite">
                {stash !== null ? (
                    <>
                        <span>{stash.reason}</span>
                        <button type="button" className="link" onClick={undo}>
                            撤销
                        </button>
                    </>
                ) : parsed.state === 'ok' ? (
                    <>
                        <span className="ok" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                            <IconCheck />
                            有效 JSON
                        </span>
                        <span>{fieldCount} 个字段</span>
                    </>
                ) : parsed.state === 'error' ? (
                    <>
                        <span className="bad" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                            <IconAlert />
                            {parsed.line !== undefined ? `第 ${parsed.line} 行第 ${parsed.col} 列附近有语法错误` : '语法错误'}
                        </span>
                        <span className="msg mono">{parsed.message}</span>
                        {repairable && (
                            <button type="button" className="link" onClick={format}>
                                自动修复
                            </button>
                        )}
                        {parsed.pos !== undefined && (
                            <button type="button" className="link" onClick={jump}>
                                跳到错误位置
                            </button>
                        )}
                    </>
                ) : (
                    <span>等待输入</span>
                )}
            </div>
        </section>
    );
}
