import { TsOptions } from '../lib/emitTs';

interface Props {
    rootName: string;
    onRootName: (v: string) => void;
    opts: TsOptions;
    onOpts: (o: TsOptions) => void;
}

import { Seg } from './Seg';

export function OptionsBar({ rootName, onRootName, opts, onOpts }: Props) {
    const set = <K extends keyof TsOptions>(k: K, v: TsOptions[K]) => onOpts({ ...opts, [k]: v });
    return (
        <div className="toolbar" role="toolbar" aria-label="类型生成选项">
            <label className="inline-field">
                <span>根类型名</span>
                <input
                    className="text mono root-name"
                    value={rootName}
                    spellCheck={false}
                    onChange={(e) => onRootName(e.target.value)}
                />
            </label>
            <span className="tb-sep" aria-hidden="true" />
            <Seg
                label="声明方式"
                prefix="声明"
                value={opts.declStyle}
                onChange={(v) => set('declStyle', v)}
                options={[
                    { v: 'interface', label: 'interface' },
                    { v: 'type', label: 'type' },
                ]}
            />
            <Seg
                label="数组写法"
                prefix="数组"
                value={opts.arrayStyle}
                onChange={(v) => set('arrayStyle', v)}
                options={[
                    { v: 'bracket', label: 'T[]' },
                    { v: 'generic', label: 'Array<T>' },
                ]}
            />
            <Seg
                label="null 字段"
                prefix="null"
                value={opts.nullStyle}
                onChange={(v) => set('nullStyle', v)}
                options={[
                    { v: 'union', label: 'T | null' },
                    { v: 'optional', label: '可选 ?:' },
                ]}
            />
            <span className="tb-sep" aria-hidden="true" />
            <label className="check">
                <input type="checkbox" checked={opts.exportKw} onChange={(e) => set('exportKw', e.target.checked)} />
                <span className="mono">export</span>
            </label>
            <label className="check">
                <input type="checkbox" checked={opts.readonly} onChange={(e) => set('readonly', e.target.checked)} />
                <span className="mono">readonly</span>
            </label>
            <label className="check">
                <input type="checkbox" checked={opts.allOptional} onChange={(e) => set('allOptional', e.target.checked)} />
                全部可选
            </label>
            <label className="check">
                <input type="checkbox" checked={opts.jsdoc} onChange={(e) => set('jsdoc', e.target.checked)} />
                JSDoc 注释
            </label>
        </div>
    );
}
