/**
 * v15, appended last.
 * - The input editor gets its own "source" look: a classic editor palette (keys red, strings blue,
 *   numbers green, literals purple), normal weight, 13px / 20px, and a caret-line highlight; the
 *   result keeps its "preview" look (ink keys, green strings, bold blue numbers, bold orange literals,
 *   13.5px / 22px). Same family, clearly different roles.
 * - Search matches on both sides share the teal pill style.
 * - Field editor panel, field replace row, edit pencil.
 */
export const EDIT_CSS = `
/* ---------- input editor: colored mirror behind a transparent textarea ---------- */
.editor.rich textarea { color: transparent; caret-color: #1F2328; -webkit-text-fill-color: transparent; }
.editor.rich textarea::selection { background: rgba(59, 79, 216, 0.24); -webkit-text-fill-color: transparent; }
.editor.rich textarea::placeholder { -webkit-text-fill-color: #6E7781; color: #6E7781; }
.ed-mirror-inner { color: #1F2328; }
.ml { height: 20px; white-space: pre; margin: 0 -14px 0 -12px; padding: 0 14px 0 12px; }
.ml.plain { color: transparent; }
.ml.caret { background: #F2F5FC; box-shadow: inset 0 1px 0 #E6EBF7, inset 0 -1px 0 #E6EBF7; }
.ml.err { background: #FFF4F2; }
.editor.warn .ml.err { background: #FFF8EB; }
.ed-mirror .t-key { color: #A31515; }
.ed-mirror .t-string { color: #0451A5; }
.ed-mirror .t-number { color: #098658; }
.ed-mirror .t-literal { color: #AF00DB; }
.ed-mirror .t-comment { color: #6A737D; font-style: italic; }
.ed-mirror .t-keyword, .ed-mirror .t-builtin, .ed-mirror .t-type { color: inherit; font-weight: normal; }
.gutter .cur { color: #1F2328; font-weight: 600; }

/* matches in the input: same teal pills as the result */
mark.ihit {
  color: inherit; background: var(--hl); padding: 1px 0; border-radius: 3px;
  box-shadow: -2px 0 0 var(--hl), 2px 0 0 var(--hl);
}
mark.ihit.cur { background: var(--hl-cur); box-shadow: -2px 0 0 var(--hl-cur), 2px 0 0 var(--hl-cur), 0 1px 4px rgba(15, 118, 110, 0.35); }
mark.ihit.cur, mark.ihit.cur * { color: #fff !important; }
.ml.plain mark.ihit, .ml.plain mark.ihit * { color: transparent !important; }

/* result "preview" type sits slightly larger than the input "source" */
.card-body > .code.v2 { font-size: 13.5px; }

/* search count: result / input */
.ff-in { margin-left: 8px; padding-left: 8px; border-left: 1px solid #E3E1DA; color: var(--muted); font-weight: 400; }
.ff-count.bad .ff-in { color: var(--muted); }
.tbtn.wide { width: auto; gap: 5px; padding: 0 9px; font-size: 12.5px; }
.tbtn.wide svg { width: 13px; height: 13px; }

/* ---------- field replace row ---------- */
.rb-replace {
  flex-basis: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding-top: 2px;
}
.rr-label { font-size: 12.5px; color: var(--muted); }
.rr-input { flex: 1 1 200px; min-width: 120px; height: 28px; border: 1px solid #D0CEC6; background: #fff; border-radius: 7px; padding: 0 8px; }
.rr-input:focus { outline: none; border-color: #8E99E6; box-shadow: 0 0 0 3px rgba(59, 79, 216, 0.14); }
.rr-note { font-size: 12px; color: var(--muted); }
.rr-note.bad { color: #B42318; }
.rb-replace .seg { height: 28px; }
.rb-replace .seg button { height: 24px; padding: 0 9px; font-size: 12.5px; }

/* ---------- edit pencil on code lines ---------- */
.code.v2 .ledit {
  display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 18px; margin-left: 8px;
  vertical-align: -3px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: #8C959F;
  cursor: pointer; opacity: 0; transition: opacity 0.1s;
}
.code.v2 .line.editable:hover .ledit { opacity: 1; }
.code.v2 .ledit:hover { background: #E3E9F9; color: var(--accent); }
.code.v2 .ledit svg { width: 12px; height: 12px; }
.code.v2 .line.editable { cursor: default; }
.foot-hint { color: var(--muted); }
.card-foot .foot-hint + span::before { content: ""; }

/* ---------- field editor panel ---------- */
.fedit { flex: none; border-top: 1px solid #C9D1F7; background: #F7F9FF; box-shadow: 0 -6px 16px rgba(31, 35, 40, 0.06); }
.fe-head { display: flex; align-items: center; gap: 8px; padding: 8px 10px 6px 14px; }
.fe-ico { display: inline-flex; width: 22px; height: 22px; align-items: center; justify-content: center; border-radius: 6px; background: #E3E9F9; color: var(--accent); }
.fe-ico svg { width: 12px; height: 12px; }
.fe-title { font-size: 13px; font-weight: 600; color: var(--ink); }
.fe-path { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; color: #2F3FB0; }
.fe-body { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px 12px; align-items: center; padding: 4px 14px 8px; }
.fe-field { display: contents; }
.fe-field > span:first-child { font-size: 12.5px; color: var(--muted); text-align: right; }
.fe-field.fe-value > span:first-child { align-self: start; padding-top: 6px; }
.fe-key, .fe-input { height: 30px; width: 100%; max-width: 420px; border: 1px solid #D0CEC6; border-radius: 7px; background: #fff; padding: 0 9px; font-size: 13px; }
.fe-text { width: 100%; min-height: 64px; max-height: 220px; resize: vertical; border: 1px solid #D0CEC6; border-radius: 7px; background: #fff; padding: 6px 9px; font-size: 13px; line-height: 20px; }
.fe-key:focus, .fe-input:focus, .fe-text:focus { outline: none; border-color: #8E99E6; box-shadow: 0 0 0 3px rgba(59, 79, 216, 0.14); }
.fe-field .seg { justify-self: start; background: #ECEEF5; }
.fe-null { font-size: 13px; color: #D9480F; font-weight: 600; }
.fe-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 6px 10px 10px 14px; }
.fe-hint { flex: 1 1 auto; font-size: 12px; color: var(--muted); }
.fe-err { flex: 1 1 auto; font-size: 12.5px; color: #B42318; }
.fe-actions { display: flex; gap: 6px; margin-left: auto; }
.btn.danger { color: #B42318; border-color: #F1C6C0; }
.btn.danger:hover { background: #FFF1EF; }

@media (max-width: 600px) {
  .fe-body { grid-template-columns: minmax(0, 1fr); }
  .fe-field > span:first-child { text-align: left; }
}
`;
