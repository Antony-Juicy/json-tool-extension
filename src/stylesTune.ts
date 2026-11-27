/**
 * Fine-tuning pass (v12), appended last.
 * - Search highlights: teal pills with 2px of breathing room drawn by box-shadow, so the text never
 *   shifts and neighbouring characters are not covered; the current match is solid teal, white text.
 * - Input editor gutter matches the result code gutter exactly (64px, numbers end at 44px, code at
 *   76px, 8px top), and both cards have a 47px bar under the head, so the two code blocks line up.
 * - Toolbar: selects and labels become soft pills like the segmented controls, labels sit inside the
 *   control, checkboxes become switches, groups are separated by hairlines with even spacing.
 */
export const TUNE_CSS = `
:root {
  --hl: #CFEFEA;
  --hl-cur: #0F766E;
  --hl-line: #F1FAF8;
  --hl-gut: #DAF2EE;
}

/* ---------- search highlights ---------- */
mark.hit, mark.ihit {
  background: var(--hl); color: inherit; padding: 1px 0; margin: 0; border-radius: 3px;
  box-shadow: -2px 0 0 var(--hl), 2px 0 0 var(--hl);
  -webkit-box-decoration-break: clone; box-decoration-break: clone;
}
mark.hit.cur {
  background: var(--hl-cur);
  box-shadow: -2px 0 0 var(--hl-cur), 2px 0 0 var(--hl-cur), 0 1px 4px rgba(15, 118, 110, 0.35);
}
mark.hit.cur, mark.hit.cur * { color: #fff !important; font-style: normal; }
mark.ihit { color: transparent; }
mark.ihit.cur { background: #8EDBD1; box-shadow: -2px 0 0 #8EDBD1, 2px 0 0 #8EDBD1; }
.line.cur-line { background: var(--hl-line); }
.line.cur-line .gut { background: var(--hl-gut); box-shadow: inset 3px 0 0 var(--hl-cur), inset -1px 0 0 var(--rule); }
.line.cur-line .ln { color: #0B5D56; }
.trow.match { background-color: #F1FAF8; }
.trow.match::before { top: 0; bottom: 0; width: 3px; border-radius: 0; background: #14A394; }
.trow.match.sel { background-color: #EAF0FF; }

/* ---------- input editor aligned with the result code ---------- */
.gutter {
  box-sizing: border-box; width: 64px; min-width: 64px; padding: 8px 20px 64px 8px; text-align: right;
  background: var(--gutter); border-right: 1px solid var(--rule); color: var(--ln);
}
.gutter .bad { padding: 0; border-radius: 2px; box-shadow: 0 0 0 3px #B42318; background: #B42318; color: #fff; }
.editor.warn .gutter .bad { background: #B87400; box-shadow: 0 0 0 3px #B87400; }
.editor textarea, .ed-mirror-inner { padding: 8px 14px 16px 12px; }
.tree { padding: 8px 0; }

/* ---------- input bar (same height as the result search bar) ---------- */
.ibar { justify-content: space-between; }
.actgroup { display: inline-flex; align-items: center; gap: 2px; height: 30px; padding: 2px; border-radius: 8px; background: var(--soft); }
.actgroup button {
  height: 26px; padding: 0 12px; border: 0; border-radius: 6px; background: transparent; color: var(--ink);
  font-size: 13px; cursor: pointer; white-space: nowrap; transition: background 0.12s, box-shadow 0.12s;
}
.actgroup button:hover:not(:disabled) { background: #fff; box-shadow: 0 1px 2px rgba(31, 35, 40, 0.12), 0 0 0 1px rgba(31, 35, 40, 0.04); }
.actgroup button:active:not(:disabled) { background: #F7F6F2; }
.actgroup button:disabled { color: #8C959F; cursor: not-allowed; }
.actgroup button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.ibar .find-open { height: 30px; gap: 6px; padding: 0 8px 0 10px; color: var(--muted); }
.ibar .find-open:hover:not(:disabled) { color: var(--ink); }
.kbd {
  display: inline-flex; align-items: center; height: 18px; padding: 0 5px; border-radius: 4px; background: var(--soft);
  color: var(--muted); font-size: 11px; font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

/* ---------- selects: one chevron, no native chrome ---------- */
select.text {
  -webkit-appearance: none; appearance: none; cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%2357606A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 9px center; background-size: 9px 6px;
  padding-right: 26px !important;
}
.card-actions select.text, .rbar select.text {
  height: 30px; border: 0; border-radius: 8px; background-color: var(--soft); color: var(--ink); font-size: 13px; padding-left: 10px;
}
.rbar select.text { height: 28px; font-size: 12.5px; }
.card-actions select.text:hover, .rbar select.text:hover { background-color: #ECEAE4; }

/* ---------- toolbar: pills with the label inside ---------- */
.toolbar { gap: 8px; padding: 8px 10px; }
.tb-sep { height: 20px; margin: 0 6px; }
.inline-field {
  height: 30px; padding-left: 10px; gap: 0; border-radius: 8px; background: var(--soft);
  font-size: 12.5px; color: var(--muted); transition: box-shadow 0.12s, background 0.12s;
}
.inline-field:hover { background: #ECEAE4; }
.inline-field:focus-within { box-shadow: 0 0 0 2px rgba(59, 79, 216, 0.3); }
.inline-field > span:first-child { padding-right: 2px; color: var(--muted); }
.inline-field .text {
  height: 30px !important; border: 0 !important; border-radius: 0 8px 8px 0; background-color: transparent;
  color: var(--ink); font-size: 13px; font-weight: 600; padding-left: 6px; outline: none !important; box-shadow: none !important;
}
.inline-field input.text { padding-right: 10px !important; font-weight: 500; }
.toolbar .root-name { width: 180px; }
.card-sub .inline-field, .card-sub .inline-field .text { height: 28px !important; }
.card-sub .inline-field .text.num { width: 56px; padding-right: 8px !important; }
.seg.has-prefix { padding-left: 0; }
.seg-prefix { display: inline-flex; align-items: center; padding: 0 6px 0 10px; font-size: 12.5px; color: var(--muted); white-space: nowrap; }

/* ---------- switches for on/off options ---------- */
.toolbar .check, .card-sub .check, .rbar .check, .opts .check { gap: 8px; height: 30px; padding: 0 4px; font-size: 13px; }
.card-sub .check, .rbar .check { height: 28px; font-size: 12.5px; }
.toolbar .check input[type="checkbox"], .card-sub .check input[type="checkbox"],
.rbar .check input[type="checkbox"], .opts .check input[type="checkbox"] {
  -webkit-appearance: none; appearance: none; position: relative; flex: none; width: 28px; height: 16px; margin: 0;
  border-radius: 8px; background: #CFCCC3; cursor: pointer; transition: background 0.15s;
}
.toolbar .check input[type="checkbox"]::after, .card-sub .check input[type="checkbox"]::after,
.rbar .check input[type="checkbox"]::after, .opts .check input[type="checkbox"]::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 2px rgba(31, 35, 40, 0.25); transition: transform 0.15s;
}
.toolbar .check input:checked, .card-sub .check input:checked, .rbar .check input:checked, .opts .check input:checked { background: var(--accent); }
.toolbar .check input:checked::after, .card-sub .check input:checked::after,
.rbar .check input:checked::after, .opts .check input:checked::after { transform: translateX(12px); }
.toolbar .check input:focus-visible, .card-sub .check input:focus-visible,
.rbar .check input:focus-visible, .opts .check input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ---------- JSON 对比: inputs and result as cards ---------- */
.actgroup button { display: inline-flex; align-items: center; gap: 5px; }
.actgroup button svg { width: 13px; height: 13px; }
.toolbar .opts-status { height: 30px; padding: 0 4px; }
.diff-inputs { flex: 1; grid-auto-rows: minmax(280px, 1fr); gap: 16px; margin-top: 14px; }
.side-tag { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 10px; font-size: 11.5px; white-space: nowrap; }
.side-tag.old { background: #FFF1EF; color: #A1281C; }
.side-tag.new { background: #EEF9F1; color: #17702F; }
.side-tag.base { background: var(--soft); color: var(--muted); }
.diff-card { height: auto; margin-top: 16px; }
.diff-card .card-body { min-height: 180px; }
.diff-card .card-body.pad { padding: 14px 16px 16px; }
.diff-card .card-body:not(.pad) > .diff-head {
  margin: 0; padding: 9px 16px; min-height: 47px; border-bottom: 1px solid var(--rule); background: var(--gutter);
}
.diff-card .card-body:not(.pad) > .diff-notes { margin: 0; border-radius: 0; border-width: 0 0 1px 0; padding: 7px 16px; }
.diff-card .card-body:not(.pad) > .dsplit, .diff-card .card-body:not(.pad) > .dlist {
  border: 0; border-radius: 0; max-height: 680px;
}
.diff-card .card-body > .errbox.short, .diff-card .card-body > .empty.short, .diff-card .card-body > .okbox { margin: 16px; }
.diff-card .card-body > .empty.short { border-radius: 8px; }
.diff-card .dhead-row { background: #fff; }
.diff-card .diff-nav { margin-left: auto; }
.diff-card .sum-chip { height: 24px; }
.diff-card .patch-ops, .diff-card .patch-out .code, .diff-card .apply-diff .dsplit, .diff-card .apply-diff .dlist { box-shadow: none; }

@media (max-width: 600px) {
  .gutter { width: 52px; min-width: 52px; padding-right: 18px; }
  .tb-sep { display: none; }
  .ibar .find-open .kbd { display: none; }
}
`;
