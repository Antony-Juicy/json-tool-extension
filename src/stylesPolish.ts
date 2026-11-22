/**
 * Shared visual language, matched to the side-by-side diff:
 * 13px / 20px monospace, a tinted line-number gutter, soft row tints with a 3px left bar for
 * "you are here", and rounded highlight pills with a 1px underline for matches and changes.
 * Appended after the base sheet, so it only refines; responsive heights stay in the base sheet.
 */
export const POLISH = `
:root {
  --ink: #1F2328;
  --muted: #57606A;
  --ln: #6A737D;
  --rule: #E3E1DA;
  --gutter: #FBFAF7;
  --hit: #FFE7A3;
  --hit-line: #E5B94A;
  --hit-cur: #FFC94D;
  --hit-cur-line: #B87400;
  --here: #E8950C;
  --sel: #EEF1FF;
  --accent: #3B4FD8;
}

/* ---------- code view: same gutter as the diff ---------- */
.code {
  font-size: 13px; line-height: 20px;
  background: linear-gradient(to right, var(--gutter) 0 52px, var(--rule) 52px 53px, #fff 53px);
}
.code-inner { padding: 8px 0 12px; }
.line { min-height: 20px; }
.ln {
  position: sticky; left: 0; z-index: 1; width: 53px; padding: 0 10px 0 0;
  background: var(--gutter); box-shadow: inset -1px 0 0 var(--rule);
  color: var(--ln); font-variant-numeric: tabular-nums;
}
.lc { padding-left: 14px; padding-right: 18px; }
.line.cur-line { background: #FFF8E1; }
.line.cur-line .ln { background: #FFEFC2; color: #7A4300; box-shadow: inset 3px 0 0 var(--here), inset -1px 0 0 var(--rule); }

/* ---------- search / filter highlight pills ---------- */
mark.hit {
  background: var(--hit); color: inherit; border-radius: 3px;
  padding: 1px 2px; margin: 0 -2px;
  box-shadow: inset 0 -1px 0 var(--hit-line);
  -webkit-box-decoration-break: clone; box-decoration-break: clone;
}
mark.hit.cur { background: var(--hit-cur); box-shadow: inset 0 -1px 0 var(--hit-cur-line), 0 0 0 1px var(--hit-cur-line); }
mark.hit .t-key, mark.hit .t-string, mark.hit .t-number, mark.hit .t-literal, mark.hit .t-type,
mark.hit .t-keyword, mark.hit .t-builtin, mark.hit .t-comment, mark.hit .t-doctag { color: var(--ink); }

/* ---------- editors: gutter matches ---------- */
.editor textarea { font-size: 13px; line-height: 20px; padding: 8px 14px 12px; }
.gutter { min-width: 53px; padding: 8px 10px 64px 8px; color: var(--ln); background: var(--gutter); border-right-color: var(--rule); font-variant-numeric: tabular-nums; }
.gutter .bad { border-radius: 3px; padding: 1px 4px; }

/* ---------- tree view ---------- */
.tree { font-size: 13px; }
.trow, .trow:hover, .trow.sel, .trow.match {
  border-radius: 0;
  background-image: repeating-linear-gradient(to right, transparent 0 8.5px, #E6E3DA 8.5px 9.5px, transparent 9.5px 16px);
  background-repeat: no-repeat;
  background-position: 6px 0;
  background-size: calc(var(--d, 0) * 16px) 100%;
}
.trow:hover { background-color: #F7F6F2; }
.trow.sel { background-color: var(--sel); box-shadow: inset 3px 0 0 var(--accent); }
.trow.match { background-color: #FFFBEB; }
.trow.match.sel { background-color: var(--sel); }
.trow.match::before { left: 0; top: 0; bottom: 0; width: 3px; border-radius: 0; background: var(--here); }
.tw { width: 18px; height: 18px; margin-right: 1px; }
.tk-colon { margin: 0 6px 0 1px; }
.tk-count { margin-left: 8px; height: 18px; background: #F0EEE8; color: var(--muted); }
.tree-tools, .tree-detail { padding: 8px 12px; background: var(--gutter); }
.tree-tools { border-bottom-color: var(--rule); }
.tree-detail { border-top-color: var(--rule); }
.tree-path { font-size: 12.5px; }

/* ---------- diff: align to the same metrics ---------- */
.dsplit { font-size: 13px; line-height: 20px; }
.dln { width: 53px; color: var(--ln); }
.dcell.plus .dln { color: #17702F; }

/* ---------- diff list ---------- */
.dlist { border-color: #D0CEC6; }
.dl-row { grid-template-columns: 84px minmax(0, 1fr) minmax(0, 1.4fr) 26px; padding: 9px 14px; gap: 6px 14px; border-bottom-color: #EFEDE6; position: relative; }
.dl-row:hover { background: #FAF9F6; box-shadow: inset 3px 0 0 #D0CEC6; }
.badge { height: 22px; padding: 0 8px; border-radius: 11px; font-weight: 600; box-shadow: inset 0 0 0 1px currentColor; }
.b-added { background: #EEF9F1; color: #17702F; box-shadow: inset 0 0 0 1px #B4E6C4; }
.b-removed { background: #FFF1EF; color: #B42318; box-shadow: inset 0 0 0 1px #FFC9C1; }
.b-changed { background: #FFF6E5; color: #8A4B00; box-shadow: inset 0 0 0 1px #F0D6A8; }
.b-type { background: #F5F0FD; color: #6F42C1; box-shadow: inset 0 0 0 1px #D8C8F0; }
.dl-path { font-size: 12.5px; }
.dl-vals { gap: 4px 8px; align-items: center; }
.dv-old, .dv-new { font-size: 12.5px; padding: 1px 6px; border-radius: 3px; overflow-wrap: anywhere; }
.dv-old { background: #FFF1EF; color: #8E1B10; text-decoration: line-through; text-decoration-color: rgba(180, 35, 24, 0.45); box-shadow: inset 0 -1px 0 #FFC9C1; }
.dv-new { background: #EEF9F1; color: #135F2A; box-shadow: inset 0 -1px 0 #B4E6C4; }
.dv-type { padding: 1px 6px; border-radius: 3px; background: #F5F0FD; color: #6F42C1; }
.dlist-empty, .dlist-more { padding: 16px; }

/* ---------- callouts share one shape ---------- */
.notice, .diff-notes { border-radius: 6px; padding: 7px 12px; }
.errbox, .okbox { border-radius: 8px; padding: 16px 18px; }
.errbox h3, .okbox h3 { font-size: 14.5px; gap: 7px; }
.excerpt { border-radius: 6px; padding: 8px 12px; font-size: 13px; line-height: 20px; background: #fff; border-color: #F1C6C0; }
.caret { color: #B42318; }

/* ---------- search bars ---------- */
.searchbar { gap: 8px; margin-bottom: 10px; }
.search-count { min-width: 44px; text-align: right; }

@media (max-width: 600px) {
  .code { background: linear-gradient(to right, var(--gutter) 0 40px, var(--rule) 40px 41px, #fff 41px); }
  .ln { width: 41px; padding-right: 7px; }
  .lc { padding-left: 10px; }
  .gutter { min-width: 41px; }
  .dln { width: 36px; }
  .dl-row { grid-template-columns: 76px minmax(0, 1fr) 26px; padding: 9px 12px; }
}
`;
