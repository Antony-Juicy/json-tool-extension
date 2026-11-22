/**
 * v18 theme, appended last: one coordinated palette for both panes, two layers.
 *
 * Palette (same hues on both sides): keys navy, strings jade, numbers cobalt, true/false/null
 * terracotta, punctuation soft grey.
 * - Input = "source" layer: warm paper (#FAF9F6), recessed, no shadow; the palette at reduced
 *   saturation, normal weight, lighter guides. While focused it lifts to white and the colors
 *   come up, so editing stays comfortable.
 * - Result = "output" layer: white, raised (soft shadow, 2px indigo line on top of the head), the
 *   palette at full strength, numbers and literals semibold.
 * Both sides use 13px / 22px so rows line up across the panes.
 */
export const THEME_CSS = `
:root {
  --k: #2A4A78;      --k-soft: #5F769A;
  --s: #1F7A57;      --s-soft: #5C927B;
  --n: #2D57C9;      --n-soft: #6380C8;
  --l: #BC5A1F;      --l-soft: #C08060;
  --p: #8A919B;      --p-soft: #A9AEB5;
  --paper: #FAF9F6;  --paper-gut: #F4F2ED;
  --guide: #DCE0E6;  --guide-soft: #E7E5DF;
}

/* ---------- card layers ---------- */
.main > .card:first-child {
  background: var(--paper); border-color: #E6E3DB; box-shadow: none;
}
.main > .card:first-child .card-head { background: var(--paper); }
.main > .card:first-child .card-title { color: #57606A; font-weight: 600; }
.main > .card:first-child .rbar { background: #F6F4EF; }
.main > .card:first-child .card-foot { background: #F6F4EF; }
.main > .card:last-child {
  background: #fff; border-color: #DADDE4;
  box-shadow: 0 1px 2px rgba(31, 35, 40, 0.05), 0 10px 28px rgba(31, 35, 40, 0.06);
}
.main > .card:last-child .card-head { box-shadow: inset 0 2px 0 #5B6BE8; }
.main > .card:last-child .card-title { color: #1F2328; }

/* ---------- shared metrics: 13px / 22px on both sides ---------- */
.code.v2, .card-body > .code.v2 { font-size: 13px; line-height: 22px; }
.code.v2 .line, .code.v2 .lead { min-height: 22px; }
.editor textarea, .ed-mirror-inner, .gutter { font-size: 13px; line-height: 22px; }
.ml { height: 22px; }

/* ---------- result: full palette ---------- */
.code.v2 .t-key, .tree .tk-key { color: var(--k); }
.code.v2 .t-string, .tree .t-string { color: var(--s); }
.code.v2 .t-number, .tree .t-number { color: var(--n); font-weight: 600; }
.code.v2 .t-literal, .tree .t-literal { color: var(--l); font-weight: 600; }
.code.v2.lang-json .ltx { color: var(--p); }
.code.v2 .ig, .trow .tg { border-left-color: var(--guide); }
.code.v2 .line:hover .ltx { background: #F2F5FB; }
.cfold, .tw { color: #A3AAB3; }
.code.v2.lang-json .fold-ph { color: #6B7480; }

/* ---------- input: same hues, quieter ---------- */
.card-body > .editor, .editor.rich { background: var(--paper); }
.editor .gutter { background: var(--paper-gut); color: #A7ACB3; border-right-color: #E8E5DE; }
.gutter .cur { color: #57606A; }
.ed-mirror-inner { color: var(--p-soft); }
.ed-mirror .t-key { color: var(--k-soft); }
.ed-mirror .t-string { color: var(--s-soft); }
.ed-mirror .t-number { color: var(--n-soft); font-weight: 400; }
.ed-mirror .t-literal { color: var(--l-soft); font-weight: 400; }
.mig { border-left-color: var(--guide-soft); }
.ml.caret { background: rgba(91, 107, 232, 0.06); box-shadow: none; }

/* focused: lifts to white, colors come up (still normal weight) */
.card-body > .editor:focus-within, .editor.rich:focus-within { background: #fff; }
.editor:focus-within .gutter { background: #F7F6F3; color: #8C959F; }
.editor:focus-within .ed-mirror-inner { color: var(--p); }
.editor:focus-within .ed-mirror .t-key { color: var(--k); }
.editor:focus-within .ed-mirror .t-string { color: var(--s); }
.editor:focus-within .ed-mirror .t-number { color: var(--n); }
.editor:focus-within .ed-mirror .t-literal { color: var(--l); }
.editor:focus-within .mig { border-left-color: var(--guide); }
.editor:focus-within .ml.caret { background: rgba(91, 107, 232, 0.08); }
.main > .card:first-child:focus-within { border-color: #CFD5F5; }

/* side-by-side diff and TypeScript outputs pick up the same tones */
.dtx .t-key { color: var(--k); }
.dtx .t-string { color: var(--s); }
.dtx .t-number { color: var(--n); font-weight: 600; }
.dtx .t-literal { color: var(--l); font-weight: 600; }
.code.v2 .t-keyword { color: #7048C2; }
.code.v2 .t-builtin { color: var(--n); font-weight: 400; }
.code.v2 .t-type { color: var(--k); }

/* click to copy: only the key / value tokens are targets */
.code.v2 .line.pickable .ltx { cursor: text; }
.code.v2 .line.pickable :is(.t-key, .t-string, .t-number, .t-literal) {
  cursor: pointer; border-radius: 3px; transition: background 0.1s, box-shadow 0.1s;
}
.code.v2 .line.pickable :is(.t-key, .t-string, .t-number, .t-literal):hover {
  background: rgba(91, 107, 232, 0.14); box-shadow: 0 0 0 2px rgba(91, 107, 232, 0.14);
}
.code.v2 .line.pickable :is(.t-key, .t-string, .t-number, .t-literal):active {
  background: rgba(91, 107, 232, 0.24); box-shadow: 0 0 0 2px rgba(91, 107, 232, 0.24);
}
.code.v2 .ledit { cursor: pointer; }
/* the pencil sits exactly in the middle of the 22px line: a 20px box on the line top + 1px */
.code.v2 .ledit {
  width: 22px; height: 20px; margin: 1px 0 0 8px; vertical-align: top; line-height: 0;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 5px;
}
.code.v2 .ledit svg { width: 12px; height: 12px; display: block; }
.trow { cursor: default; }
.trow .tk-key, .trow .tk-val { cursor: pointer; border-radius: 3px; transition: background 0.1s, box-shadow 0.1s; }
.trow .tk-key:hover, .trow .tk-val:hover { background: rgba(91, 107, 232, 0.14); box-shadow: 0 0 0 2px rgba(91, 107, 232, 0.14); }
.trow-edit { margin-left: 6px; }
.trow-edit + .trow-copy { margin-left: 2px; }
.trow:hover .trow-edit, .trow.sel .trow-edit { opacity: 1; }
.trow-edit:hover { color: var(--accent); background: #E3E9F9; }

/* block hover: the block around the hovered line gets a soft tint from its own indent level,
   and its indent guide turns solid */
.code.v2 .lc { position: relative; }
.code.v2 .lead, .code.v2 .ltx { position: relative; z-index: 1; }
.code.v2 .blkbg { position: absolute; top: 0; bottom: 0; right: 0; z-index: 0; pointer-events: none; background: rgba(91, 107, 232, 0.05); }
.code.v2 .blkbg.top { top: 2px; border-top-left-radius: 6px; }
.code.v2 .blkbg.bottom { bottom: 2px; border-bottom-left-radius: 6px; }
.code.v2 .blkbg.single { top: 2px; bottom: 2px; border-radius: 6px 0 0 6px; }
.code.v2 .ig.on { border-left: 1.5px solid #9DA9E8; }
.code.v2 .ig { z-index: 1; }`;
