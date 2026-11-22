import { ReactNode } from 'react';

interface Props {
    /** short mono text inside the badge, e.g. JSON */
    badge: string;
    title: string;
    desc?: ReactNode;
    /** optional primary action under the text, e.g. load a sample */
    action?: { label: string; onClick: () => void };
}

/** Placeholder for the result toolbar while there is no result, so both cards keep the same rows. */
export function GhostBar({ text = '搜索键名或值（⌘F）' }: { text?: string }) {
    return (
        <div className="rbar rbar-ghost" aria-hidden="true">
            <span className="ghost-field">{text}</span>
        </div>
    );
}

/** Empty state of a result card: dashed frame, badge, one title line and one hint line. */
export function EmptyState({ badge, title, desc, action }: Props) {
    return (
        <div className="estate" role="status">
            <div className="estate-badge" aria-hidden="true">
                {badge}
            </div>
            <div className="estate-title">{title}</div>
            {desc && <p className="estate-desc">{desc}</p>}
            {action && (
                <button type="button" className="btn sm primary estate-action" onClick={action.onClick}>
                    {action.label}
                </button>
            )}
        </div>
    );
}
