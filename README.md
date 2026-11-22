# JSON 工具：格式化、对比、转 TypeScript

一个 Chrome 扩展（Manifest V3），在浏览器里处理 JSON 和 URL 参数。所有处理都在本机完成，不上传任何数据，也不需要登录。点击工具栏图标，会在新标签页打开工具，可以同时开多个。

## 功能

**JSON 格式化**
- 格式化、压缩、转义、反转义；缩进可选 2 / 4 空格或 Tab；键可按原顺序、升序或降序排列
- 自动修复常见问题（注释、尾逗号、单引号、缺少的括号、带行号或 Markdown 转义的片段等），并列出改了哪里
- 大整数不丢精度
- 代码、树形、Schema 三种视图，可折叠，可显示行号
- 搜索键名或值，支持大小写、正则和 JSONPath
- 查找替换、点击字段直接编辑；修改只作用在结果上，随时可以还原
- 单击复制键或值，双击复制整个字段

**JSON 对比**
- 并排对比、差异列表、JSON Patch（RFC 6902）三种结果
- 可忽略键顺序，数组可按 id 匹配
- 把 JSON Patch 应用到原 JSON 上，查看并下载结果

**转 TypeScript**
- 从 JSON 生成 TypeScript 类型、Zod 校验、JSON Schema 和 Mock 数据

**URL 参数**
- 解析：粘贴完整 URL 或 `?` 后面的参数串，整理成表格；支持 UTF-8、GBK、GB18030、Big5、UTF-16、Latin-1、Shift_JIS、EUC-JP / EUC-KR 等字符编码，编码选错时会提示
- 在表格里直接编辑、删除、添加参数，新的 URL 自动生成，可以撤销；值是 JSON 时可展开格式化，写错会自动修复
- 拼接：填写基础链接和参数，生成带参数的 URL；支持数组写法（重复键、`a[]`、`a=1,2`、`a[0]`）、空格写成 `%20` 或 `+`、跳过空值、已有参数的处理（覆盖同名、追加、整体替换）和键排序
- 批量导入：`a=1&b=2`、每行一个 `key=value`、整条 URL 或 JSON 对象

## 从源码构建

需要 Node.js 和 npm。

```bash
npm install
npm run build        # 类型检查，然后构建到 dist/
```

然后在 Chrome 里加载：

1. 打开 `chrome://extensions`，打开右上角的「开发者模式」
2. 点「加载已解压的扩展程序」，选择本仓库里的 `dist/` 文件夹
3. 点击工具栏里的扩展图标

最低要求 Chrome 102。

## 开发

```bash
npm run dev          # 在普通浏览器标签页里预览（设置保存在 localStorage）
npm run typecheck    # 只做类型检查
npm run pack         # 构建并打包成 json-tool-extension-<版本>.zip（用于提交商店，需要系统自带 zip 命令）
```

在普通标签页里预览时没有 `chrome.storage`，界面偏好改存在 `localStorage`；作为扩展运行时存在 `chrome.storage.local`。

## 目录结构

| 路径 | 作用 |
| --- | --- |
| `app.html` | 扩展页面的入口，只含 `#root` 和对 `src/main.tsx` 的引用 |
| `public/` | 原样复制到 `dist/`：`manifest.json`、`background.js`、`icons/` |
| `src/App.tsx` | 外壳：标题、tab 导航、设置，以及样式的拼接 |
| `src/components/` | 各个工具的界面 |
| `src/lib/` | 解析、修复、对比、补丁、代码生成、URL 解析与拼接等逻辑，不依赖界面 |
| `src/styles*.ts` | 样式，按文件名里的版本顺序叠加，靠后的覆盖靠前的 |
| `docs/DESIGN_NOTES.md` | 设计说明和每一版的改动记录 |

## 权限与隐私

只申请了 `storage` 权限，用来在本机保存界面偏好（缩进、排序、当前 tab、字符编码等）。不保存你输入的 JSON 和链接，不发起网络请求，不使用分析或广告服务。

## 说明

- 运行时依赖只有 React 18。
- 这个仓库此前只放构建产物。现在 `app.js` 由源码构建生成，不再提交到仓库。
