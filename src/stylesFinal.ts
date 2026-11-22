/**
 * v16, appended last.
 * - Search highlight palette changes from teal to warm: matches soft yellow, current match orange
 *   with ink text, current line a pale amber tint. In the result views marks get real horizontal
 *   padding + margin (3px + 2px), so a match never touches the quotes or punctuation next to it.
 *   The input mirror keeps zero-width padding (drawn with box-shadow) because its text must stay
 *   aligned with the transparent textarea and caret.
 * - Input editor: dashed indent guides like the result code.
 * - Toast and the loading pill (white pill, sparkle, soft shadow) centred on screen.
 */
export const FINAL_CSS = `
:root {
  --hl: #FFF0A3;
  --hl-edge: #F2D04B;
  --hl-cur: #FF9A3D;
  --hl-cur-edge: #E0761A;
  --hl-line: #FFF8E8;
  --hl-gut: #FFEFCF;
}

/* ---------- result views: padded marks ---------- */
mark.hit {
  background: var(--hl); color: inherit; padding: 1px 3px; margin: 0 2px; border-radius: 4px;
  box-shadow: inset 0 -1px 0 var(--hl-edge);
  -webkit-box-decoration-break: clone; box-decoration-break: clone;
}
mark.hit.cur { background: var(--hl-cur); box-shadow: inset 0 -1px 0 var(--hl-cur-edge), 0 1px 3px rgba(224, 118, 26, 0.35); }
mark.hit.cur, mark.hit.cur * { color: #1F2328 !important; font-weight: 600; }
.code.v2 .line.cur-line .ltx { background: var(--hl-line); box-shadow: inset 0 0 0 1px #F6E3B8; }
.code.v2 .line.cur-line .gut { background: var(--hl-gut); box-shadow: inset 3px 0 0 var(--hl-cur), inset -1px 0 0 var(--rule); }
.code.v2 .line.cur-line .ln { color: #8A4B00; }
.line.cur-line { background: var(--hl-line); }
.trow.match { background-color: #FFFAEC; }
.trow.match::before { background: var(--hl-cur); }

/* ---------- input mirror: same colors, alignment-safe ---------- */
mark.ihit {
  background: var(--hl); padding: 1px 0; margin: 0; border-radius: 3px;
  box-shadow: -2px 0 0 var(--hl), 2px 0 0 var(--hl), 0 1px 0 var(--hl-edge);
}
mark.ihit.cur {
  background: var(--hl-cur);
  box-shadow: -2px 0 0 var(--hl-cur), 2px 0 0 var(--hl-cur), 0 1px 3px rgba(224, 118, 26, 0.35);
}
mark.ihit.cur, mark.ihit.cur * { color: #1F2328 !important; }

/* ---------- input indent guides ---------- */
.ml { position: relative; }
.mig { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px dashed #D3D8DE; pointer-events: none; }
.ml.caret .mig { border-left-color: #C3CAD6; }

/* ---------- toast ---------- */
.toast-wrap { position: fixed; left: 0; right: 0; bottom: 28px; z-index: 1000; display: flex; justify-content: center; pointer-events: none; }
.toast {
  display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 16px 0 12px; border-radius: 19px;
  background: #fff; color: #1F2328; font-size: 13.5px; pointer-events: auto;
  box-shadow: 0 6px 24px rgba(31, 35, 40, 0.16), 0 0 0 1px rgba(31, 35, 40, 0.06);
  animation: toast-in 0.18s ease-out;
}
.toast.out { animation: toast-out 0.25s ease-in forwards; }
.toast-ico { width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex: none; }
.toast-ico svg { width: 13px; height: 13px; }
.toast.ok .toast-ico, .toast.info .toast-ico { background: #E8F6EC; color: #17702F; }
.toast.bad .toast-ico { background: #FDECEA; color: #B42318; }
@keyframes toast-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes toast-out { to { opacity: 0; transform: translateY(6px); } }

/* ---------- loading pill, centred ---------- */
.loading-screen { position: fixed; inset: 0; z-index: 900; display: flex; align-items: center; justify-content: center; background: #F7F6F2; }
.loading-pill {
  display: inline-flex; align-items: center; gap: 10px; height: 44px; padding: 0 22px 0 16px; border-radius: 22px;
  background: #fff; color: #3D444D; font-size: 15px;
  box-shadow: 0 8px 28px rgba(31, 35, 40, 0.12), 0 0 0 1px rgba(31, 35, 40, 0.05);
}
.sparkle { width: 22px; height: 22px; animation: spk-spin 2.4s ease-in-out infinite; }
@keyframes spk-spin { 0%, 100% { transform: rotate(0) scale(1); } 50% { transform: rotate(45deg) scale(0.88); } }
.ldots i { font-style: normal; animation: ldot 1.2s infinite; opacity: 0.2; }
.ldots i:nth-child(2) { animation-delay: 0.2s; }
.ldots i:nth-child(3) { animation-delay: 0.4s; }
@keyframes ldot { 0%, 100% { opacity: 0.2; } 40% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .sparkle, .ldots i, .toast, .toast.out { animation: none; }
  .ldots i { opacity: 1; }
}
`;
