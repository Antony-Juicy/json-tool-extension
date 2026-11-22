/**
 * v19, appended last.
 * - Input uses the classic editor palette from the user's reference at full strength (no muted
 *   state): keys #A31515, strings #0451A5 (URLs underlined), numbers #098658, literals #0000FF,
 *   bracket pairs cycling blue / green / brown by depth, solid light indent guides.
 * - Both cards share the same surface: paper background, no shadow; while focused the content area
 *   turns white and the card border light indigo (same on the input and the result).
 * - Search highlights: lavender pills with 1px x 4px padding and 2px margin; current match violet
 *   with white text; current line pale lavender.
 * - Nothing is clipped: card bars and footers never shrink; the result bar keeps its controls from
 *   overlapping (labels collapse to icons by card width, and it wraps only when truly too narrow).
 */
export const V19_CSS = `
:root {
  --hl: #ECE7FF; --hl-edge: #C9BCFB;
  --hl-cur: #7C5CFA; --hl-cur-edge: #6646E8;
  --hl-line: #F8F6FF; --hl-gut: #EFEAFF;
}

/* ---------- input: classic palette, always full strength ---------- */
.ed-mirror-inner, .editor:focus-within .ed-mirror-inner { color: #1F2328; }
.ed-mirror .t-key, .editor:focus-within .ed-mirror .t-key { color: #A31515; }
.ed-mirror .t-string, .editor:focus-within .ed-mirror .t-string { color: #0451A5; }
.ed-mirror .t-number, .editor:focus-within .ed-mirror .t-number { color: #098658; font-weight: 400; }
.ed-mirror .t-literal, .editor:focus-within .ed-mirror .t-literal { color: #0000FF; font-weight: 400; }
.ed-mirror .t-url { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }
.ed-mirror .br.b0 { color: #0431FA; }
.ed-mirror .br.b1 { color: #319331; }
.ed-mirror .br.b2 { color: #7B3814; }
.mig, .editor:focus-within .mig { border-left: 1px solid #DDE1E5; }
.ml.caret .mig { border-left-color: #D0D5DB; }

/* ---------- one surface for both cards ---------- */
.main > .card, .main > .card:first-child, .main > .card:last-child {
  background: var(--paper); border-color: #E6E3DB; box-shadow: none;
}
.main > .card .card-head, .main > .card:last-child .card-head { background: var(--paper); box-shadow: none; }
.main > .card .card-title, .main > .card:first-child .card-title { color: #1F2328; font-weight: 600; }
.main > .card .rbar, .main > .card .card-foot, .main > .card .card-sub { background: #F6F4EF; }
.main > .card:focus-within, .main > .card:first-child:focus-within { border-color: #CFD5F5; }

/* content areas: paper at rest, white while focused (input editor and result alike) */
.card-body > .editor, .editor.rich, .card-body > .code.v2, .card-body > .tree-wrap, .card-body > .tree-wrap .tree { background: var(--paper); }
.editor .gutter, .code.v2 .gut { background: var(--paper-gut); }
.code.v2.with-ln { background: linear-gradient(to right, var(--paper-gut) 0 47px, #E8E5DE 47px 48px, var(--paper) 48px); }
.main > .card:focus-within .card-body > .editor, .main > .card:focus-within .editor.rich,
.main > .card:focus-within .card-body > .code.v2, .main > .card:focus-within .card-body > .tree-wrap,
.main > .card:focus-within .card-body > .tree-wrap .tree { background: #fff; }
.main > .card:focus-within .editor .gutter, .main > .card:focus-within .code.v2 .gut { background: #F7F6F3; }
.main > .card:focus-within .code.v2.with-ln { background: linear-gradient(to right, #F7F6F3 0 47px, #ECEAE4 47px 48px, #fff 48px); }
/* (v21) no whole-line hover pill: a field shows hover only on its key / value token,
   and only a level line (opener / closer) lights up its block */
.code.v2 .line:hover .ltx { background: transparent; }

/* (v22) the input editor always keeps the white "editing" surface, focused or not */
.main > .card:first-child .card-body > .editor,
.main > .card:first-child .editor.rich,
.card-body > .editor, .editor.rich { background: #fff; }
.main > .card:first-child .editor .gutter, .editor .gutter { background: #F7F6F3; color: #8C959F; }

/* (v23) code view hover = tree view hover: the hovered row only, full width, same tint,
   with its ✎ and copy icons; no block-level tint */
.code.v2 .line:hover, .trow:hover { background-color: #F0F4FD; }
.code.v2 .line.cur-line:hover { background-color: transparent; }
.code.v2 .blkbg { display: none; }
.code.v2 .ig.on { border-left: 1px dashed var(--guide); }
.code.v2 .lcopy { margin-left: 2px; }
.code.v2 .line.pickable:hover .lcopy { opacity: 1; }
.code.v2 .lcopy:hover { background: #E3E9F9; color: var(--accent); }

/* (v24) hand cursor on everything you can act on: editable / copyable rows, their tokens and icons */
.code.v2 .line.editable, .code.v2 .line.editable .lc, .code.v2 .line.editable .ltx,
.code.v2 .line.pickable, .code.v2 .line.pickable .lc, .code.v2 .line.pickable .ltx,
.code.v2 .ledit, .code.v2 .cfold, .code.v2 .fold-ph,
.trow, .trow .tk-key, .trow .tk-val, .trow .tw, .trow .icon-btn { cursor: pointer; }

/* (v25) the result keeps its background when clicked: no focus lift on the result card */
.main > .card:last-child:focus-within { border-color: #E6E3DB; }
.main > .card:last-child:focus-within .card-body > .code.v2,
.main > .card:last-child:focus-within .card-body > .tree-wrap,
.main > .card:last-child:focus-within .card-body > .tree-wrap .tree { background: var(--paper); }
.main > .card:last-child:focus-within .code.v2 .gut { background: var(--paper-gut); }
.main > .card:last-child:focus-within .code.v2.with-ln {
  background: linear-gradient(to right, var(--paper-gut) 0 47px, #E8E5DE 47px 48px, var(--paper) 48px);
}
.code.v2:focus, .code.v2:focus-visible, .tree:focus { outline: none; box-shadow: none; }
.code.v2 .line.pickable :is(.t-key, .t-string, .t-number, .t-literal):active { background: rgba(91, 107, 232, 0.14); box-shadow: 0 0 0 2px rgba(91, 107, 232, 0.14); }

/* (v26) result replace uses the same floating widget as the input's find & replace */
.card-body > .find { top: 10px; right: 18px; z-index: 6; }
.find .rep-scope { height: 28px; flex: none; width: auto; border: 0; border-radius: 8px; background-color: var(--soft); color: var(--ink); font-size: 12.5px; padding-left: 10px; }
.find .rep-scope:hover { background-color: #ECEAE4; }
.find .find-rep .search-field { min-width: 0; }
.find .btn.sm { flex: none; }
.find-note { min-height: 18px; }

/* (v27) left edges line up: card titles, the bar under the head and the code all start at 16px.
   The input's action group drops its pill track so the first label (格式化) starts exactly under the
   title; each action keeps its own hover pill. */
.card > .rbar { padding-left: 16px; padding-right: 12px; }
.ibar .actgroup { padding: 0; gap: 4px; background: transparent; }
.ibar .actgroup button { padding: 0 10px; }
.ibar .actgroup button:first-child { margin-left: -10px; }
/* (v29) bottom edges line up: both cards end with one 40px footer, text starting at 16px.
   Schema options live in the result footer (right side) instead of a second bar. */
.card > .card-foot { min-height: 40px; height: 40px; box-sizing: border-box; padding: 0 16px; display: flex; align-items: center; gap: 14px; flex-wrap: nowrap; overflow: hidden; white-space: nowrap; }
.card > .card-foot > * { flex: none; }
.card > .card-foot > span { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.foot-opts { margin-left: auto; display: flex; align-items: center; gap: 16px; }
.foot-field { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12.5px; }
.foot-field select { height: 26px; border: 0; border-radius: 6px; background-color: transparent; color: var(--ink); font-size: 12.5px; font-weight: 600; padding: 0 4px; cursor: pointer; }
.foot-field select:hover { background-color: var(--soft); }
.foot-opts .check { font-size: 12.5px; gap: 6px; }

.ibar .actgroup button:hover:not(:disabled) { background: var(--soft); box-shadow: none; }

/* (v28) header: status only when it needs attention; settings behind a gear after the tabs */
.settings-status:empty { display: none; }
.smenu { position: relative; display: flex; align-items: center; margin-left: 8px; align-self: center; }
.smenu-btn { width: 32px; height: 32px; display: grid; place-items: center; border: 0; border-radius: 8px; background: transparent; color: var(--muted); cursor: pointer; }
.smenu-btn svg { width: 17px; height: 17px; }
.smenu-btn:hover, .smenu-btn.on { background: var(--soft); color: var(--ink); }
.smenu-pop, .vmenu-pop { position: absolute; top: calc(100% + 6px); right: 0; z-index: 40; background: #fff; border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 10px 30px rgba(20, 20, 40, 0.12); padding: 6px; text-align: left; }
.smenu-pop { width: 280px; padding: 14px; }
.smenu-title { font-size: 14px; font-weight: 600; color: var(--ink); }
.smenu-text { margin: 6px 0 10px; font-size: 12.5px; line-height: 1.6; color: var(--muted); font-weight: 400; }
.smenu-state { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #2F7D4F; }
.smenu-state svg { width: 14px; height: 14px; }
.smenu-state.bad { color: #B23C0A; }
.smenu-sep { height: 1px; background: var(--line); margin: 10px -14px; }
.vmenu-sep { height: 1px; background: var(--line); margin: 6px -6px; }
.smenu-item { display: block; height: 34px; padding: 0 10px; margin: 0 -10px; width: calc(100% + 20px); text-align: left; border: 0; border-radius: 8px; background: transparent; color: var(--ink); font-size: 13px; cursor: pointer; }
.smenu-item:hover { background: var(--soft); }
.smenu-confirm { font-size: 12.5px; color: var(--muted); line-height: 1.6; }
.smenu-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
.btn.danger { background: #B23C0A; border-color: #B23C0A; color: #fff; }
.btn.danger:hover { background: #962F06; }

/* result bar: one 显示 menu instead of unlabeled icon buttons */
.vmenu { position: relative; flex: none; }
.vmenu-btn { height: 32px; display: inline-flex; align-items: center; gap: 6px; padding: 0 10px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--ink); font-size: 13px; cursor: pointer; white-space: nowrap; }
.vmenu-btn svg { width: 15px; height: 15px; color: var(--muted); }
.vmenu-btn .vmenu-caret { width: 13px; height: 13px; }
.vmenu-btn:hover, .vmenu-btn.open { background: var(--soft); }
.vmenu-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
.vmenu-pop { width: 240px; }
.vmenu-head { padding: 6px 10px 4px; font-size: 12px; color: var(--muted); }
.vmenu-item { width: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; text-align: left; min-height: 34px; padding: 6px 10px; border: 0; border-radius: 8px; background: transparent; color: var(--ink); font-size: 13px; cursor: pointer; }
.vmenu-item:hover { background: var(--soft); }
.vmenu-sub { flex-basis: 100%; font-size: 12px; color: var(--muted); }
.vmenu-item.check .vmenu-sub { padding-left: 24px; }
.vmenu-box { width: 16px; height: 16px; border: 1.5px solid #B9B6AE; border-radius: 4px; position: relative; flex: none; }
.vmenu-box.on { background: var(--accent); border-color: var(--accent); }
.vmenu-box.on::after { content: ''; position: absolute; left: 4.5px; top: 1.5px; width: 4px; height: 8px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.vmenu-levels { display: flex; align-items: center; gap: 4px; padding: 4px 10px 6px; font-size: 13px; color: var(--muted); }
.vmenu-levels button { width: 26px; height: 26px; border: 0; border-radius: 6px; background: var(--soft); color: var(--ink); font-size: 12.5px; cursor: pointer; }
.vmenu-levels button:hover { background: #E3E9F9; color: var(--accent); }

/* (v30) 显示 menu, compact: every row 34px, icon column at 10px, label, right-aligned hint/switch/chips */
.vmenu .vmenu-pop { width: 232px; padding: 6px; border-radius: 12px; }
.vmenu-pop .vm-head { padding: 8px 10px 4px; font-size: 12px; line-height: 16px; color: var(--muted); font-weight: 400; }
.vmenu-pop .vm-sep { height: 1px; background: var(--line); margin: 6px 4px; }
.vmenu-pop .vm-row { box-sizing: border-box; width: 100%; height: 34px; margin: 0; padding: 0 10px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 8px; background: transparent; color: var(--ink); font: inherit; font-size: 13px; line-height: 1; text-align: left; cursor: pointer; box-shadow: none; }
.vmenu-pop button.vm-row:hover { background: var(--soft); }
.vmenu-pop .vm-row.vm-static { cursor: default; }
.vmenu-pop .vm-ic { width: 15px; height: 15px; flex: none; color: var(--muted); }
.vmenu-pop .vm-label { flex: 1 1 auto; white-space: nowrap; }
.vmenu-pop .vm-hint { flex: none; font-size: 12px; color: var(--muted); }
.vmenu-pop .vm-levels { flex: none; display: inline-flex; gap: 2px; padding: 2px; border-radius: 7px; background: var(--soft); }
.vmenu-pop .vm-levels button { width: 24px; height: 22px; margin: 0; padding: 0; border: 0; border-radius: 5px; background: transparent; color: var(--ink); font-size: 12px; line-height: 22px; cursor: pointer; box-shadow: none; }
.vmenu-pop .vm-levels button:hover { background: #fff; color: var(--accent); box-shadow: 0 1px 2px rgba(20, 20, 40, 0.1); }
.vmenu-pop .vm-switch { flex: none; position: relative; width: 28px; height: 16px; border-radius: 8px; background: #CFCCC4; transition: background 0.15s; }
.vmenu-pop .vm-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); transition: transform 0.15s; }
.vmenu-pop .vm-switch.on { background: var(--accent); }
.vmenu-pop .vm-switch.on::after { transform: translateX(12px); }

/* (v31) 偏好设置 popover: same card language as the 显示 menu */
.smenu .smenu-pop { box-sizing: border-box; width: 264px; padding: 6px; border: 1px solid var(--line); border-radius: 12px; background: #fff; box-shadow: 0 10px 30px rgba(20, 20, 40, 0.12); text-align: left; font-weight: 400; white-space: normal; }
.smenu-pop .sm-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px 2px; }
.smenu-pop .sm-title { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.smenu-pop .sm-pill { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 8px; border-radius: 10px; background: #E8F3EC; color: #24683F; font-size: 11.5px; white-space: nowrap; }
.smenu-pop .sm-pill svg { width: 12px; height: 12px; }
.smenu-pop .sm-pill.wait { background: var(--soft); color: var(--muted); }
.smenu-pop .sm-pill.bad { background: #FBEAE3; color: #A3360A; }
.smenu-pop .sm-desc { margin: 4px 10px 8px; font-size: 12px; line-height: 18px; color: var(--muted); }
.smenu-pop .sm-err { display: flex; align-items: center; gap: 8px; margin: 0 10px 8px; font-size: 12px; color: #A3360A; }
.smenu-pop .sm-sep { height: 1px; background: var(--line); margin: 2px 4px 4px; }
.smenu-pop .sm-row { box-sizing: border-box; width: 100%; height: 34px; margin: 0; padding: 0 10px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 8px; background: transparent; color: var(--ink); font: inherit; font-size: 13px; text-align: left; cursor: pointer; box-shadow: none; }
.smenu-pop .sm-row:hover { background: var(--soft); }
.smenu-pop .sm-ic { width: 15px; height: 15px; flex: none; color: var(--muted); }
.smenu-pop .sm-confirm { padding: 8px 10px 6px; }
.smenu-pop .sm-confirm-text { font-size: 12.5px; line-height: 18px; color: var(--ink); }
.smenu-pop .sm-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 10px; }

/* jump-to-input crosshair: shown on row hover next to ✎ and copy */
.code.v2 .llocate { margin-left: 2px; }
.code.v2 .line:hover .llocate { opacity: 1; }
.code.v2 .llocate:hover { background: #E3E9F9; color: var(--accent); }
.trow:hover .trow-locate, .trow.sel .trow-locate { opacity: 1; }
.trow-locate { margin-left: 2px; }
.trow-locate:hover { color: var(--accent); background: #E3E9F9; }
/* the field selected in the input stays visible even though the textarea text is transparent */
.editor.rich textarea::selection { background: rgba(124, 92, 250, 0.28); }

/* footers: one line, same height on both sides */
.card > .card-foot { height: 40px; min-height: 40px; flex-wrap: nowrap; overflow: hidden; white-space: nowrap; }
.card > .card-foot > span { overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; min-width: 0; }
.card > .card-foot > .foot-hint { flex: 0 0 auto; }

/* (v20) token hover must survive the line tint; hover pill sits above the block tint */
.code.v2 .line.pickable :is(.t-key, .t-string, .t-number, .t-literal):hover {
  background: rgba(91, 107, 232, 0.14); box-shadow: 0 0 0 2px rgba(91, 107, 232, 0.14);
}

/* ---------- search highlights ---------- */
mark.hit {
  background: var(--hl); color: inherit; padding: 1px 4px; margin: 0 2px; border-radius: 4px;
  box-shadow: inset 0 -1px 0 var(--hl-edge);
}
mark.hit.cur { background: var(--hl-cur); box-shadow: 0 1px 3px rgba(102, 70, 232, 0.35); }
mark.hit.cur, mark.hit.cur * { color: #fff !important; font-weight: 600; }
.code.v2 .line.cur-line .ltx { background: var(--hl-line); box-shadow: inset 0 0 0 1px #E6DEFF; }
.code.v2 .line.cur-line .gut { background: var(--hl-gut); box-shadow: inset 3px 0 0 var(--hl-cur), inset -1px 0 0 var(--rule); }
.code.v2 .line.cur-line .ln { color: #5B3FD6; }
.trow.match { background-color: var(--hl-line); }
.trow.match::before { background: var(--hl-cur); }
mark.ihit {
  background: var(--hl); padding: 1px 0; margin: 0; border-radius: 3px;
  box-shadow: -3px 0 0 var(--hl), 3px 0 0 var(--hl);
}
mark.ihit.cur { background: var(--hl-cur); box-shadow: -3px 0 0 var(--hl-cur), 3px 0 0 var(--hl-cur), 0 1px 3px rgba(102, 70, 232, 0.35); }
mark.ihit.cur, mark.ihit.cur * { color: #fff !important; }

/* ---------- nothing clipped ---------- */
.card > .card-head, .card > .rbar, .card > .card-sub, .card > .card-note, .card > .card-foot,
.card > .repair, .card > .fedit { flex: none; }
.card-foot { gap: 4px 14px; }

/* result bar: controls never overlap */
.card { container-type: inline-size; }
.rbar .ff { min-width: auto; }
.rbar .ff-mode, .rbar .ff-count, .rbar .ff .icon-btn, .rbar .ff-chip { flex: none; }
.rbar .ff-input-wrap { flex: 1 1 auto; min-width: 64px; }
@container (max-width: 1180px) {
  .rbar .tbtn.labeled, .rbar .tbtn.wide { width: 28px; padding: 0; gap: 0; font-size: 0; justify-content: center; }
  .rbar .tbtn.labeled svg, .rbar .tbtn.wide svg { width: 14px; height: 14px; }
}
@container (max-width: 980px) {
  .rbar .ff-mode button svg { display: none; }
  .rbar .ff-mode button { padding: 0 7px; }
  .rbar .rb-right select.text { width: 66px; }
}

/* (v32) empty state of the result cards: dashed frame, badge, title, hint */
.card-body > .estate { flex: 1 1 auto; min-height: 0; margin: 16px; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #fff; border: 1.5px dashed #D3CEC2; border-radius: 14px; }
.estate-badge { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 16px; background: #EEF1FD; border: 1px solid #C9D3F5; color: var(--accent); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 14px; font-weight: 700; line-height: 1; }
.estate-title { margin-top: 18px; font-size: 15px; font-weight: 600; line-height: 22px; color: var(--ink); }
.estate-desc { margin: 6px 0 0; max-width: 340px; font-size: 13px; line-height: 21px; color: var(--muted); word-break: break-all; }
.estate-desc .mono { color: var(--ink); background: var(--soft); padding: 1px 6px; border-radius: 5px; }
.estate-action { margin-top: 18px; height: 32px; padding: 0 16px; }
/* (v33) result bar = input bar = 47px, so the rows of both cards line up (the search field is 32px tall) */
.card > .rbar { padding-top: 7px; padding-bottom: 7px; min-height: 47px; box-sizing: border-box; }
.rbar-ghost .ghost-field { display: flex; align-items: center; height: 32px; width: min(100%, 420px); padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--muted); font-size: 13px; opacity: 0.7; user-select: none; }
/* diff / patch cards: the body has no fixed height, so the empty card brings its own */
.diff-card .card-body > .estate { min-height: 300px; }
.diff-card .card-body.pad > .estate { margin: 0; }
`;
