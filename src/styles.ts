export const CSS = `
* { box-sizing: border-box; }
html, body, #root { margin: 0; padding: 0; }
body {
  background: #F7F6F2;
  color: #1F2328;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}
.app { max-width: 1480px; margin: 0 auto; padding: 22px 24px 0; }
.mono, .code, textarea.input { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; }

.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 6px 24px; flex-wrap: wrap; border-bottom: 1px solid #E3E1DA; }
.title { font-size: 20px; font-weight: 650; margin: 0; padding-bottom: 10px; letter-spacing: -0.01em; }
.nav { border-bottom: 0; }
.nav .tab { font-size: 14.5px; padding: 8px 14px 10px; }
[hidden] { display: none !important; }
.sub { color: #57606A; font-size: 13px; margin: 0; }

.opts { display: flex; flex-wrap: wrap; gap: 14px 22px; align-items: flex-end; padding: 14px 0; border-bottom: 1px solid #E3E1DA; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field > .lbl { font-size: 12px; color: #57606A; }
.text {
  height: 30px; padding: 0 9px; border: 1px solid #D0CEC6; border-radius: 6px; background: #fff;
  color: #1F2328; font-size: 13px; width: 200px;
}
.text.num { width: 72px; }
.text:focus, .seg button:focus-visible, .btn:focus-visible, .tab:focus-visible, select:focus-visible, textarea.input:focus, .code:focus-visible {
  outline: 2px solid #3B4FD8; outline-offset: 1px;
}
select.text { width: auto; padding-right: 6px; }
.seg { display: inline-flex; border: 1px solid #D0CEC6; border-radius: 6px; overflow: hidden; background: #fff; height: 30px; }
.seg button {
  border: 0; background: transparent; padding: 0 11px; font-size: 13px; color: #1F2328; cursor: pointer; white-space: nowrap;
}
.seg button + button { border-left: 1px solid #D0CEC6; }
.seg button[aria-pressed="true"] { background: #1F2328; color: #fff; }
.checks { display: flex; gap: 14px; height: 30px; align-items: center; flex-wrap: wrap; }
.check { display: inline-flex; gap: 6px; align-items: center; font-size: 13px; cursor: pointer; white-space: nowrap; }
.check input { accent-color: #3B4FD8; width: 14px; height: 14px; margin: 0; }

.main { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 22px; margin-top: 16px; }
.pane { display: flex; flex-direction: column; min-width: 0; }
.pane-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; min-height: 38px; margin-bottom: 8px; }
.pane-title { font-size: 14px; font-weight: 600; margin: 0; }
.tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.btn {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid #D0CEC6;
  background: #fff; color: #1F2328; border-radius: 6px; font-size: 13px; cursor: pointer; white-space: nowrap;
}
.btn:hover { background: #F0EEE8; }
.btn:disabled { color: #6E7781; cursor: not-allowed; background: #fff; }
.btn.primary { background: #3B4FD8; border-color: #3B4FD8; color: #fff; }
.btn.primary:hover { background: #3243B8; }
.btn.primary:disabled { background: #8E99E6; border-color: #8E99E6; color: #fff; }
.btn.done { color: #1A7F37; border-color: #1A7F37; }
.btn svg { width: 14px; height: 14px; flex: none; }
.link { background: none; border: 0; padding: 0; color: #3B4FD8; font-size: 12.5px; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }

textarea.input {
  width: 100%; height: 600px; resize: vertical; padding: 12px 14px; border: 1px solid #D0CEC6; border-radius: 8px;
  background: #fff; color: #1F2328; font-size: 13px; line-height: 20px; tab-size: 2; white-space: pre; overflow: auto;
}
textarea.input.err { border-color: #B42318; }

.status { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 8px; font-size: 12.5px; min-height: 20px; color: #57606A; }
.status .ok { color: #1A7F37; font-weight: 600; }
.status .bad { color: #B42318; font-weight: 600; }
.status .msg { color: #B42318; }
.status svg { width: 14px; height: 14px; flex: none; }

.tabs { display: flex; gap: 2px; border-bottom: 1px solid #E3E1DA; }
.tab {
  background: none; border: 0; border-bottom: 2px solid transparent; margin-bottom: -1px; padding: 8px 12px;
  font-size: 14px; color: #57606A; cursor: pointer;
}
.tab[aria-selected="true"] { color: #1F2328; font-weight: 600; border-bottom-color: #3B4FD8; }

.subtools { display: flex; gap: 12px 16px; align-items: center; flex-wrap: wrap; padding: 10px 0; }
.subtools .field { flex-direction: row; align-items: center; gap: 8px; }

.code {
  background: #fff; border: 1px solid #D0CEC6; border-radius: 8px; height: 600px; overflow: auto;
  font-size: 13px; line-height: 20px; color: #1F2328; position: relative;
}
.code.dim .code-inner { opacity: 0.45; }
.code-inner { padding: 12px 0; min-width: max-content; }
.line { display: flex; white-space: pre; }
.ln { width: 48px; flex: none; text-align: right; padding-right: 14px; color: #6E7781; user-select: none; }
.lc { padding-right: 18px; }
.t-keyword { color: #6F42C1; }
.t-string { color: #0A6B3D; }
.t-key { color: #0550AE; }
.t-builtin { color: #0550AE; }
.t-literal { color: #953800; }
.t-number { color: #953800; }
.t-comment { color: #57606A; font-style: italic; }
.t-doctag { color: #6F42C1; font-style: italic; font-weight: 600; }
.t-type { color: #1F2328; font-weight: 600; }

.empty {
  height: 600px; border: 1px dashed #C9C6BC; border-radius: 8px; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 10px; color: #57606A; font-size: 13.5px; background: #FBFAF7; text-align: center; padding: 20px;
}
.empty svg { width: 28px; height: 28px; color: #6E7781; }
.notice { font-size: 12.5px; color: #8A4B00; background: #FFF4E0; border: 1px solid #F0D6A8; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px; }
.foot { margin-top: 8px; font-size: 12.5px; color: #57606A; min-height: 20px; }
.foot b { color: #1F2328; font-weight: 600; }
.foot-notes { margin-top: 3px; color: #57606A; }

.searchbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
.search-field {
  flex: 1 1 260px; min-width: 0; display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 6px 0 9px;
  border: 1px solid #D0CEC6; border-radius: 6px; background: #fff;
}
.search-field:focus-within { outline: 2px solid #3B4FD8; outline-offset: 1px; }
.search-field.bad { border-color: #B42318; }
.search-ico { width: 14px; height: 14px; color: #57606A; flex: none; }
.search-input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font-size: 13px; color: #1F2328; height: 28px; }
.search-input::placeholder { color: #6E7781; }
.search-input:disabled { background: transparent; }
.search-count { font-size: 12px; color: #57606A; white-space: nowrap; font-variant-numeric: tabular-nums; }
.search-count.bad { color: #B42318; }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border: 0; border-radius: 4px; background: none; color: #57606A; cursor: pointer; }
.icon-btn:hover { background: #F0EEE8; }
.icon-btn svg { width: 12px; height: 12px; }
.seg.small button { padding: 0 9px; display: inline-flex; align-items: center; }
.seg.small button svg { width: 14px; height: 14px; }
.seg button:disabled { color: #6E7781; cursor: not-allowed; }
mark.hit { background: #FFE58F; color: inherit; border-radius: 2px; }
mark.hit.cur { background: #FFB547; box-shadow: 0 0 0 1px #B45309; }
.line.cur-line { background: #FFF8E1; }

.querybar { margin-bottom: 8px; }
.query-row { display: flex; gap: 8px 10px; align-items: center; flex-wrap: wrap; }
.query-label { font-size: 12.5px; font-weight: 600; color: #1F2328; }
.query-field { flex: 1 1 260px; }
.query-sub { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 6px; min-height: 24px; font-size: 12.5px; }
.query-hint { color: #57606A; }
.query-status { color: #1A7F37; font-weight: 600; }
.query-status.bad { color: #B42318; font-weight: 500; }
.chip {
  height: 24px; padding: 0 8px; border: 1px solid #D0CEC6; border-radius: 12px; background: #fff; color: #0550AE;
  font-size: 12px; cursor: pointer; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.chip:hover { background: #F0EEE8; }
.chip:focus-visible { outline: 2px solid #3B4FD8; outline-offset: 1px; }

/* tree */
.tree-wrap { display: flex; flex-direction: column; height: 600px; border: 1px solid #D0CEC6; border-radius: 8px; background: #fff; overflow: hidden; }
.tree-tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 8px 10px; border-bottom: 1px solid #E3E1DA; background: #FBFAF7; }
.tree-tools .search-field { flex: 1 1 220px; }
.search-ico svg { width: 14px; height: 14px; display: block; }
.btn.sm { height: 26px; padding: 0 9px; font-size: 12.5px; }
.text.sm { height: 26px; font-size: 12.5px; width: auto; }
.tree { flex: 1; min-height: 0; overflow: auto; position: relative; outline: none; font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; }
.tree:focus-visible { box-shadow: inset 0 0 0 2px #3B4FD8; }
.tree-inner { position: relative; }
.trow { position: absolute; left: 0; right: 0; height: 24px; display: flex; align-items: center; gap: 3px; white-space: nowrap; padding-right: 8px; cursor: default; }
.trow:hover { background: #F7F6F2; }
.trow.sel { background: #E8ECFF; }
.trow.match::before { content: ""; position: absolute; left: 0; top: 4px; bottom: 4px; width: 3px; border-radius: 2px; background: #E8950C; }
.tw { flex: none; width: 18px; height: 18px; border: 0; padding: 0; background: none; color: #57606A; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.tw:hover { background: #ECEAE3; }
.tw svg { width: 12px; height: 12px; transition: transform 0.12s; }
.tw.open svg { transform: rotate(90deg); }
.tw-sp { flex: none; width: 18px; }
.tk-key { color: #0550AE; flex: none; }
.tk-idx { color: #6E7781; flex: none; }
.tk-colon { color: #57606A; margin-right: 5px; flex: none; }
.tk-val { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.tk-brace { color: #57606A; flex: none; }
.tk-count { flex: none; margin-left: 6px; height: 18px; padding: 0 7px; border-radius: 9px; background: #F0EEE8; color: #57606A; display: inline-flex; align-items: center;
  font-size: 11.5px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
.trow-copy { margin-left: auto; flex: none; opacity: 0; }
.trow:hover .trow-copy, .trow.sel .trow-copy { opacity: 1; }
.tree-empty { padding: 40px 20px; text-align: center; color: #57606A; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; }
.tree-detail { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; padding: 8px 10px; border-top: 1px solid #E3E1DA; background: #FBFAF7; font-size: 12.5px; }
.tree-path { flex: 1 1 220px; min-width: 0; overflow-wrap: anywhere; color: #1F2328; font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; }
.tree-type { color: #57606A; }
.tree-flash { color: #1A7F37; font-weight: 600; }
.icon-btn.done { color: #1A7F37; }

/* diff */
.pane-sub { font-size: 12px; font-weight: 400; color: #57606A; margin-left: 8px; }
.opts-status { display: inline-flex; gap: 6px; align-items: center; font-size: 12.5px; color: #57606A; }
.diff-inputs { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 22px; margin-top: 16px; }
.editor.short { height: 280px; }
.diff-result { margin-top: 18px; padding-top: 14px; border-top: 1px solid #E3E1DA; }
.diff-title { margin-bottom: 10px; }
.diff-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px; margin-bottom: 8px; }
.diff-total { font-size: 13.5px; }
.diff-total b { font-weight: 650; }
.diff-sum { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.sum-chip { height: 26px; padding: 0 10px; border-radius: 13px; border: 1px solid; background: #fff; font-size: 12.5px; cursor: pointer; display: inline-flex; gap: 5px; align-items: center; }
.sum-chip:focus-visible { outline: 2px solid #3B4FD8; outline-offset: 1px; }
.sum-chip.c-added { color: #1A7F37; border-color: #A7D8B5; }
.sum-chip.c-removed { color: #B42318; border-color: #F1C6C0; }
.sum-chip.c-changed { color: #8A4B00; border-color: #F0D6A8; }
.sum-chip.c-type { color: #6F42C1; border-color: #D8C8F0; }
.sum-chip.c-added[aria-pressed="true"] { background: #E9F7EE; }
.sum-chip.c-removed[aria-pressed="true"] { background: #FDECEA; }
.sum-chip.c-changed[aria-pressed="true"] { background: #FFF4E0; }
.sum-chip.c-type[aria-pressed="true"] { background: #F3EEFC; }
.diff-nav { margin-left: auto; display: flex; gap: 8px; align-items: center; font-size: 12.5px; color: #57606A; }
.diff-notes { display: flex; gap: 6px; align-items: flex-start; margin: 0 0 10px; padding: 7px 10px; font-size: 12.5px; color: #57606A; background: #F3F5FB; border: 1px solid #DDE3F5; border-radius: 6px; }
.dsplit { border: 1px solid #D0CEC6; border-radius: 8px; background: #fff; max-height: 640px; overflow: auto; position: relative; font-size: 12.5px; line-height: 20px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; }
.dsplit:focus-visible { outline: 2px solid #3B4FD8; outline-offset: 1px; }
.dhead-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); position: sticky; top: 0; z-index: 2; background: #FBFAF7; border-bottom: 1px solid #E3E1DA; color: #57606A;
  font-size: 12px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; }
.dhead-row > div { padding: 7px 14px; }
.dhead-row > div + div { border-left: 1px solid #E3E1DA; }
.drow { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); position: relative; }
.drow:first-of-type .dcell, .dhead-row + .drow .dcell { padding-top: 6px; }
.dcell { display: flex; min-width: 0; padding: 1px 0; }
.dcell + .dcell { border-left: 1px solid #E3E1DA; }
.dln { flex: none; width: 52px; padding: 0 10px 0 0; text-align: right; color: #8C959F; user-select: none; font-variant-numeric: tabular-nums; }
.dsign { flex: none; width: 18px; text-align: center; user-select: none; font-weight: 600; }
.dtx { flex: 1; min-width: 0; padding-right: 14px; white-space: pre-wrap; word-break: break-all; color: #1F2328; }
.dcell.minus { background: #FFF1EF; }
.dcell.plus { background: #EEF9F1; }
.dcell.minus .dln { background: #FFE3DF; color: #B42318; }
.dcell.plus .dln { background: #DCF2E3; color: #1A7F37; }
.dcell.minus .dsign { color: #B42318; }
.dcell.plus .dsign { color: #1A7F37; }
.dcell.blank { background: repeating-linear-gradient(-45deg, #FAF9F6 0 5px, #F2F0EA 5px 6px); }
.dcell.blank .dln { background: transparent; }
.dx { border-radius: 3px; padding: 1px 2px; margin: 0 -2px; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.dx-old { background: #FFC9C1; box-shadow: inset 0 -1px 0 #F09A8F; }
.dx-new { background: #B4E6C4; box-shadow: inset 0 -1px 0 #7CCB95; }
.dx .t-key, .dx .t-string, .dx .t-number, .dx .t-literal, .dx .t-type { color: #1F2328; }
.drow.flash::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: rgba(255, 196, 0, 0.18);
  box-shadow: inset 3px 0 0 #E8950C; animation: dflash 1.6s ease-out forwards; }
@keyframes dflash { 0%, 55% { opacity: 1; } 100% { opacity: 0; } }
.dfold { display: flex; gap: 6px; align-items: center; justify-content: center; width: 100%; height: 28px; padding: 0 12px; border: 0; border-top: 1px solid #E3E1DA; border-bottom: 1px solid #E3E1DA;
  background: #F6F7FB; color: #3B4FD8; font-size: 12.5px; cursor: pointer; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; }
.dfold:hover { background: #E8ECFF; }
.dfold:focus-visible { outline: 2px solid #3B4FD8; outline-offset: -2px; }
.dfold svg { width: 14px; height: 14px; }
.dlist { border: 1px solid #D0CEC6; border-radius: 8px; background: #fff; max-height: 640px; overflow: auto; }
.dl-row { display: grid; grid-template-columns: 76px minmax(0, 1fr) minmax(0, 1.4fr) 26px; gap: 6px 12px; align-items: center; padding: 8px 12px; border-bottom: 1px solid #EFEDE6; cursor: pointer; font-size: 13px; }
.dl-row:last-child { border-bottom: 0; }
.dl-row:hover { background: #F7F6F2; }
.dl-row:focus-visible { outline: 2px solid #3B4FD8; outline-offset: -2px; }
.badge { display: inline-flex; align-items: center; justify-content: center; height: 22px; padding: 0 6px; border-radius: 4px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.b-added { background: #E9F7EE; color: #1A7F37; }
.b-removed { background: #FDECEA; color: #B42318; }
.b-changed { background: #FFF4E0; color: #8A4B00; }
.b-type { background: #F3EEFC; color: #6F42C1; }
.dl-path { color: #0550AE; overflow-wrap: anywhere; }
.dl-vals { display: flex; flex-wrap: wrap; gap: 2px 8px; align-items: baseline; min-width: 0; }
.dv-old { color: #B42318; text-decoration: line-through; text-decoration-color: #E8A39B; overflow-wrap: anywhere; }
.dv-new { color: #1A7F37; overflow-wrap: anywhere; }
.dv-arrow { color: #6E7781; }
.dv-type { color: #6F42C1; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; font-size: 12px; }
.dlist-empty, .dlist-more { padding: 14px; text-align: center; color: #57606A; font-size: 13px; }
.okbox { border: 1px solid #A7D8B5; background: #F0FAF3; border-radius: 8px; padding: 18px 20px; }
.okbox h3 { display: flex; gap: 6px; align-items: center; margin: 0 0 6px; font-size: 15px; color: #1A7F37; }
.okbox h3 svg { width: 16px; height: 16px; }
.okbox p { margin: 0; font-size: 13.5px; color: #1F2328; }
.empty.short, .errbox.short { height: auto; min-height: 160px; }
.diff-err + .diff-err { margin-top: 16px; padding-top: 16px; border-top: 1px solid #F1C6C0; }
.diff-err .errmsg { margin-bottom: 10px; }

.code.wrap .code-inner { min-width: 0; }
.code.wrap .lc { white-space: pre-wrap; word-break: break-all; flex: 1; min-width: 0; }

.editor { display: flex; height: 600px; border: 1px solid #D0CEC6; border-radius: 8px; background: #fff; overflow: hidden; }
.editor:focus-within { outline: 2px solid #3B4FD8; outline-offset: 1px; }
.editor.err { border-color: #B42318; }
.gutter {
  flex: none; min-width: 46px; padding: 12px 10px 64px 8px; background: #FBFAF7; border-right: 1px solid #E3E1DA;
  color: #6E7781; text-align: right; white-space: pre; overflow: hidden; user-select: none;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; font-size: 13px; line-height: 20px;
}
.gutter .bad { color: #fff; background: #B42318; border-radius: 3px; padding: 0 3px; font-weight: 600; }
.editor textarea {
  flex: 1; min-width: 0; border: 0; outline: none; resize: none; margin: 0; padding: 12px 14px; background: transparent;
  color: #1F2328; font-size: 13px; line-height: 20px; white-space: pre; overflow: auto; tab-size: 2;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
}
.editor textarea::placeholder { color: #6E7781; }

.errbox { height: 600px; overflow: auto; border: 1px solid #F1C6C0; background: #FEF6F5; border-radius: 8px; padding: 18px 20px; }
.errbox h3 { display: flex; gap: 6px; align-items: center; margin: 0 0 6px; font-size: 15px; color: #B42318; }
.errbox h3 svg { width: 16px; height: 16px; }
.errmsg { margin: 0; font-size: 13.5px; color: #1F2328; }
.excerpt {
  margin: 14px 0; padding: 10px 12px; background: #fff; border: 1px solid #E3E1DA; border-radius: 6px; overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; font-size: 13px; line-height: 20px; color: #1F2328;
}
.caret { color: #B42318; font-weight: 700; }
.errtip { margin: 12px 0 0; font-size: 12.5px; color: #57606A; }

.main.stack { grid-template-columns: minmax(0, 1fr); }
.main.stack .editor, .main.stack .code, .main.stack .empty, .main.stack .errbox { height: 380px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

@media (max-width: 960px) {
  .main { grid-template-columns: minmax(0, 1fr); }
  textarea.input, .code, .empty, .editor, .errbox, .tree-wrap, .main.stack .editor, .main.stack .code, .main.stack .empty, .main.stack .errbox { height: 440px; }
  .hide-narrow { display: none; }
  .diff-inputs { grid-template-columns: minmax(0, 1fr); }
  .editor.short { height: 240px; }
  .diff-nav { margin-left: 0; }
}
@media (max-width: 600px) {
  .app { padding: 16px 14px 0; }
  .text { width: 100%; }
  .opts .field.grow { width: 100%; }
  textarea.input, .code, .empty, .editor, .errbox, .tree-wrap, .main.stack .editor, .main.stack .code, .main.stack .empty, .main.stack .errbox { height: 360px; }
  .nav .tab { padding: 8px 10px 10px; }
  .dl-row { grid-template-columns: 70px minmax(0, 1fr) 26px; }
  .dl-row .dl-vals { grid-column: 2; grid-row: 2; }
  .dl-row .icon-btn { grid-column: 3; grid-row: 1; }
  .dln { width: 34px; padding-right: 6px; }
  .dsign { width: 12px; }
}
`;
