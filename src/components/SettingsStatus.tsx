import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../lib/settings';
import { IconCheck } from './icons';

/** Only what needs attention shows next to the title: a save error, a load error, or undo after a reset. */
export function SettingsStatus() {
    const s = useSettings();
    if (!s) return null;
    const st = s.status;
    if (st.kind === 'error')
        return (
            <div className="settings-status" aria-live="polite">
                <span className="ss-bad">设置没能保存：{st.message}</span>
                <button type="button" className="link" onClick={s.retry}>
                    重试
                </button>
            </div>
        );
    if (st.kind === 'reset')
        return (
            <div className="settings-status" aria-live="polite">
                <span>已恢复默认设置</span>
                <button type="button" className="link" onClick={s.undoReset}>
                    撤销
                </button>
            </div>
        );
    if (s.loadError)
        return (
            <div className="settings-status" aria-live="polite">
                <span className="ss-bad" title={s.loadError}>
                    没能读取已保存的设置，本次使用默认设置
                </span>
            </div>
        );
    return null;
}

/** Gear button at the end of the header: save state and 恢复默认设置 live here, out of the way. */
export function SettingsMenu() {
    const s = useSettings();
    const [open, setOpen] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const wrap = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);
    useEffect(() => {
        if (!open) setConfirm(false);
    }, [open]);

    if (!s) return null;
    const st = s.status;
    const state =
        st.kind === 'saving' ? '正在保存…' : st.kind === 'error' ? '保存失败' : s.loadError ? '本次使用默认设置' : '已自动保存';

    return (
        <div className="smenu" ref={wrap}>
            <button
                type="button"
                className={`smenu-btn${open ? ' on' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label="偏好设置"
                title="偏好设置"
                onClick={() => setOpen((o) => !o)}
            >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="8" cy="8" r="2.2" />
                    <path d="M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7L3.6 3.6" />
                </svg>
            </button>
            {open && (
                <div className="smenu-pop" role="dialog" aria-label="偏好设置">
                    <div className="sm-top">
                        <span className="sm-title">偏好设置</span>
                        <span className={`sm-pill${st.kind === 'error' ? ' bad' : st.kind === 'saving' || s.loadError ? ' wait' : ''}`}>
                            {st.kind !== 'error' && st.kind !== 'saving' && !s.loadError && <IconCheck />}
                            {state}
                        </span>
                    </div>
                    <p className="sm-desc">选项会自动记住，下次打开还在。不保存输入的 JSON。</p>
                    {st.kind === 'error' && (
                        <div className="sm-err">
                            <span>{st.message}</span>
                            <button type="button" className="link" onClick={s.retry}>
                                重试
                            </button>
                        </div>
                    )}
                    <div className="sm-sep" />
                    {confirm ? (
                        <div className="sm-confirm">
                            <div className="sm-confirm-text">恢复所有选项为默认值？之后可以撤销。</div>
                            <div className="sm-actions">
                                <button type="button" className="btn sm" onClick={() => setConfirm(false)}>
                                    取消
                                </button>
                                <button
                                    type="button"
                                    className="btn sm danger"
                                    onClick={() => {
                                        setOpen(false);
                                        s.reset();
                                    }}
                                >
                                    恢复默认
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button type="button" className="sm-row" onClick={() => setConfirm(true)}>
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="sm-ic">
                                <path d="M2.8 8a5.2 5.2 0 1 0 1.6-3.8" />
                                <path d="M2.6 2.6v2.6h2.6" />
                            </svg>
                            <span>恢复默认设置</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
