# 140 · Troubleshooting

Document ID: **GS-140**.

[Paired view](../docs/140-troubleshooting.md).

Start errors: browser console (`mount` rejection logged, Worker disposed). Build
errors: `gramlot-serverless: <message>`.

<a id="gs-140-005"></a>

## 005 · The page does not start

Block ID: **GS-140-005**.

- `Page modules must export a subclass of Page`: no `Page` export, or a second core
  copy (page imports a retired package name, `@genro/gramlot` or `@gramlot/native-html`, or two
  installations linked) → import `@gramlot/gramlot/page`, one installation.
- `Standalone module not provided: /<name>.js`: custom `mount` without
  `modules` → pass the logic module URL.
- `/<name>.js: import failed: <reason>`: the logic module throws or its `Logic` export
  is not a valid class → fix it.
- `Standalone Page.css must be an array of strings` → `static css = ['/x.css']`.
- `Standalone CSS with assetRoot must be root-relative without traversal`,
  `Standalone CSS must remain under assetRoot` → `/inside/export.css`, the file in
  the pages folder (or `assets`).
- `script-src` violation, nothing starts: the file was edited after the build →
  rebuild.

<a id="gs-140-010"></a>

## 010 · Inline code refused

Block ID: **GS-140-010**.

The single file runs the inline code of the Source its Worker builds. The core refuses,
naming node and attribute: `inline code runs only as received with the Source (main or a
remote Source); a text written later is not run: use named logic` (code attribute
changed or node inserted after the start: write it in `main` or a
`Logic` method with `func`); `'<attribute>' is inline code and cannot be the pointer '<pointer>'; inline code
is never read from Data` (pass data as parameters); `… has the form of a native event
handler …` (use `connect_onclick`); `… holds a javascript: URL …` in `href`, `src`,
`formaction`, `xlink:href` (use `connect_onclick` or a button `action`). The directory export sets no policy of its own.

<a id="gs-140-015"></a>

## 015 · Source methods

Block ID: **GS-140-015**.

Declare Source fragments with `Page.registerSource` and mount them with `remote`;
use `dataRpc` for endpoint values and `dataRemote` for lazy Data. See [Calling the server](https://github.com/gramlot-org/gramlot/blob/main/docs/public/098-server-calls.md#gc-095-100)
and [Remote content and lazy Data](https://github.com/gramlot-org/gramlot/blob/main/docs/public/099-remote-content.md#gc-095-105).
Outcomes of the Worker envelope (`RpcError` with `code` in the window):
`not_found` (`Unknown Source method`: unmarked method; page code does
not call `remoteSource` yet);
`page_expired` (`Unknown, expired or unowned page`: no call for 1800 s, the core default → reload);
`Worker transport is disposed`
/ `Worker communication failed` (disposed or crashed → reload, read the earlier
error).

<a id="gs-140-020"></a>

## 020 · Build errors

Block ID: **GS-140-020**.

`Standalone pages must be JavaScript (.js or .mjs)` (Python → gramlot-py-server);
`A *_aux file is a page companion, not a page` (pass `<name>.js`); `The module
exports no class Page` (export `Page`; shared modules in a subfolder); `Page file
<name>: a page name starts with a lowercase letter, …` (rename); `Two logic modules
for one page` (keep one); `One file cannot include the stylesheet …`, `Page.css … is
not a file in the folder of the page` (local file or `/themes/…`; remote → directory);
`Output must be an HTML file`; esbuild `Could not resolve "node:…"` (browser imports
only; output untouched); `Output directory already exists and is not a previous
export` (another output); `The gallery needs @gramlot/gramlot-examples` (install it); `… must resolve the same
Gramlot core installation` (one `node_modules`, one core); `Invalid asset target`,
`Asset target conflicts with generated output` (relative target such as
`themes/base/theme.css`).
