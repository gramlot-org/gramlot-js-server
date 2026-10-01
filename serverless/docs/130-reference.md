# 130 · Reference

Document ID: **GS-130**.

[Paired view](../docs_llm/130-reference.md).

<a id="gs-130-005"></a>

## 005 · Package and entries

Block ID: **GS-130-005**.

`@gramlot/serverless` (`package.json`, not published on a registry; used from the
repository checkout) declares four entries, Node 22 or later:

| Import | Export | Where it runs |
| --- | --- | --- |
| `@gramlot/serverless` | `build({page, output})` | Node, at build time |
| `@gramlot/serverless/directory` | `buildDirectory({pages, output, assets})` | Node, at build time |
| `@gramlot/serverless/standalone` | `mount(options)` | Browser window |
| `@gramlot/serverless/worker-host` | `WorkerHost` | Web Worker |

Command: `gramlot-serverless build PAGE.js -o OUTPUT.html` (`bin` of the package;
from the checkout, `node src/cli.js`). Dependencies: `@gramlot/gramlot >=0.2.0`,
`@genrojs/builders >=0.4.0`, `esbuild`.

<a id="gs-130-010"></a>

## 010 · Build-time API

Block ID: **GS-130-010**.

- `build({page, output}) → Promise<{output, bytes, sha256}>`. Bundles the page and
  its companion, writes one HTML document through the core `HtmlBuilder`, with the
  strict policy of [GS-120-015](120-configuration.md). Errors:
  `TypeError` for the extensions and for a `*_aux` page, esbuild errors for the
  bundle, `HtmlBuilder changed the runtime script: its CSP hash would not match`
  if the rendered script differs from the hashed one.
- `buildDirectory({pages, output, assets = []}) → Promise<{output, routes}>`.
  Validates everything before writing, stages the directory and renames it.
  Errors: `TypeError` for the shapes and patterns, `Output directory already
  exists`, the two "same Gramlot core installation" errors, esbuild errors.
- `src/bundles.js` holds the shared pieces (`checkPage`, `companion`,
  `workerBundle`, `companionBundle`). They are not package entries.

<a id="gs-130-015"></a>

## 015 · Runtime API

Block ID: **GS-130-015**.

- `mount(options) → Promise<Gramlot>`: options in
  [GS-120-020](120-configuration.md). The exported documents call it
  and set `globalThis.gramlot`.
- `Gramlot` instance (core): `state` (`'started'` once the page runs), `source`,
  `data`, `remoteSource(node, method, params)`, `dispose()`. In the export,
  `transport` is the `WorkerTransport` and `dispose()` terminates the Worker.
- `WorkerTransport` (`src/worker-transport.js`): `open(signal)`,
  `main(pageId, signal)`, `source(pageId, method, params, signal)`,
  `dispose(error)`; `pending` (outstanding requests), `closed`. A Worker `error`
  or `messageerror` event disposes it and rejects every pending request.
- `WorkerHost` (`src/worker-host.js`): extends the core `Host`; operations
  `open`, `main`, `source` over `postMessage`; an unknown operation answers
  `Unknown Worker operation: <name>`. Errors cross the channel as
  `{name, message}`.

<a id="gs-130-020"></a>

## 020 · Exported files

Block ID: **GS-130-020**.

Single file: `<!doctype html>`, `<meta charset>`, viewport, the policy meta, the
title, `<script type="application/json" id="gramlot-runtime-notices">` (the
license notices of the bundled runtime and of this package), `<div id="gramlot-root">`
and one `<script>` with the runtime, the Worker source and the companion source
as strings turned into Blob URLs at start and revoked after it.

Directory: see [GS-120-010](120-configuration.md). The bootstrap
`assets/workers/<route>.js` is a classic script that calls
`GramlotStandalone.mount({workerUrl, modules, assetRoot})` with the document's
directory as `assetRoot`.

<a id="gs-130-025"></a>

## 025 · Verification scripts

Block ID: **GS-130-025**.

| Script | Checks |
| --- | --- |
| `npm test` | 20 tests: exporter output and failure handling, directory export, bundles, Worker host and transport, `mount`, the quick start with typing (jsdom) |
| `scripts/verify_quickstart_browser.mjs PLAYWRIGHT [ENGINE] [EXECUTABLE]` | The quick start as one file and as a directory export in a real browser: initial values, typing, the stylesheet, no HTTP(S) |
| `scripts/verify_native_html_browser.mjs HTML PLAYWRIGHT EXECUTABLE TEXT [METHOD] [ENGINE]` | An exported file: `main`, live Source edits, optional `remoteSource`, Worker termination, no HTTP(S) |
| `scripts/verify_worker_sentinel_browser.mjs PLAYWRIGHT [ENGINE] [EXECUTABLE]` | The core fixture `avvio` under the strict policy: named logic in the window only, a tampered copy blocked (needs a linked core checkout) |
| `scripts/check_docs.py` | Paired guides and Sphinx build of both views |
