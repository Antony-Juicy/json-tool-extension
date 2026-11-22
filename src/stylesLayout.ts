/**
 * Layout v2: one toolbar strip per tool, and every pane is a card (head / optional bars / body /
 * foot) so the input and the result line up and read as one instrument. Appended last.
 */
export const LAYOUT_CSS = `
:root { --card-border: #DEDBD2; --card-h: 720px; --soft: #F3F2EE; }
.app { max-width: 1520px; }

/* ---------- segmented controls: soft track, raised selection ---------- */
.seg { height: 30px; padding: 2px; gap: 2px; border: 0; border-radius: 8px; background: var(--soft); overflow: visible; }
.seg button { height: 26px; padding: 0 11px; border-radius: 6px; color: var(--muted); font-size: 13px; transition: background 0.12s, color 0.12s; }
.seg button + button { border-left: 0; }
.seg button:hover:not(:disabled) { color: var(--ink); }
.seg button[aria-pressed="true"] { background: #fff; color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgba(31, 35, 40, 0.12), 0 0 0 1px rgba(31, 35, 40, 0.04); }
.seg.xs, .seg.small { height: 28px; }
.seg.xs button, .seg.small button { height: 24px; padding: 0 8px; font-size: 12.5px; display: inline-flex; align-items: center; justify-content: center; }
.seg.xs button svg, .seg.small button svg { width: 13px; height: 13px; }

/* ---------- toolbar strip ---------- */
.toolbar, .opts {
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-top: 16px; padding: 9px 12px;
  background: #fff; border: 1px solid var(--card-border); border-radius: 10px; border-bottom: 1px solid var(--card-border);
}
.tb-sep { width: 1px; height: 22px; background: #E3E1DA; flex: none; }
.tb-spacer { flex: 1 1 0; }
.inline-field { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--muted); white-space: nowrap; }
.inline-field > span:first-child { color: var(--muted); }
.toolbar .text, .opts .text { height: 30px; width: auto; border-radius: 7px; }
.toolbar .root-name { width: 190px; }
.toolbar .check, .opts .check { font-size: 13px; color: var(--ink); }
.opts .field { flex-direction: row; align-items: center; gap: 8px; }
.opts .field > .lbl { font-size: 12.5px; }
.opts .checks { height: auto; gap: 12px; }

/* ---------- panes as cards ---------- */
.main { margin-top: 14px; gap: 16px; }
.card {
  display: flex; flex-direction: column; min-width: 0; height: var(--card-h);
  background: #fff; border: 1px solid var(--card-border); border-radius: 10px; overflow: hidden;
  box-shadow: 0 1px 2px rgba(31, 35, 40, 0.04);
}
.main.stack .card { height: 540px; }
.card.has-error { border-color: #E8B4AE; }
.card.has-warn { border-color: #E9C98A; }
.card-head {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; min-height: 48px; padding: 8px 10px 8px 16px;
  border-bottom: 1px solid var(--rule);
}
.card-title { margin: 0; font-size: 14px; font-weight: 600; color: var(--ink); white-space: nowrap; }
.card-meta { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.card-actions { margin-left: auto; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.card-body { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.card-body > .editor, .card-body > .code, .card-body > .tree-wrap, .card-body > .errbox, .card-body > .empty {
  flex: 1 1 auto; height: auto !important; min-height: 0; border: 0; border-radius: 0; box-shadow: none; margin: 0;
}
.card-body > .editor:focus-within { outline: none; }
.card-body > .errbox { overflow: auto; background: #FFFAF9; }
.card-body > .empty { background: #FCFBF8; }
.card-foot {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; min-height: 36px; margin: 0; padding: 7px 16px;
  border-top: 1px solid var(--rule); background: var(--gutter); font-size: 12.5px; color: var(--muted);
}
.card-foot b { color: var(--ink); font-weight: 600; }
.card-foot.status { margin-top: 0; }
.card-foot .foot-notes { margin: 0; }
.card-sub {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; padding: 7px 12px 7px 16px;
  border-bottom: 1px solid var(--rule); background: #FCFBF8; font-size: 12.5px;
}
.card-sub .check { font-size: 12.5px; }
.card-sub-note { margin-left: auto; font-size: 12px; color: var(--muted); }
.card-note { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; padding: 7px 16px; border-bottom: 1px solid #DDE3F5; background: #F3F5FB; font-size: 12.5px; color: #3D4A73; }
.card-note.warn { background: #FFF8EB; border-bottom-color: #F0D6A8; color: #7A4300; }
.card .repair { margin: 0; border-radius: 0; border-width: 0 0 1px 0; }

/* view tabs inside a card head */
.vtabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: var(--soft); }
.vtabs button {
  height: 26px; padding: 0 12px; border: 0; border-radius: 6px; background: transparent; color: var(--muted);
  font-size: 13px; cursor: pointer; white-space: nowrap; transition: background 0.12s, color 0.12s;
}
.vtabs button:hover { color: var(--ink); }
.vtabs button[aria-selected="true"] { background: #fff; color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgba(31, 35, 40, 0.12), 0 0 0 1px rgba(31, 35, 40, 0.04); }
.vtabs button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

/* compact buttons and selects */
.btn.sm { height: 28px; padding: 0 10px; font-size: 12.5px; border-radius: 7px; }
.btn.xs { height: 26px; padding: 0 8px; font-size: 12.5px; border-radius: 6px; }
.btn.xs svg { width: 13px; height: 13px; }
.text.xs { height: 28px; padding: 0 6px; font-size: 12.5px; width: auto; border-radius: 6px; }
.text.xs.num { width: 64px; }
.sample-pick { max-width: 112px; }
.tbtn {
  width: 28px; height: 28px; flex: none; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid #D0CEC6; border-radius: 6px; background: #fff; color: var(--muted); cursor: pointer;
}
.tbtn:hover { color: var(--ink); background: #FAF9F6; }
.tbtn.on { background: #EEF1FF; border-color: #C9D1F7; color: var(--accent); }
.tbtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.tbtn svg { width: 14px; height: 14px; }

/* ---------- result bar: one field for search and JSONPath ---------- */
.rbar {
  position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; padding: 8px 10px;
  border-bottom: 1px solid var(--rule); background: var(--gutter);
}
.ff {
  flex: 1 1 280px; min-width: 0; display: flex; align-items: center; gap: 4px; height: 30px; padding: 0 4px 0 2px;
  border: 1px solid #D0CEC6; border-radius: 7px; background: #fff; transition: border-color 0.12s, box-shadow 0.12s;
}
.ff:focus-within { border-color: #8E99E6; box-shadow: 0 0 0 3px rgba(59, 79, 216, 0.14); }
.ff.bad { border-color: #E8A39B; }
.ff.bad:focus-within { box-shadow: 0 0 0 3px rgba(180, 35, 24, 0.12); }
.ff-mode { display: inline-flex; flex: none; gap: 2px; padding: 2px; border-radius: 5px; background: var(--soft); }
.ff-mode button {
  display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border: 0; border-radius: 4px;
  background: transparent; color: var(--muted); font-size: 12px; cursor: pointer; white-space: nowrap;
}
.ff-mode button svg { width: 12px; height: 12px; }
.ff-mode button[aria-pressed="true"] { background: #fff; color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgba(31, 35, 40, 0.14); }
.ff-mode button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.ff-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); display: inline-block; }
.ff-ico { display: inline-flex; padding-left: 6px; color: var(--muted); }
.ff-ico svg { width: 14px; height: 14px; }
.ff-input-wrap { position: relative; flex: 1 1 auto; min-width: 60px; height: 100%; }
.ff-input { width: 100%; height: 100%; padding: 0 6px; border: 0; outline: none; background: transparent; color: var(--ink); font-size: 13px; }
.ff-input::placeholder { color: #6E7781; }
.ff-input.mono { font-size: 12.5px; }
.ff-count { flex: none; padding: 0 4px; font-size: 12px; color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.ff-count.bad { color: #B42318; }
.ff-chip {
  flex: 0 1 auto; max-width: 180px; height: 22px; padding: 0 8px; border: 1px solid #C9D1F7; border-radius: 11px;
  background: #EEF1FF; color: #2F3FB0; font-size: 11.5px; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ff.disabled { opacity: 0.6; }
.rb-group { display: flex; gap: 6px; }
.rb-right { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.rb-check { font-size: 12.5px; }
.rb-error { flex-basis: 100%; padding: 0 2px; font-size: 12px; color: #B42318; }
.sugg {
  position: absolute; top: calc(100% + 6px); left: 0; min-width: 320px; max-width: 520px; z-index: 30; padding: 4px;
  background: #fff; border: 1px solid #D0CEC6; border-radius: 8px; box-shadow: 0 10px 28px rgba(31, 35, 40, 0.16);
  max-height: 300px; overflow: auto;
}
.sugg-head { padding: 6px 8px 3px; font-size: 11.5px; font-weight: 600; color: var(--muted); }
.sugg-item { padding: 5px 8px; border-radius: 5px; font-size: 12.5px; color: #0550AE; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sugg-item.on { background: #EEF1FF; }

/* ---------- code view: gutter with fold chevrons ---------- */
.code { background: linear-gradient(to right, var(--gutter) 0 63px, var(--rule) 63px 64px, #fff 64px); }
.code-inner { padding: 8px 0 16px; }
.gut { position: sticky; left: 0; z-index: 1; flex: none; display: inline-flex; width: 64px; background: var(--gutter); box-shadow: inset -1px 0 0 var(--rule); }
.code .ln { position: static; width: 44px; padding: 0 2px 0 0; background: transparent; box-shadow: none; }
.fg { width: 20px; flex: none; display: inline-flex; align-items: center; justify-content: center; }
.fold-btn {
  width: 16px; height: 16px; padding: 0; border: 0; border-radius: 3px; background: none; color: #8C959F;
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: opacity 0.12s;
}
.code:hover .fold-btn, .line.folded .fold-btn, .fold-btn:focus-visible { opacity: 1; }
.fold-btn:hover { background: #ECEAE3; color: var(--ink); }
.fold-btn svg { width: 11px; height: 11px; transition: transform 0.12s; }
.fold-btn.open svg { transform: rotate(90deg); }
.code .lc { padding-left: 12px; }
.fold-ph {
  display: inline-flex; align-items: center; height: 18px; margin: 0 4px; padding: 0 6px; vertical-align: 1px;
  border: 1px solid #D9D6CC; border-radius: 4px; background: var(--soft); color: var(--muted); cursor: pointer;
  font-size: 11.5px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
}
.fold-ph:hover { background: #E8ECFF; border-color: #C9D1F7; color: var(--accent); }
.line.cur-line { background: #FFFAEB; }
.line.cur-line .gut { background: #FFEFC2; box-shadow: inset 3px 0 0 var(--here), inset -1px 0 0 var(--rule); }
.line.cur-line .ln { color: #7A4300; font-weight: 600; background: transparent; box-shadow: none; }

/* ---------- search highlights: flat, no padding, so neighbours never overlap ---------- */
mark.hit { padding: 0; margin: 0; border-radius: 2px; background: #FFEBAD; box-shadow: inset 0 -2px 0 #F0C64A; color: inherit; }
mark.hit.cur { background: #FFC94D; box-shadow: inset 0 0 0 1px #C98500; }
mark.ihit { padding: 0; border-radius: 2px; background: #FFEBAD; box-shadow: inset 0 -2px 0 #F0C64A; }
mark.ihit.cur { background: #FFC94D; box-shadow: inset 0 0 0 1px #C98500; }

/* ---------- tree view ---------- */
.trow, .trow:hover, .trow.sel, .trow.match { background-image: none; }
.trow { gap: 0; }
.tguides { position: absolute; left: 17px; top: 0; bottom: 0; pointer-events: none; background-image: repeating-linear-gradient(to right, #E2DFD6 0 1px, transparent 1px 18px); }
.tw, .tw-sp { position: relative; margin-right: 4px; }
.tk-colon { margin: 0 8px 0 0; color: #8C959F; }
.tk-count { margin-left: 8px; }
.trow.sel { background-color: #EEF1FF; box-shadow: inset 3px 0 0 var(--accent); }
.trow-copy { margin-left: 10px; }
.tree { padding: 4px 0; }
.tree-detail { padding: 8px 14px; }

/* ---------- input editor inside a card ---------- */
.card-body .editor { background: #fff; }
.card-body .gutter { padding-top: 8px; }
.ed-find-btn { top: 8px; right: 14px; }
.find { top: 8px; right: 14px; }

@media (max-width: 960px) {
  :root { --card-h: 580px; }
  .main.stack .card { height: var(--card-h); }
  .tb-spacer { display: none; }
}
@media (max-width: 600px) {
  :root { --card-h: 500px; }
  .tb-sep { display: none; }
  .toolbar { gap: 8px 12px; }
  .toolbar .root-name { width: 150px; }
  .card-head { padding: 8px 10px 8px 12px; }
  .card-actions { margin-left: 0; }
  .code { background: linear-gradient(to right, var(--gutter) 0 51px, var(--rule) 51px 52px, #fff 52px); }
  .gut { width: 52px; }
  .code .ln { width: 34px; }
  .fg { width: 18px; }
  .sugg { min-width: 0; right: 0; }
}
`;
