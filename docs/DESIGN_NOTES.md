# 设计与迭代记录

下面是这个工具在 Quick 里逐版迭代时记录的设计说明（视觉方向、交互约定、每一版的改动），原样保存，方便以后维护时查阅。

```text
Build prompt
 * App: "JSON 转 TypeScript", a developer tool for a frontend / mobile engineer (Chinese UI).
 *
 * Art direction: a well-typeset printed compiler listing / technical reference manual.
 * Warm paper page background #F7F6F2, ink text #1F2328, muted labels #57606A, hairline rules
 * #E3E1DA, control borders #D0CEC6, white code sheets. One accent, indigo #3B4FD8, for the active
 * tab underline and the primary action; success green #1A7F37 and error red #B42318 only for
 * status. Type: system sans for chrome; ui-monospace stack for all code. Code colors follow a
 * light listing palette (keyword #6F42C1, string #0A6B3D, key #0550AE, builtin #0550AE,
 * number #953800, comment #57606A, type names in ink with weight 600). Sections are separated by
 * hairline rules, not cards. Calm, precise, utilitarian.
 *
 * First screen: the working tool, preloaded with a realistic paginated order-list API response
 * (code/message/data with page, total, hasMore, list of orders with buyer, items, nullable coupon,
 * optional remark/tracking) so TypeScript output is visible immediately.
 *
 * Layout: plain-text title + one-line subtitle; options row (root type name, interface/type,
 * T[]/Array<T>, null handling "T | null" vs "可选 ?:", export, readonly, all-optional, JSDoc 注释
 * (on by default: interface-level JSON path comment; per-field notes for string format, number
 * kind and sample range, nullable, missing-in-some-samples, plus @example from observed values;
 * doc comments rendered in comment color with @tags highlighted);
 * two panes side by side (stack under 960px): left input JSON textarea with sample picker
 * (订单列表 / 用户资料 / 移动端 Feed), 格式化, 清空 (with in-place 撤销), and a status line
 * (valid + size + field count, or parse error with line/column and 跳到错误位置). Right: tabs
 * TypeScript / Zod / Mock 数据, with 复制 (in-place 已复制 feedback) and 下载; mock tab adds
 * 条数, TS 常量/JSON format and 重新生成. Code view has line numbers and syntax colors, scrolls
 * inside its own area. Footer stats: N 个类型 · N 个字段 · N 个可选 · N 个可空.
 *
 * Inference: merge array elements (keys missing in some elements become optional), null unions,
 * integer detection, string formats (email/url/uuid/datetime/date) for Zod, dedupe identical
 * shapes, singularize array item names, quote non-identifier keys. Mock data is seeded, uses
 * field-name heuristics and observed samples/ranges.
 *
 * App shell (v3): title "JSON 工具" with header tabs "JSON 格式化" (default) and "转 TypeScript";
 * both tools stay mounted so state persists when switching. The TypeScript tool is described above.
 * JSON 格式化 tool: options row with 操作 segmented (格式化 / 压缩 / 转义 / 反转义), 布局 segmented
 * (左右 / 上下, hidden under 960px where panes always stack), 键排序 select (默认保持原顺序 / 升序 /
 * 降序, recursive), 缩进 select (2/4 空格/Tab; shown for 格式化 and 反转义). Input pane "输入": editor
 * with synced line-number gutter (error line marked red), placeholder "在这里粘贴需要格式化的 JSON 代码",
 * sample picker (压缩的接口返回 / 日志里转义的 JSON / 有语法错误的 JSON), 清空 with 撤销, status line.
 * Output pane "解析结果" updates live: 自动换行 toggle (on for 压缩/转义), 复制, 替换输入 (with 撤销),
 * 下载. Uses a custom parser that keeps big integers and key order exactly and reports Chinese errors
 * (trailing comma, single quotes, comments, missing comma...) with line/column, an excerpt with
 * caret, and 跳到错误位置. Unescape peels multiple layers and formats the result if it is JSON;
 * escaped-JSON input in 格式化 suggests 改用反转义. Footer: output size, lines, keys, depth, ratio.
 * v4: input pane adds 格式化输入 / 压缩输入 (rewrite the input in place with current indent/sort,
 * unwrap escaped JSON first, undoable, Shift+Alt+F shortcut). Both result panes get a search bar
 * (⌘F / Ctrl+F focuses it while the app has focus): live highlight of all matches in yellow,
 * current match orange with its line tinted, "当前 / 总数" count, Enter / Shift+Enter or arrow
 * buttons to move (auto-scrolls vertically and horizontally), Aa case-sensitive and .* regex
 * toggles, invalid regex and no-result states in red, Esc clears.
 * v5: JSONPath bar above the formatter's search bar (JSON outputs only): live query on the lossless
 * AST ($, .key, ['k'], .*, [*], ..key, [n], [-1], [a,b], [s:e:step], [?(@.x > 1 && @.y =~ /re/)],
 * @.list.length), autocomplete of document paths, starter chips derived from the data, 附带路径
 * toggle (results as {path, value}), match count or Chinese error, no-match empty state; copy /
 * download / 替换输入 / search act on the query result.
 * v6: (1) result pane 代码 / 树形 toggle. Tree: virtualized (24px rows), collapsible nodes with
 * chevrons (Alt+click = whole subtree), key in blue, index in grey, typed value colors, "N 个键 /
 * N 项" count pills, keyword filter (key or value, matches highlighted, only matches + ancestors +
 * their subtrees shown, auto-expanded, own expansion that restores on clear), JSONPath matches
 * filter the tree too, 全部展开 / 全部折叠 / 展开层级, keyboard navigation (arrows, Home/End, PgUp/Dn,
 * Enter), hover copy of JS path, detail bar with selected path (data.list[0].id), type, 复制路径 /
 * 复制 JSONPath / 复制值 / 只看此节点. (2) New header tab "JSON 对比": 旧 / 新 editors (280px) with
 * 格式化 and status, options 视图 (并排对比 / 差异列表), 忽略键顺序, 数组按 id 匹配, 交换左右,
 * 载入示例, 清空 (undoable). Result: summary "共 N 处差异" with kind chips (新增 green, 删除 red,
 * 修改 amber, 类型变化 purple) that filter the list; notes (id matching, reordered arrays);
 * side-by-side line diff (Myers on canonical text, trailing-comma insensitive) with red/green rows,
 * in-line change highlight, folded unchanged runs (3 lines context), 上一处 / 下一处 hunk navigation;
 * structural list rows (badge, JSONPath, old → new) that locate the line in the split view.
 * States: missing side, syntax error per side with jump, identical (explains key-order / format-only).
 * v7: (P0) settings remembered per user via private Page Storage (table json-tool-settings, one
 * JSON doc, debounced): active tab, formatter mode/layout/sort/indent/result view/附带路径, search
 * Aa/.* per area, TypeScript options/tab/mock count+format, diff view/忽略键顺序/数组按 id/patch output.
 * Header shows save state (正在保存 / 设置已保存 / error + 重试) and 恢复默认设置 (undoable).
 * (P1) every input editor has find & replace: ⌘F inside the editor or the corner search button opens
 * a floating widget (query, count, Aa, .*, prev/next, replace / replace all with $1, undo of
 * replace-all, Esc closes and selects the current match); matches drawn on a mirror layer behind the
 * textarea, current match scrolled into view. Output-pane ⌘F stays separate.
 * (P2) JSON 对比 gets a third view "JSON Patch": RFC 6902 ops generated old → new (id-matched arrays
 * use move; otherwise LCS alignment), op badges and counts, verification that applying the patch
 * reproduces the new JSON, per-op checkboxes, output JSON Patch or 应用后的 JSON, copy/download,
 * warning when skipped array ops can shift later indices, error when a selected op can't apply.
 * v8: JSON 对比 gets a 模式 toggle 对比两份 JSON / 应用补丁 (remembered). 应用补丁: 原 JSON editor + JSON
 * Patch editor (format, syntax errors, shape validation with per-op Chinese messages, "N 个操作").
 * Result: op list (badge incl. 复制 / 校验, from → path, value or 期望 value, per-op status 已执行 /
 * 失败 + reason / 跳过 / 未执行, checkboxes to skip ops), summary with per-op counts and overall
 * status; full RFC 6902 incl. copy, test, "-" index, ~0/~1; atomic: a failure means nothing applies,
 * with optional 预览失败前的结果. Output 结果 JSON or 改动对比 (reuses the diff, full width), copy,
 * 下载 patched.json, 写回原 JSON (undoable). Compare-mode JSON Patch view links to 在「应用补丁」中打开.
 * v9: tolerant JSON repair (lib/repair.ts) with every fix recorded at its original position: missing /
 * extra / mismatched brackets (extra root closer followed by ", key" is dropped), missing / extra /
 * trailing commas, missing colons, single / back / Chinese quotes, unquoted keys and values,
 * unterminated strings, unescaped inner quotes and newlines, comments, True/None/undefined/NaN,
 * loose numbers, Chinese punctuation, Markdown fences, copied line numbers, log / SSE prefixes,
 * key-value fragments without braces, several top-level values (merged into an array), escaped JSON.
 * Formatter: 容错 · 自动修复 toggle (remembered, on by default, 格式化 / 压缩). Invalid input then shows
 * the repaired result with an amber notice (count, grouped summary, 查看详情 list of fixes with
 * clickable line:col and samples, original strict error with 定位, 应用到输入 undoable); the input
 * marks the first problem line in amber with 应用修复 / 查看第一处. When off or not repairable, the error
 * box offers 自动修复 or says it can't be repaired. 格式化输入 repairs too. TypeScript input 格式化 and
 * diff / patch editors' 格式化 repair as well, and their error lines get an 自动修复 link.
 * v10 (tuned on a real chat-log paste): leading lines before the JSON (a copied line-number block,
 * list markers like "1、") are dropped; Markdown backslash escapes (\_ \] \* ...) are removed; a
 * fragment cut from the middle of a document (starts with a key, has unmatched closers) gets its
 * missing outer structure rebuilt in front, with "(缺失的键)" for keys that were cut off. New sample
 * 从日志复制的片段. 转 TypeScript gets a JSON Schema tab (Draft 2020-12 / Draft-07, $defs/definitions
 * with $ref for repeated shapes, required, nullable as type lists, formats, integer, 禁止额外字段,
 * 附带示例值, remembered) and generates from auto-repaired input when the input is broken, with a
 * notice and 应用修复到输入 (undoable).
 * v11 layout: each tool has one white toolbar strip (inline labels, soft segmented controls with a
 * raised selection, dividers; layout toggle right-aligned). Panes are cards of equal height (head
 * with title, size · lines and compact actions; optional bars; body; tinted foot with status).
 * Formatter result card: view tabs 代码 / 树形 / Schema (Schema from the whole JSON or the JSONPath
 * result, Draft 2020-12/07, 禁止额外字段, 附带示例值); one find field with a 搜索 / JSONPath switch
 * (JSONPath suggestions as a dropdown, active query shown as a chip in search mode), Aa / .* / prev /
 * next, and fold controls (全部展开, 全部折叠, 展开到第 N 层, 自动换行). Code views fold by brackets with
 * gutter chevrons and a "⋯ N 行" placeholder; search opens folded blocks. Tree view is driven by the
 * same field and controls; indent guides align with chevron centres. Search marks are flat (no
 * padding) so they never overlap neighbours. Pasted valid JSON is formatted in the input (粘贴时格式化,
 * remembered, undoable), samples load formatted. 转 TypeScript uses the same toolbar and cards.
 * v12 tuning: search marks are teal pills with 2px breathing room drawn by box-shadow (no text
 * shift); current match solid teal with white text, its line tinted teal with a teal gutter bar;
 * tree matches use the same teal. Input cards get a bar under the head (soft action group 格式化 /
 * 压缩 / 清空 and 查找 ⌘F) of the same height as the result search bar, and the input gutter matches
 * the code gutter (64px), so input and result code start on the same line and column. Toolbar
 * controls are soft pills with the label inside (缩进 2 空格 ▾, 声明 interface|type), on/off options are
 * switches, selects use one custom chevron, groups separated by hairlines.
 * v13: JSON 对比 unified: one toolbar (模式 segmented, 忽略键顺序 / 数组按 id 匹配 switches, undo status
 * and an action group 交换 / 载入示例 / 全部清空 on the right). Inputs are equal-height cards (title,
 * colored side tag 对比基准 / 与左侧比较 / 补丁会应用到这里, size · lines; input bar with 格式化 / 清空 and
 * 查找 ⌘F; editor; status foot). Results live in one card: 对比结果 with view tabs 并排对比 / 差异列表 /
 * JSON Patch in its head; the summary bar, notes and the side-by-side diff are full-bleed inside the
 * card; patch views get padding. 应用补丁 mode uses an 应用结果 card the same way.
 * v14 code view (reference supplied by the user): no gutter by default (行号 toggle in the result
 * bar, remembered), a solid grey disclosure triangle just before each foldable line, dashed indent
 * guides under each opener's triangle, 22px lines, rounded tint behind the hovered / current line,
 * keys ink, strings green, numbers bold blue, true/false/null bold orange. Leading whitespace stays
 * in the DOM (hidden) so copied text keeps its indentation. Tree view uses the same triangles,
 * dashed guides and value colors.
 * v15: input editors get a colored mirror layer behind a transparent textarea: "source" palette
 * (keys #A31515, strings #0451A5, numbers #098658, literals #AF00DB, 13px/20px) distinct from the
 * result "preview" palette, plus a caret-line highlight and bold caret line number; large inputs
 * (>400K chars / 8000 lines) skip colors. Formatter search is shared: ⌘F anywhere (also inside the
 * input; ⌥⌘F opens the input's own find & replace, button 查找替换) focuses the result search, and
 * the query is highlighted on both sides with the same teal pills; count shows "3 / 12 · 输入 12";
 * when counts match, the current match moves in step on both sides and the input scrolls to it.
 * Field editing: double-click a line in 代码 view (or its hover pencil) or a value in 树形 view (or 编辑
 * in the detail bar) opens a field editor panel at the bottom of the result card: path, 键名 (rename,
 * duplicate check), 类型 (字符串 / 数字 / 布尔 / null / 对象数组) with type-aware input and validation,
 * 删除字段, 取消, 保存 (Enter / ⌘Enter). Field replace: a 替换 toggle in the result bar opens a row
 * (替换为, 范围 值 / 键名 / 全部, live preview "将在 N 个字段里替换 M 处", 全部替换) that rewrites string
 * values / keys in the AST using the search query, Aa and .* ($1 supported). Edits and replaces write
 * back to the input (re-formatted with the current indent), undoable. 替换输入 becomes 写回输入 and only
 * shows when the result differs from the input.
 *
 * States: empty input (prompt to paste JSON in output area), invalid JSON (error in red, output
 * keeps last valid result dimmed with notice), valid. No emoji; icons are inline SVG.
 *
 * v34 — 4th tab "URL 参数" (components/UrlTool.tsx, UrlParamTable.tsx, lib/urlParams.ts, stylesUrl.ts):
 * paste a URL or a bare query string; the URL is split by hand (scheme/host/port/path/hash, not new URL())
 * and every key/value is percent-decoded as bytes with a chosen character encoding (自动 = UTF-8 first,
 * then GB18030; UTF-8, GBK, GB18030, Big5, UTF-16LE/BE, Latin-1, Windows-1252, Shift_JIS, EUC-JP/KR, ...).
 * Result card: 表格 (URL parts + parameter table with # / key / value, 重复 / JSON / URL / 乱码 tags,
 * JSON expand, parse nested URL value), JSON, 文本; filter, 键排序, 把 + 当作空格, copy, download.
 * Input actions 解码 / 编码 rewrite the input (undoable). Hints when the encoding looks wrong
 * (replacement characters, or bytes that are valid UTF-8 under another encoding).
 * Input copy button lives in the input action bar (right), never floating over the text; the URL row shows the
 * full URL; pasted text is trimmed at both ends (switch 粘贴时去掉首尾空格, undoable).
 *
 * v35 — editable parameter table: ✎ edit (inline key / value, Enter saves, Esc cancels), delete, 添加参数.
 * Every change rewrites the input (so the URL row and the input are the new URL) and is undoable (multi-level).
 * Untouched pairs keep their original text; written text is percent-encoded with the chosen character
 * encoding (UTF-8 for auto; GBK / Big5 / Shift_JIS / EUC / Latin-1 / UTF-16 via reverse tables built from
 * TextDecoder). Characters the encoding cannot hold become ? with a toast.
 *
 * v36 — parameter table redesigned as self-contained rows (components/UrlParamRows.tsx): narrow key column, wide
 * value column; a JSON value is one clipped line with a JSON toggle, opening shows the coloured formatted JSON
 * (with its own 复制) inside the same row; URL values get 解析 URL; row actions appear on hover; stacks key over
 * value in a narrow pane.
 *
 * v37 — denser: every row is one line (value clipped, full text on hover); a 全文 / JSON toggle opens a detail
 * box that spans the key and value columns (JSON not wrapped, scrolls sideways, max 240px high, 复制 on hover);
 * the preview line is not repeated in the open row; row height ~31px; URL card clamps to 2 lines.
 *
 * v38 — editing a value that is meant to be JSON (starts with { , or [ with JSON punctuation): while typing a hint
 * shows 格式正确 / 保存时会自动修复 (with 立即修复) / 无法自动修复; on save a malformed JSON value is repaired with the
 * existing tolerant repair (lib/repair.ts), written compact, and the foot + a toast say what was fixed (undoable).
 * Untouched values are never repaired.
 *
 * v39 — 换行 toggle in the JSON detail box (next to 复制, persisted as url.wrap): scroll sideways (default) or wrap long
 * lines. Stays visible while on.
 *
 * v40 — URL tab gets a 解析 | 拼接 switch (url.mode). 拼接 (components/UrlBuild.tsx, UrlBuildRows.tsx, lib/urlBuild.ts):
 * base link + key/value rows -> URL. Options (toolbar, persisted): 数组写法 (repeat / a[] / a=1,2 / a[0]), 空格写成 %20 or +,
 * 跳过空值, 已有参数 (覆盖同名 / 追加 / 整体替换), 键排序, 字符编码 (shared with 解析). Same-name rows or rows marked 数组
 * are written as arrays. 批量导入: a=1&b=2, one key=value per line, a whole URL, or a JSON object (auto-repaired, strings
 * broken by copy-paste line breaks are joined, nested objects become JSON strings or a[b][c]). Right side: the URL with new
 * parameters highlighted, the written parameters as a table, 去解析 / 复制 URL. 解析 has 转到拼接 to carry its result over.
 *
 * v41 — parameter data (JSON object, a=1&b=2, key=value lines) pasted into the 基础链接 box or a key box is turned into
 * parameter rows instead of being used as the link (a 转成参数 warning shows when it is typed there). Markdown-wrapped links
 * "[url](url)" are restored; strings broken by a line break are joined and Markdown hard-break spaces dropped.
 *
 * v42 — 拼接: when there are parameters but no base link, the result card says so (填写基础链接 focuses the box), the
 * base box gets an amber border and its placeholder reads as an example, not as a value.
```
