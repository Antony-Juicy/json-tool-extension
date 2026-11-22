export const FEATURES_CSS = `
/* ---------- settings ---------- */
.head-left { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.settings-status { display: inline-flex; gap: 6px; align-items: center; font-size: 12.5px; color: var(--muted); padding-bottom: 10px; min-height: 30px; }
.settings-status .ss-ok { display: inline-flex; gap: 4px; align-items: center; color: #17702F; }
.settings-status .ss-ok svg { width: 13px; height: 13px; }
.ss-bad { color: #B42318; }
.link.subtle { color: var(--muted); text-decoration-color: #C9C6BC; }
.link.subtle:hover { color: var(--accent); }
.loading { padding: 60px 0; text-align: center; color: var(--muted); font-size: 13.5px; }

/* ---------- input find & replace ---------- */
.editor { position: relative; }
.ed-area { position: relative; flex: 1; min-width: 0; display: flex; }
.ed-area textarea { position: relative; z-index: 1; }
.ed-mirror { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
.ed-mirror-inner {
  position: relative; padding: 8px 14px 12px; white-space: pre; tab-size: 2; color: transparent; width: max-content; min-width: 100%;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; font-size: 13px; line-height: 20px;
}
mark.ihit { color: transparent; background: var(--hit); border-radius: 2px; box-shadow: inset 0 -1px 0 var(--hit-line); }
mark.ihit.cur { background: var(--hit-cur); box-shadow: 0 0 0 1px var(--hit-cur-line); }
.ed-find-btn {
  position: absolute; top: 6px; right: 18px; z-index: 2; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid #D0CEC6; border-radius: 6px; background: rgba(255, 255, 255, 0.92); color: var(--muted); cursor: pointer; opacity: 0.7;
}
.editor:hover .ed-find-btn, .ed-find-btn:focus-visible { opacity: 1; }
.ed-find-btn:hover { color: var(--ink); background: #fff; }
.ed-find-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.ed-find-btn svg { width: 14px; height: 14px; }
.find {
  position: absolute; top: 6px; right: 18px; z-index: 3; width: min(470px, calc(100% - 24px));
  display: flex; flex-direction: column; gap: 6px; padding: 6px 8px;
  background: #fff; border: 1px solid #D0CEC6; border-radius: 8px; box-shadow: 0 4px 14px rgba(31, 35, 40, 0.12);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}
.find-row { display: flex; gap: 6px; align-items: center; }
.find-row .search-field { flex: 1 1 auto; height: 28px; }
.find-row .seg.small { height: 28px; }
.find-toggle svg { transition: transform 0.12s; }
.find-toggle.open svg { transform: rotate(90deg); }
.find-toggle-sp { width: 22px; flex: none; }
.find-note { display: flex; gap: 6px; align-items: center; padding-left: 28px; font-size: 12px; color: var(--muted); }

/* ---------- JSON Patch ---------- */
.patch-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px; margin-bottom: 10px; }
.verify { display: inline-flex; gap: 5px; align-items: center; margin-left: auto; font-size: 12.5px; }
.verify svg { width: 14px; height: 14px; }
.verify.ok { color: #17702F; }
.verify.bad { color: #B42318; }
.p-add { background: #EEF9F1; color: #17702F; box-shadow: inset 0 0 0 1px #B4E6C4; }
.p-remove { background: #FFF1EF; color: #B42318; box-shadow: inset 0 0 0 1px #FFC9C1; }
.p-replace { background: #FFF6E5; color: #8A4B00; box-shadow: inset 0 0 0 1px #F0D6A8; }
.p-move { background: #EEF1FF; color: #2F3FB0; box-shadow: inset 0 0 0 1px #C9D1F7; }
.patch-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; }
.patch-ops { display: flex; flex-direction: column; min-width: 0; border: 1px solid #D0CEC6; border-radius: 8px; background: #fff; overflow: hidden; }
.patch-ops-head { display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 8px 14px; background: var(--gutter); border-bottom: 1px solid var(--rule); }
.patch-hint { font-size: 12px; color: var(--muted); }
.patch-list { max-height: 560px; overflow: auto; }
.pl-row { display: grid; grid-template-columns: 16px 52px minmax(0, 1fr); gap: 10px; align-items: start; padding: 9px 14px; border-bottom: 1px solid #EFEDE6; cursor: pointer; font-size: 13px; }
.pl-row:last-child { border-bottom: 0; }
.pl-row:hover { background: #FAF9F6; }
.pl-row input { margin: 4px 0 0; accent-color: var(--accent); }
.pl-row .badge { justify-self: start; }
.pl-row.off .badge, .pl-row.off .pl-main { opacity: 0.45; }
.pl-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.pl-path { color: #0550AE; overflow-wrap: anywhere; font-size: 12.5px; line-height: 22px; }
.pl-from { color: var(--muted); }
.patch-out { display: flex; flex-direction: column; min-width: 0; }
.patch-out-head { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 8px; }
.patch-out .code { height: 520px; }
.patch-foot { margin: 8px 0 0; font-size: 12px; color: var(--muted); }

/* ---------- apply external patch ---------- */
.p-copy { background: #EAF6F8; color: #0B5D6B; box-shadow: inset 0 0 0 1px #B5DDE4; }
.p-test { background: #F3F1EC; color: #4B5259; box-shadow: inset 0 0 0 1px #D6D2C7; }
.pl-row.st { grid-template-columns: 16px 52px minmax(0, 1fr) auto; }
.pl-row.failed { background: #FFF6F5; box-shadow: inset 3px 0 0 #B42318; }
.pl-err { font-size: 12.5px; color: #B42318; line-height: 18px; }
.pl-st { justify-self: end; display: inline-flex; align-items: center; height: 22px; font-size: 12px; white-space: nowrap; }
.pl-st svg { width: 15px; height: 15px; }
.pl-st.s-ok { color: #17702F; }
.pl-st.s-fail { color: #B42318; }
.pl-st.s-off, .pl-st.s-notrun { color: var(--muted); }
.dv-test { font-size: 12.5px; padding: 1px 6px; border-radius: 3px; background: #F3F1EC; color: #3D434A; overflow-wrap: anywhere; }
.apply-fail { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; justify-content: space-between; }
.apply-empty { height: 520px; }
.apply-empty svg { color: #B42318; }
.patch-grid.wide { grid-template-columns: minmax(0, 1fr); }
.patch-grid.wide .patch-list { max-height: 260px; }
.apply-diff .dsplit, .apply-diff .dlist { max-height: 560px; }

/* ---------- auto repair ---------- */
.editor.warn { border-color: #D9A441; }
.editor.warn .gutter .bad { background: #B87400; }
.status .warn { display: inline-flex; gap: 5px; align-items: center; color: #8A4B00; font-weight: 600; }
.status .warn svg { width: 14px; height: 14px; }
.repair { border: 1px solid #F0D6A8; background: #FFF8EB; border-radius: 8px; margin-bottom: 10px; }
.repair-main { display: flex; gap: 10px 12px; align-items: center; flex-wrap: wrap; padding: 9px 12px; }
.repair-ico { flex: none; width: 28px; height: 28px; border-radius: 7px; background: #FFE9C2; color: #8A4B00; display: inline-flex; align-items: center; justify-content: center; }
.repair-ico svg { width: 15px; height: 15px; }
.repair-text { flex: 1 1 240px; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.repair-text b { color: #7A4300; font-weight: 600; }
.repair-sum { font-size: 12.5px; color: #5C4A2C; overflow-wrap: anywhere; }
.repair-detail { border-top: 1px solid #F0D6A8; padding: 8px 12px 10px; max-height: 240px; overflow: auto; }
.repair-orig { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: baseline; margin: 0 0 8px; font-size: 12.5px; color: #57606A; }
.repair-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 3px; }
.repair-list li { display: flex; gap: 10px; align-items: baseline; font-size: 12.5px; line-height: 20px; }
.repair-loc { flex: none; min-width: 58px; height: 20px; padding: 0 6px; border: 0; border-radius: 4px; background: #fff; color: #0550AE;
  box-shadow: inset 0 0 0 1px #F0D6A8; font-size: 12px; text-align: left; cursor: pointer; }
.repair-loc:hover { background: #FFF1D6; }
.repair-loc:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.repair-loc.all { color: #57606A; cursor: default; display: inline-flex; align-items: center; font-family: inherit; }
.repair-what { color: #1F2328; }
.repair-sample { min-width: 0; padding: 0 6px; border-radius: 3px; background: #fff; color: #57606A; font-size: 12px; overflow-wrap: anywhere; }
.repair-more { margin: 6px 0 0; font-size: 12px; color: #57606A; }
.notice.repair-inline { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; }
.subtools .check { font-size: 13px; }

@media (max-width: 960px) {
  .patch-grid { grid-template-columns: minmax(0, 1fr); }
  .patch-list { max-height: 360px; }
  .patch-out .code { height: 400px; }
  .verify { margin-left: 0; }
}
@media (max-width: 600px) {
  .find { right: 8px; width: calc(100% - 16px); }
  .pl-row { grid-template-columns: 16px minmax(0, 1fr); }
  .pl-row.st { grid-template-columns: 16px minmax(0, 1fr) auto; }
  .pl-row.st .pl-st { grid-column: 3; grid-row: 1; }
  .apply-empty { height: 360px; }
  .pl-row .badge { grid-column: 2; }
  .pl-row .pl-main { grid-column: 2; }
}
`;
