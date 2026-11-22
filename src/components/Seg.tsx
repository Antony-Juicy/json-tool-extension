export function Seg<T extends string>({
    value,
    options,
    onChange,
    label,
    prefix,
}: {
    value: T;
    options: { v: T; label: string }[];
    onChange: (v: T) => void;
    label: string;
    /** a short caption shown inside the control, before the options */
    prefix?: string;
}) {
    return (
        <div className={`seg${prefix ? ' has-prefix' : ''}`} role="group" aria-label={label}>
            {prefix && (
                <span className="seg-prefix" aria-hidden="true">
                    {prefix}
                </span>
            )}
            {options.map((o) => (
                <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
                    <span className={/[A-Za-z<>[\]|?]/.test(o.label) ? 'mono' : undefined}>{o.label}</span>
                </button>
            ))}
        </div>
    );
}
