# 140 · Troubleshooting

Document ID: **GS-140**.

[Paired view](../docs/140-troubleshooting.md).

Start errors: browser console (`mount` rejection logged, Worker disposed). Build
errors: `gramlot-serverless: <message>`.

<a id="gs-140-005"></a>

## 005 · The page does not start

Block ID: **GS-140-005**.

- `Page modules must export a subclass of Page`: no `Page` export, or a second core
  copy (page imports `@genro/gramlot` or the former core name `@gramlot/native-html`, or two
  installations linked) → import `@gramlot/gramlot/page`, one installation.
- `Standalone module not provided: /<name>_aux.js`: custom `mount` without
  `modules` → pass the companion URL.
- `/<name>_aux.js: import failed: <reason>`: the companion throws or has no valid
  `Logic` → fix it.
- `Standalone Page.css must be an array of strings` → `static css = ['/x.css']`.
- `Standalone CSS with assetRoot must be root-relative without traversal`,
  `Standalone CSS must remain under assetRoot` → `/inside/export.css`, listed in
  `assets`.
- `script-src` violation, nothing starts: the file was edited after the build →
  rebuild.

<a id="gs-140-010"></a>

## 010 · Inline code refused

Block ID: **GS-140-010**.

The single file runs the inline code of the Source its Worker builds. The core refuses,
naming node and attribute: `inline code runs only as received with the Source (main or a
remote Source); a text written later is not run: use named logic` (code attribute
changed or node inserted after the start: write it in `main`/a Source method or use
`func`); `'<attribute>' is inline code and cannot be the pointer '<pointer>'; inline code
is never read from Data` (pass data as parameters); `… has the form of a native event
handler …` (use `connect_onclick`); `… holds a javascript: URL …` in `href`, `src`,
`formaction`, `xlink:href` (use `connect_onclick` or a button `action`). A file built
with 0.2.2 has no `'unsafe-eval'` and fails with the core `EvalError … (no
'unsafe-eval') …`: rebuild with 0.2.3. The directory export sets no policy of its own.

<a id="gs-140-015"></a>

## 015 · Source methods

Block ID: **GS-140-015**.

`Unknown Source method` (`main`, non-string, or unmarked method → `source(...)`);
`Unknown, expired or unowned page` (core default 1800 s expiry → reload);
`DataCloneError` (uncloneable params → plain data); `Worker transport is disposed`
/ `Worker communication failed` (disposed or crashed → reload, read the earlier
error).

<a id="gs-140-020"></a>

## 020 · Build errors

Block ID: **GS-140-020**.

`Standalone pages must be JavaScript (.js or .mjs)` (Python → gramlot-uvicorn);
`A *_aux file is a page companion, not a page` (pass `<name>.js`); `Output must be
an HTML file`; esbuild `Could not resolve "node:…"` (browser imports only; output
untouched); `Output directory already exists` (remove it); `… must resolve the same
Gramlot core installation` (one `node_modules`, one core); `Invalid asset target`,
`Asset target conflicts with generated output` (relative target such as
`themes/base/theme.css`).
