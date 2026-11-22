import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { OptionsBar } from './OptionsBar';
import { InputPane } from './InputPane';
import { OutputPane, Tab } from './OutputPane';
import { parseJson } from '../lib/parse';
import { computeStats, infer, nameTypes, toPascal } from '../lib/model';
import { emitTs, TsOptions } from '../lib/emitTs';
import { emitZod } from '../lib/emitZod';
import { emitMock } from '../lib/emitMock';
import { emitSchema, SchemaOptions } from '../lib/emitSchema';
import { repairInput } from '../lib/transform';
import { SAMPLES, Sample } from '../lib/samples';
import { usePersisted } from '../lib/settings';

const DEFAULT_OPTS: TsOptions = {
    declStyle: 'interface',
    arrayStyle: 'bracket',
    nullStyle: 'union',
    exportKw: true,
    readonly: false,
    allOptional: false,
    jsdoc: true,
};

export function TypeTool() {
    const [input, setInput] = useState('');
    const [rootName, setRootName] = useState('Root');
    const [opts, setOpts] = usePersisted<TsOptions>('ts.opts', DEFAULT_OPTS);
    const [tab, setTab] = usePersisted<Tab>('ts.tab', 'ts', ['ts', 'zod', 'schema', 'mock']);
    const [mockCount, setMockCount] = usePersisted('ts.mockCount', 3);
    const [mockFormat, setMockFormat] = usePersisted<'ts' | 'json'>('ts.mockFormat', 'ts', ['ts', 'json']);
    const [schemaOpts, setSchemaOpts] = usePersisted<SchemaOptions>('ts.schemaOpts', {
        draft: '2020-12',
        strict: false,
        examples: false,
    });
    const [fixReq, setFixReq] = useState(0);
    const [seed, setSeed] = useState(20261121);

    const deferred = useDeferredValue(input);
    const parsed = useMemo(() => parseJson(deferred), [deferred]);
    // broken input: generate from the auto-repaired document instead
    const repaired = useMemo(() => {
        if (parsed.state !== 'error') return null;
        const r = repairInput(deferred);
        if (!r.ok) return null;
        try {
            return { value: JSON.parse(r.text) as unknown, count: r.fixes.length };
        } catch {
            return null;
        }
    }, [parsed, deferred]);

    // keep the last successfully parsed value so output stays visible while typing
    const lastGood = useRef<unknown>(undefined);
    let value: unknown = undefined;
    let stale = false;
    if (parsed.state === 'ok') {
        lastGood.current = parsed.value;
        value = parsed.value;
    } else if (repaired) {
        value = repaired.value;
    } else if (parsed.state === 'error' && lastGood.current !== undefined) {
        value = lastGood.current;
        stale = true;
    } else if (parsed.state === 'empty') {
        lastGood.current = undefined;
    }

    const cleanRoot = toPascal(rootName) || 'Root';
    const model = useMemo(() => (value === undefined ? null : infer(value)), [value]);
    const named = useMemo(() => (model ? nameTypes(model, cleanRoot) : null), [model, cleanRoot]);
    const stats = useMemo(() => (named ? computeStats(named) : null), [named]);

    const code = useMemo(() => {
        if (!named) return null;
        if (tab === 'ts') return emitTs(named, opts);
        if (tab === 'zod') return emitZod(named);
        if (tab === 'schema') return emitSchema(named, schemaOpts);
        return emitMock(named, { count: mockCount, seed, format: mockFormat });
    }, [named, tab, opts, mockCount, seed, mockFormat, schemaOpts]);

    const fileName =
        tab === 'ts'
            ? 'types.ts'
            : tab === 'zod'
              ? 'schema.ts'
              : tab === 'schema'
                ? 'schema.json'
                : mockFormat === 'json'
                  ? 'mock.json'
                  : 'mock.ts';

    const loadSample = (s: Sample) => {
        setInput(s.json);
        setRootName(s.rootName);
    };

    return (
        <>
            <OptionsBar rootName={rootName} onRootName={setRootName} opts={opts} onOpts={setOpts} />
            <main className="main">
                <InputPane
                    input={input}
                    onInput={setInput}
                    parsed={parsed}
                    fieldCount={parsed.state === 'ok' && stats ? stats.fields : 0}
                    onSample={loadSample}
                    formatRequest={fixReq}
                />
                <OutputPane
                    tab={tab}
                    onTab={setTab}
                    code={code}
                    stale={stale}
                    stats={stale ? null : stats}
                    fileName={fileName}
                    mockCount={mockCount}
                    onMockCount={setMockCount}
                    mockFormat={mockFormat}
                    onMockFormat={setMockFormat}
                    onReseed={() => setSeed((s) => (s * 1103515245 + 12345) % 2147483647)}
                    schemaOpts={schemaOpts}
                    onSchemaOpts={setSchemaOpts}
                    repairedCount={repaired && parsed.state === 'error' ? repaired.count : 0}
                    onApplyRepair={() => setFixReq((n) => n + 1)}
                    onLoadSample={() => loadSample(SAMPLES[0])}
                />
            </main>
        </>
    );
}
