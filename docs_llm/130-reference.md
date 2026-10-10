# 130 · Reference

Document ID: **GS-130**.

[Paired view](../docs/130-reference.md).

<a id="gs-130-005"></a>

## 005 · Package and entries

Block ID: **GS-130-005**.

`@gramlot/gramlot-serverless` (`serverless/package.json`), Node ≥ 22:
`@gramlot/gramlot-serverless` → `build`; `/directory` → `buildDirectory`; `/standalone` →
`mount` (window); `/gramlot-worker-server` → `GramlotWorkerServer` (Worker); `/directory` also
`folderPages`. Command `gramlot-serverless` (`node serverless/src/cli.js`): `build
PAGE.js -o OUTPUT.html`, `build FOLDER -o OUTPUT`, `gallery OUTPUT [--catalog …]`.
Dependencies `@gramlot/gramlot >=0.2.14`, `@genrojs/builders >=0.4.1`, `esbuild`;
optional peer `@gramlot/gramlot-examples >=0.2.9` (gallery).

<a id="gs-130-010"></a>

## 010 · Build-time API

Block ID: **GS-130-010**.

`build({page, output}) → {output, bytes, sha256}`: imports the module, bundles
page and logic, HtmlBuilder document with the stylesheets and the policy
([GS-120-015](120-configuration.md)); `TypeError`s (extension, `*_aux`, no `Page`,
stylesheet not inlinable), `Two logic modules for one page`, esbuild errors, `HtmlBuilder changed the runtime script: its CSP hash would not
match`. `buildDirectory({pages, output, assets}) → {output, routes}`: validates,
stages, renames over a previous export; `TypeError`s, `… is not a previous
export`, the two "same Gramlot core installation" errors, esbuild errors.
`folderPages(folder) → {pages, assets}`. `bundles.js`, `gallery.js` are internal.

<a id="gs-130-015"></a>

## 015 · Runtime API

Block ID: **GS-130-015**.

`mount(options) → Gramlot` ([GS-120-020](120-configuration.md));
`globalThis.gramlot`. `Gramlot`: `state` (`'started'`), `src.source`, `data`,
`src.remoteSource(node, method, params)`, `dispose()` (terminates the Worker),
`rpc.transport`. `WorkerTransport`: `open(signal)` → `{pageId, title, resources, capabilities}`,
`call(text, signal)` → response envelope text (as `HttpTransport`), `close(pageId)`, `dispose(error)`,
`pending`, `closed`; Worker `error`/`messageerror` dispose it. `GramlotWorkerServer`:
extends core `GramlotServer`, GC-230 Part C over `postMessage`: `{id, open: true}` →
`{id, open: {pageId, title, resources, capabilities: []}}`; `{id, text}` → `{id, text}` (envelopes
of `call`); `{pageId}` without `id` closes. Outcomes inside the envelope; failed open,
`InvalidRequest`, `Unknown Worker message` → `{id, error: {name, message}}`. Owner null.
Source methods (`Page.registerSource`, `remoteSource`) are not yet part of the page-writing API: they arrive together with the `remote` grammar attribute.

<a id="gs-130-020"></a>

## 020 · Exported files

Block ID: **GS-130-020**.

Single file: doctype, charset, viewport, policy meta, title, notices JSON script
(`gramlot-runtime-notices`), `<style>` per stylesheet, `#gramlot-root`, one
`<script>`: runtime (global `GramlotStandalone` with `Page`, `source`), Worker and
logic module sources as Blob URLs revoked after start. Directory:
[GS-120-010](120-configuration.md); `assets/workers/<route>.js` calls
`GramlotStandalone.mount({workerUrl, modules, assetRoot})`.

<a id="gs-130-025"></a>

## 025 · Verification scripts

Block ID: **GS-130-025**.

`npm test` (32 tests); `verify_page_module_browser.mjs PLAYWRIGHT [ENGINE]` (Page and
Logic in one module, theme, stylesheets, file and directory);
`verify_gallery_browser.mjs PLAYWRIGHT [ENGINE]` (gallery from disk, every example);
`verify_quickstart_browser.mjs PLAYWRIGHT [ENGINE] [EXECUTABLE]` (file and
directory export in a real browser); `verify_export_browser.mjs HTML PLAYWRIGHT
EXECUTABLE TEXT [METHOD] [ENGINE]`; `verify_inline_browser.mjs HTML PLAYWRIGHT
[EXECUTABLE] [ENGINE]` (inline code of main and a remote Source, no CSP violation);
`verify_worker_sentinel_browser.mjs PLAYWRIGHT
[ENGINE] [EXECUTABLE]` (core `avvio`, Logic in the window only; linked core checkout); `scripts/check_docs.py`.

<a id="gs-130-030"></a>

## 030 · The gallery command

Block ID: **GS-130-030**.

`gramlot-serverless gallery OUTPUT [--catalog CATALOG.json PAGES]...`: the
gramlot-examples gallery as a directory from disk; `index.html` + `<key>/index.html`;
common families + `serverless-01` (quick start), `serverless-02` (`npm create @gramlot
page`) + each `--catalog`. Prints `Built <output>: the gallery and <n> examples; open
index.html`. Rules of `buildDirectory` (a previous gallery is replaced); about 30 MB
for 35 routes (one Worker each). Missing examples package → `The gallery needs
@gramlot/gramlot-examples: …`.
