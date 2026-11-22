/**
 * v17, appended last.
 * - Toast moves to the top centre.
 * - Input and result code start on the same line: the result bar never wraps its main controls
 *   (the find field shrinks instead; 行号 / 换行 drop their text on narrower windows), and per-view
 *   option bars (Schema / Mock options) move below the code, so both cards have exactly
 *   head + one 47px bar + code. Same top padding on both sides.
 * - The input is visually quieter than the result: muted palette, slightly tinted paper, lighter
 *   guides; it gets its full colors back while it has focus.
 */
export const ALIGN_CSS = `
/* ---------- toast at the top ---------- */
.toast-wrap { top: 18px; bottom: auto; }
@keyframes toast-in { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes toast-out { to { opacity: 0; transform: translateY(-6px); } }

/* ---------- one-row result bar ---------- */
.rbar { min-height: 47px; }
.rbar .ff { flex: 1 1 0; min-width: 150px; }
.rbar .rb-group, .rbar .rb-right, .rbar .rb-check { flex: none; }
.rbar .rb-right { gap: 6px; }
@media (max-width: 1360px) {
  .rbar .tbtn.labeled { width: 28px; padding: 0; font-size: 0; gap: 0; }
  .rbar .tbtn.labeled svg { width: 14px; height: 14px; }
  .rbar .tbtn.wide { width: 28px; padding: 0; font-size: 0; gap: 0; justify-content: center; }
}
@media (max-width: 1100px) {
  .rbar .ff-mode button svg { display: none; }
}

/* option bars below the code, so the code starts at the same height as the input */
.card > .card-sub { order: 2; border-bottom: 0; border-top: 1px solid var(--rule); }
.card > .card-foot { order: 3; }

/* same first-line position on both sides */
.code.v2 .code-inner { padding-top: 8px; }
.editor textarea, .ed-mirror-inner { padding-top: 8px; }
.gutter { padding-top: 8px; }

/* ---------- quieter input ---------- */
.card-body > .editor { background: #FCFBF8; }
.editor .gutter { background: #F7F6F2; color: #9AA1AA; }
.ed-mirror-inner { color: #57606A; }
.ed-mirror .t-key { color: #9C5E5E; }
.ed-mirror .t-string { color: #5D7DA8; }
.ed-mirror .t-number { color: #4F8B72; }
.ed-mirror .t-literal { color: #9273B5; }
.mig { border-left-color: #E2E4E7; }
.ml.caret { background: #F1F3F8; box-shadow: none; }
.ed-mirror .t-key, .ed-mirror .t-string, .ed-mirror .t-number, .ed-mirror .t-literal, .ed-mirror-inner { transition: color 0.15s; }
/* full colors while editing */
.editor:focus-within .ed-mirror-inner { color: #1F2328; }
.editor:focus-within .ed-mirror .t-key { color: #A31515; }
.editor:focus-within .ed-mirror .t-string { color: #0451A5; }
.editor:focus-within .ed-mirror .t-number { color: #098658; }
.editor:focus-within .ed-mirror .t-literal { color: #AF00DB; }
.editor:focus-within .mig { border-left-color: #D3D8DE; }
.editor:focus-within { background: #fff; }
.card-body > .editor:focus-within { background: #fff; }
.editor:not(.rich) textarea { color: #57606A; }
.editor:not(.rich) textarea:focus { color: #1F2328; }
`;
