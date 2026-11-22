/**
 * Code view v2 (matches the requested reference): no gutter by default, a solid grey disclosure
 * triangle right before each foldable line, dashed indent guides under each opener's triangle,
 * a rounded tint behind the hovered / current line, roomier 22px lines, and value colors —
 * keys ink, strings green, numbers bold blue, true/false/null bold orange. Appended last.
 */
export const CODE_CSS = `
.code.v2 {
  font-size: 13.5px; line-height: 22px; background: #fff;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
}
.code.v2.with-ln { background: linear-gradient(to right, var(--gutter) 0 47px, var(--rule) 47px 48px, #fff 48px); }
.code.v2 .code-inner { padding: 10px 14px 20px 4px; min-width: max-content; }
.code.v2.wrap .code-inner { min-width: 0; }
.code.v2 .line { display: flex; min-height: 22px; background: transparent; white-space: pre; }
.code.v2 .gut { position: sticky; left: 0; z-index: 2; flex: none; width: 48px; margin-left: -4px; margin-right: 4px; background: var(--gutter); box-shadow: inset -1px 0 0 var(--rule); }
.code.v2 .ln { position: static; width: 48px; padding: 0 12px 0 0; text-align: right; color: #8C959F; background: transparent; box-shadow: none; font-size: 12px; }
.code.v2 .lc { display: flex; flex: 1 1 auto; min-width: 0; padding: 0; }
.code.v2 .lead {
  position: relative; flex: none; display: inline-block; height: 22px; overflow: hidden;
  color: transparent; white-space: pre;
}
.code.v2 .ig { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px dashed #CED4DB; pointer-events: none; }
.code.v2 .ltx {
  flex: 1 1 auto; white-space: pre; padding: 0 12px 0 7px; margin-left: 3px; border-radius: 6px;
  transition: background 0.08s;
}
/* the tinted pill starts 7px right of the fold triangle, and the text 7px inside the pill */
.code.v2 .ltx > mark:first-child, .code.v2 .ltx > span:first-child > mark:first-child { margin-left: 1px; }
.code.v2.wrap .ltx { white-space: pre-wrap; word-break: break-all; min-width: 0; }
.code.v2 .line:hover .ltx { background: #F0F4FD; }
.code.v2 .line.cur-line { background: transparent; }
.code.v2 .line.cur-line .ltx { background: var(--hl-line); box-shadow: inset 0 0 0 1px #C5E8E2; }
.code.v2 .line.cur-line .gut { background: var(--hl-gut); box-shadow: inset 3px 0 0 var(--hl-cur), inset -1px 0 0 var(--rule); }
.code.v2 .line.cur-line .ln { color: #0B5D56; font-weight: 600; }
.code.v2.dim .code-inner { opacity: 0.45; }

/* disclosure triangle */
.cfold {
  position: absolute; top: 5px; width: 13px; height: 13px; padding: 0; border: 0; border-radius: 3px;
  background: none; color: #9AA1AA; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
}
.cfold:hover { color: #3D444D; background: #ECEFF3; }
.cfold:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.cfold svg { width: 11px; height: 11px; transition: transform 0.12s; }
.cfold.closed svg { transform: rotate(-90deg); }
.code.v2 .fold-ph { height: 18px; margin: 0 6px; padding: 0 8px; border-radius: 9px; vertical-align: 1px; }

/* labelled toggle buttons in the result bar (行号 / 换行) */
.tbtn.labeled { width: auto; gap: 5px; padding: 0 9px; font-size: 12.5px; white-space: nowrap; }
.tbtn.labeled svg { width: 13px; height: 13px; }

/* value colors */
.code.v2 .t-key, .dtx .t-key { color: #24292F; }
.code.v2 .t-string, .dtx .t-string, .tree .t-string { color: #0A7F2E; }
.code.v2 .t-number, .dtx .t-number, .tree .t-number { color: #1D3FD3; font-weight: 600; }
.code.v2 .t-literal, .dtx .t-literal, .tree .t-literal { color: #D9480F; font-weight: 600; }
.code.v2 .t-keyword { color: #8250DF; }
.code.v2 .t-builtin { color: #0550AE; }
.code.v2 .t-type { color: #24292F; font-weight: 600; }

/* tree view: same triangle and dashed guides */
.tw svg { width: 11px; height: 11px; transform: rotate(-90deg); transition: transform 0.12s; }
.tw.open svg { transform: none; }
.tw { color: #9AA1AA; }
.tw:hover { color: #3D444D; background: #ECEFF3; }
.trow .tg { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px dashed #CED4DB; pointer-events: none; }
.tree { font-size: 13.5px; }
.trow:hover { background-color: #F0F4FD; }
.trow.sel { background-color: #EAF0FF; box-shadow: inset 3px 0 0 var(--accent); }

@media (max-width: 600px) {
  .code.v2 { font-size: 13px; }
  .code.v2 .gut, .code.v2 .ln { width: 40px; }
  .code.v2.with-ln { background: linear-gradient(to right, var(--gutter) 0 39px, var(--rule) 39px 40px, #fff 40px); }
}
`;
