/** v34: the URL 参数 tab (input, parameter table, URL parts). */
export const URL_CSS = `

.url-mode { flex: 1; display: flex; flex-direction: column; }

.url-editor textarea { white-space: pre-wrap; word-break: break-all; overflow-wrap: anywhere; overflow-y: auto; overflow-x: hidden; line-height: 22px; }

/* result bar: filter field */
.ut-filter { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 8px; }
.ut-filter input { flex: 0 1 380px; min-width: 0; height: 32px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--ink); font-size: 13px; }
.ut-filter input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.ut-filter input::placeholder { color: var(--muted); }
.ut-count { font-size: 12.5px; color: var(--muted); white-space: nowrap; }
.ut-hint { font-size: 13px; color: var(--muted); line-height: 32px; }

.ut-note { display: flex; align-items: center; gap: 12px; margin: 0; padding: 8px 16px; border-width: 0 0 1px 0; border-style: solid; border-color: #F0D6A8; background: #FFF8EC; color: #8A4B00; font-size: 12.5px; }
.ut-note.info { border-color: #D5DDF8; background: #F3F6FE; color: #3B4FD8; }

/* result body */
.url-res { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 12px 16px 16px; background: var(--paper); }
.url-parts { margin: 0; border: 1px solid var(--rule); border-radius: 10px; background: #fff; overflow: hidden; }
.up-row { display: grid; grid-template-columns: 40px minmax(0, 1fr) 20px; align-items: start; gap: 12px; padding: 6px 14px; border-top: 1px solid #EFEDE7; cursor: pointer; }
.up-row:first-child { border-top: 0; }
.up-row:hover { background: #F0F4FD; }
.up-copy { display: inline-flex; align-items: center; justify-content: center; height: 20px; color: var(--muted); opacity: 0; transition: opacity 0.12s; }
.up-copy svg { width: 13px; height: 13px; }
.up-row:hover .up-copy { opacity: 0.7; }
.up-row:hover .up-copy:hover { opacity: 1; }
.up-row dt { margin: 0; font-size: 12.5px; line-height: 20px; color: var(--muted); }
.up-row dd { margin: 0; font-size: 12.5px; line-height: 20px; color: var(--ink); word-break: break-all; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }

.ut-sec { display: flex; align-items: center; gap: 8px; margin: 18px 0 8px; font-size: 13px; font-weight: 600; color: var(--ink); }
.ut-sec:first-child { margin-top: 0; }
.ut-sec span { display: inline-flex; align-items: center; height: 18px; padding: 0 7px; border-radius: 9px; background: var(--soft); color: var(--muted); font-size: 11.5px; font-weight: 500; }
.ut-sec em { font-style: normal; font-weight: 400; font-size: 12.5px; color: var(--muted); }
.url-parts + .ut-sec { margin-top: 18px; }

/* parameter list: one self-contained row per parameter */
.url-res { container-type: inline-size; }
.ptable { border: 1px solid var(--rule); border-radius: 10px; background: #fff; overflow: hidden; font-size: 13px; }
.prow { display: grid; grid-template-columns: 44px minmax(112px, 24%) minmax(0, 1fr) 92px; align-items: start; column-gap: 8px; padding: 5px 8px 5px 0; border-top: 1px solid #EFEDE7; line-height: 20px; }
.prow.phead { align-items: center; padding: 5px 8px 5px 0; border-top: 0; border-bottom: 1px solid var(--rule); background: var(--gutter); color: var(--muted); font-size: 12px; font-weight: 500; line-height: 18px; }
.ptable.ro .prow { grid-template-columns: 44px minmax(112px, 24%) minmax(0, 1fr) 44px; }
.prow:not(.phead):not(.editing):hover { background: #F0F4FD; }
.prow.editing { background: #F5F7FE; }
.prow .c-i { text-align: center; color: #8C959F; font-size: 12px; font-variant-numeric: tabular-nums; }
.prow .c-k, .prow .c-v { min-width: 0; }

.pk-line, .pv-line { display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 20px; cursor: pointer; }
.pk-line { gap: 6px; }
.pk { flex: 0 1 auto; min-width: 0; color: #1F3A8A; font-weight: 600; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pv-text { flex: 1 1 auto; min-width: 0; color: var(--ink); }
.pv-text.clip { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12.5px; }
.pv-side { flex: none; display: inline-flex; align-items: center; gap: 6px; }
.dim { color: var(--muted); font-style: normal; font-weight: 400; }
.prow.is-broken .pv-text { color: #A3360A; }

.tag { display: inline-flex; flex: none; align-items: center; height: 18px; padding: 0 7px; border-radius: 9px; font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap; }
.tag.warn { background: #FFF1D6; color: #8A4B00; }
.tag.bad { background: #FBEAE3; color: #A3360A; }
.tag-btn { display: inline-flex; align-items: center; gap: 4px; height: 18px; padding: 0 7px; border: 0; border-radius: 9px; background: #EEF1FD; color: #3B4FD8; font: inherit; font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap; cursor: pointer; transition: background 0.12s; }
.tag-btn:hover { background: #E0E6FB; }
.tag-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.tag-btn.on { background: #DDE3FA; }
.tag-btn svg { transition: transform 0.12s; }
.tag-btn.on svg { transform: rotate(180deg); }

/* detail box: full value / formatted JSON, spans the key and value columns */
.pdetail { grid-column: 2 / -1; margin-right: 0; position: relative; margin: 6px 0 2px; border: 1px solid #E6E2D8; border-radius: 8px; background: var(--paper); overflow: hidden; }
.pdetail pre { margin: 0; padding: 8px 12px; max-height: 240px; overflow: auto; color: #6B7280; font-size: 12.5px; line-height: 20px; white-space: pre-wrap; word-break: break-all; }
.pdetail pre.json { white-space: pre; word-break: normal; }
.pd-tools { position: absolute; top: 5px; right: 8px; z-index: 1; display: flex; gap: 4px; opacity: 0; transition: opacity 0.12s; }
.pdetail:hover .pd-tools, .pd-tools:focus-within, .pd-tools.keep { opacity: 1; }
.pd-btn { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border: 1px solid #E3E0D6; border-radius: 6px; background: rgba(255, 255, 255, 0.94); color: var(--muted); font: inherit; font-size: 11.5px; cursor: pointer; transition: color 0.12s, border-color 0.12s, background 0.12s; }
.pd-btn svg { width: 12px; height: 12px; }
.pd-btn:hover { color: var(--accent); border-color: var(--accent); }
.pd-btn.on { color: var(--accent); border-color: #C9D2F6; background: #EEF1FD; }
.pd-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
@media (hover: none) { .pd-tools { opacity: 1; } }
.pdetail pre.json.wrap { white-space: pre-wrap; word-break: break-all; }
.pdetail .jk { color: #1F3A8A; }
.pdetail .js { color: #0F766E; }
.pdetail .jn { color: #1D4ED8; font-weight: 600; }
.pdetail .jl { color: #B4532A; font-weight: 600; }

/* row actions: shown on hover / focus */
.row-acts { display: flex; align-items: center; justify-content: flex-end; gap: 2px; opacity: 0; transition: opacity 0.12s; }
.prow:hover .row-acts, .prow:focus-within .row-acts, .prow.editing .row-acts { opacity: 1; }
@media (hover: none) { .row-acts { opacity: 1; } }
.row-acts .icon-btn { opacity: 1; color: var(--muted); width: 24px; height: 20px; padding: 0; }
.row-acts .icon-btn:hover { color: var(--ink); background: rgba(31, 35, 40, 0.06); }
.row-acts .icon-btn.danger:hover { color: #B42318; background: #FBEAE3; }
.row-acts .icon-btn.ok, .row-acts .icon-btn.ok:hover { color: var(--accent); }
.row-acts .icon-btn.ok:hover { background: rgba(59, 79, 216, 0.1); }
.row-acts .icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.prow.editing .icon-btn svg { width: 16px; height: 16px; }

/* inline editor */
.pe-in { display: block; width: 100%; box-sizing: border-box; margin: 0; padding: 4px 8px; border: 1px solid var(--accent); border-radius: 6px; background: #fff; color: var(--ink); font-family: inherit; font-size: 12.5px; line-height: 20px; resize: none; outline: none; box-shadow: 0 0 0 2px rgba(59, 79, 216, 0.14); word-break: break-all; }
.pe-in.mono { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; }
.pe-in::placeholder { color: var(--muted); }
.pt-foot { margin-top: 10px; }
.pe-hint { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; margin-top: 6px; font-size: 12px; line-height: 18px; }
.pe-hint svg { width: 13px; height: 13px; flex: none; }
.pe-hint.valid { display: flex; gap: 5px; color: #1A7F5A; }
.pe-hint.fixable { color: #8A4B00; }
.pe-hint.broken { color: #B42318; }
.pe-hint .link { font-size: 12px; }
.ut-none { padding: 18px; border: 1px dashed #D3CEC2; border-radius: 10px; background: #fff; color: var(--muted); font-size: 13px; text-align: center; }

/* build mode */
.app { --line: #D5D2C9; }
.bd-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 12px 16px 16px; background: #fff; }
.bd-lab { display: block; margin: 0 0 6px; font-size: 12px; font-weight: 600; color: var(--muted); }
.bin { display: block; width: 100%; box-sizing: border-box; margin: 0; padding: 5px 9px; border: 1px solid var(--line); border-radius: 7px; background: #fff; color: var(--ink); font-family: inherit; font-size: 13px; line-height: 20px; outline: none; transition: border-color 0.12s, box-shadow 0.12s; }
.bin.mono { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; font-size: 12.5px; }
.bin:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(59, 79, 216, 0.14); }
.bin::placeholder { color: #A3AAB3; }
.bin.need { border-color: #E5B76B; background: #FFFDF8; }
.bin.need:focus { border-color: var(--accent); background: #fff; }
textarea.bin { resize: vertical; min-height: 56px; word-break: break-all; }
.bd-warn { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; margin: 8px 0 0; padding: 7px 10px; border: 1px solid #F0D6A8; border-radius: 8px; background: #FFF8EC; color: #8A4B00; font-size: 12.5px; line-height: 18px; }
.bd-warn.bad { border-color: #F3C9C4; background: #FEF3F1; color: #B42318; }
.bd-warn .link { font-size: 12.5px; font-weight: 600; }
.bd-hint { margin: 6px 0 0; font-size: 12px; line-height: 18px; color: var(--muted); }
.bd-sec { display: flex; align-items: center; gap: 8px; margin: 18px 0 8px; font-size: 13px; font-weight: 600; color: var(--ink); }
.bd-sec span { display: inline-flex; align-items: center; height: 18px; padding: 0 7px; border-radius: 9px; background: var(--soft); color: var(--muted); font-size: 11.5px; font-weight: 500; }
.brows { display: flex; flex-direction: column; gap: 6px; }
.brow { display: grid; grid-template-columns: 28px minmax(96px, 30%) minmax(0, 1fr) 54px 28px; align-items: center; column-gap: 8px; }
.brow.bhead { font-size: 12px; color: var(--muted); }
.brow .c-i { text-align: center; color: #8C959F; font-size: 12px; font-variant-numeric: tabular-nums; }
.brow .tag-btn.arr { justify-content: center; height: 24px; border: 1px dashed #D0CEC6; background: transparent; color: var(--muted); border-radius: 12px; }
.brow .tag-btn.arr:hover:not(:disabled) { background: #F3F5FD; color: #3B4FD8; border-color: #C9D2F6; }
.brow .tag-btn.arr.on { border-style: solid; border-color: #C9D2F6; background: #EEF1FD; color: #3B4FD8; }
.brow .tag-btn.arr:disabled { cursor: default; }
.brow .icon-btn { opacity: 0.6; }
.brow:hover .icon-btn, .brow .icon-btn:focus-visible { opacity: 1; }
.brow .icon-btn.danger:hover { color: #B42318; }
.bd-add { margin-top: 4px; }
.bd-import { margin-top: 14px; padding: 10px 12px 12px; border: 1px solid #D5DDF8; border-radius: 10px; background: #F7F9FE; }
.bd-imp-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; font-size: 12.5px; color: var(--muted); }
.bd-imp-head b { color: var(--ink); font-size: 13px; }
.bd-imp-hint { display: flex; align-items: center; gap: 5px; min-height: 18px; margin: 6px 0 8px; font-size: 12px; line-height: 18px; color: var(--muted); }
.bd-imp-hint svg { width: 13px; height: 13px; flex: none; }
.bd-imp-hint.ok { color: #1A7F5A; }
.bd-imp-hint.bad { color: #B42318; }
.bd-imp-bar { display: flex; align-items: center; gap: 8px; }
.inline-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
.bd-url { padding: 10px 12px; border: 1px solid var(--rule); border-radius: 10px; background: #fff; font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; font-size: 12.5px; line-height: 22px; word-break: break-all; overflow-wrap: anywhere; cursor: pointer; transition: background 0.12s; }
.bd-url:hover { background: #F0F4FD; }
.bd-url .u-head { color: var(--ink); }
.bd-url .u-p { color: #8C959F; }
.bd-url .u-k { color: #1F3A8A; font-weight: 600; }
.bd-url .u-v { color: #0F766E; }
.bd-url .u-pair.new { background: #E6EBFC; border-radius: 4px; box-shadow: 0 0 0 2px #E6EBFC; }

/* narrow result pane: key on top, value below it */
@container (max-width: 560px) {
  .prow, .ptable.ro .prow { grid-template-columns: 36px minmax(0, 1fr) auto; grid-template-areas: "i k a" ". v v" ". d d"; row-gap: 2px; padding-right: 10px; }
  .prow .c-i { grid-area: i; }
  .prow .c-k { grid-area: k; }
  .prow .c-v { grid-area: v; }
  .prow .c-a { grid-area: a; }
  .pdetail { grid-area: d; grid-column: auto; }
  .prow.phead { display: none; }
}
`;
