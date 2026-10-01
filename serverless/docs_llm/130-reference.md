# 130 · Reference

Document ID: **GS-130**.

[Paired view](../docs/130-reference.md).

<a id="gs-130-005"></a>

## 005 · Package and entries

Block ID: **GS-130-005**.

`@gramlot/serverless` (unpublished; from the checkout), Node ≥ 22:
`@gramlot/serverless` → `build`; `/directory` → `buildDirectory`; `/standalone` →
`mount` (window); `/worker-host` → `WorkerHost` (Worker). Command
`gramlot-serverless build PAGE.js -o OUTPUT.html` (`node src/cli.js`). Dependencies
`@gramlot/gramlot >=0.2.0`, `@genrojs/builders >=0.4.0`, `esbuild`.

<a id="gs-130-010"></a>

## 010 · Build-time API

Block ID: **GS-130-010**.

`build({page, output}) → {output, bytes, sha256}`: HtmlBuilder document with the
strict policy ([GS-120-015](120-configuration.md)); `TypeError`s,
esbuild errors, `HtmlBuilder changed the runtime script: its CSP hash would not
match`. `buildDirectory({pages, output, assets}) → {output, routes}`: validates,
stages, renames; `TypeError`s, `Output directory already exists`, the two "same
Gramlot core installation" errors, esbuild errors. `src/bundles.js` is internal.

<a id="gs-130-015"></a>

## 015 · Runtime API

Block ID: **GS-130-015**.

`mount(options) → Gramlot` ([GS-120-020](120-configuration.md));
`globalThis.gramlot`. `Gramlot`: `state` (`'started'`), `source`, `data`,
`remoteSource(node, method, params)`, `dispose()` (terminates the Worker),
`transport`. `WorkerTransport`: `open`, `main`, `source`, `dispose(error)`,
`pending`, `closed`; Worker `error`/`messageerror` dispose it. `WorkerHost`:
extends core `Host`; `open`, `main`, `source` over `postMessage`; `Unknown Worker
operation: <name>`; errors cross as `{name, message}`.

<a id="gs-130-020"></a>

## 020 · Exported files

Block ID: **GS-130-020**.

Single file: doctype, charset, viewport, policy meta, title, notices JSON script
(`gramlot-runtime-notices`), `#gramlot-root`, one `<script>` with runtime, Worker
and companion sources as Blob URLs revoked after start. Directory:
[GS-120-010](120-configuration.md); `assets/workers/<route>.js` calls
`GramlotStandalone.mount({workerUrl, modules, assetRoot})`.

<a id="gs-130-025"></a>

## 025 · Verification scripts

Block ID: **GS-130-025**.

`npm test` (20 tests, quick start with typing in jsdom);
`verify_quickstart_browser.mjs PLAYWRIGHT [ENGINE] [EXECUTABLE]` (file and
directory export in a real browser); `verify_native_html_browser.mjs HTML PLAYWRIGHT
EXECUTABLE TEXT [METHOD] [ENGINE]`; `verify_worker_sentinel_browser.mjs PLAYWRIGHT
[ENGINE] [EXECUTABLE]` (linked core checkout); `scripts/check_docs.py`.
