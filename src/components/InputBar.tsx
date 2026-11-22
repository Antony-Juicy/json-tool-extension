import { IconSearch } from './icons';

export interface InputAction {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
}

/**
 * The bar under an input card's head. Same height as the result card's search bar, so the editor
 * and the result start on the same line.
 */
export function InputBar({
    actions,
    onFind,
    findDisabled,
    findLabel = '查找',
    kbd = '⌘F',
}: {
    actions: InputAction[];
    onFind: () => void;
    findDisabled?: boolean;
    findLabel?: string;
    kbd?: string;
}) {
    return (
        <div className="rbar ibar">
            <div className="actgroup" role="group" aria-label="输入操作">
                {actions.map((a) => (
                    <button key={a.label} type="button" onClick={a.onClick} disabled={a.disabled} title={a.title}>
                        {a.label}
                    </button>
                ))}
            </div>
            <div className="rb-right">
                <button
                    type="button"
                    className="btn sm find-open"
                    onClick={onFind}
                    disabled={findDisabled}
                    title="在输入中查找和替换"
                >
                    <IconSearch />
                    {findLabel}
                    <span className="kbd">{kbd}</span>
                </button>
            </div>
        </div>
    );
}
