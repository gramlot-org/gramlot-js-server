# 140 · Troubleshooting

Document ID: **GS-140**.

[Paired view](../docs/140-troubleshooting.md).

Start errors: browser console (`mount` rejection logged, Worker disposed). Build
errors: `gramlot-serverless: <message>`.

<a id="gs-140-005"></a>

## 005 · The page does not start

Block ID: **GS-140-005**.

- `Page modules must export a subclass of Page`: no `Page` export, or a second core
  copy (page imports `@genro/gramlot` or `@gramlot/native-html`, or two
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

## 010 · Inline code blocked by the Content Security Policy

Block ID: **GS-140-010**.

`EvalError: dataFormula 'dataFormula_0' 'formula': inline code blocked by the
Content Security Policy of the page (no 'unsafe-eval'); move the code to named
logic (a method of the page companion _aux.js) or serve the page with the
permissive CSP profile, which allows 'unsafe-eval'`. The single file has no
permissive profile: move `formula`, `script`, `==`, `action`, `connect_on<event>`,
`_if`/`_else` code to a companion method named with `func`. Nothing is written;
the Worker is disposed. The directory export sets no policy of its own.

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
