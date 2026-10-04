# 130 · Reference

Document ID: **GS-130**.

[Paired view](../docs_llm/130-reference.md).

<a id="gs-130-005"></a>

## 005 · Package and entries

Block ID: **GS-130-005**.

`@gramlot/gramlot-serverless` (`serverless/package.json`) declares four entries, Node 22
or later:

| Import | Export | Where it runs |
| --- | --- | --- |
| `@gramlot/gramlot-serverless` | `build({page, output})` | Node, at build time |
| `@gramlot/gramlot-serverless/directory` | `buildDirectory({pages, output, assets})`, `folderPages(folder)` | Node, at build time |
| `@gramlot/gramlot-serverless/standalone` | `mount(options)` | Browser window |
| `@gramlot/gramlot-serverless/worker-host` | `WorkerHost` | Web Worker |

Command `gramlot-serverless` (`bin` of the package; from the checkout,
`node serverless/src/cli.js`): `build PAGE.js -o OUTPUT.html`, `build FOLDER -o
OUTPUT`, `gallery OUTPUT [--catalog CATALOG.json PAGES]...`
([GS-120-005](120-configuration.md)). Dependencies: `@gramlot/gramlot >=0.2.5`,
`@genrojs/builders >=0.4.1`, `esbuild`; `@gramlot/gramlot-examples >=0.2.4` is an
optional peer dependency, needed by `gallery` only.

<a id="gs-130-010"></a>

## 010 · Build-time API

Block ID: **GS-130-010**.

- `build({page, output}) → Promise<{output, bytes, sha256}>`. Imports the page
  module, bundles the page and its logic, writes one HTML document with the
  stylesheets through the core `HtmlBuilder`, with the policy of
  [GS-120-015](120-configuration.md). Errors: `TypeError` for the extensions, for
  a `*_aux` page, for a module without `Page` and for a stylesheet that cannot be
  inlined; `Two logic modules for one page`; esbuild errors for the bundle, `HtmlBuilder changed the runtime script: its CSP hash would not match`
  if the rendered script differs from the hashed one.
- `buildDirectory({pages, output, assets = []}) → Promise<{output, routes}>`.
  Validates everything before writing, stages the directory and renames it over a
  previous export. Errors: `TypeError` for the shapes and patterns, `Output
  directory already exists and is not a previous export`, the two "same Gramlot
  core installation" errors, the errors of `build` for a page, esbuild errors.
- `folderPages(folder) → Promise<{pages, assets}>`: the pages and the files of a
  folder, as the command uses them ([GS-115-005](115-writing-pages.md)).
- `serverless/src/bundles.js` holds the shared pieces (`checkPage`, `loadPage`,
  `logicModule`, `pageStylesheet`, `inlineStylesheets`, `workerBundle`,
  `logicBundle`); `serverless/src/gallery.js` holds `buildStaticGallery`. They are
  not package entries.

<a id="gs-130-015"></a>

## 015 · Runtime API

Block ID: **GS-130-015**.

- `mount(options) → Promise<Gramlot>`: options in
  [GS-120-020](120-configuration.md). The exported documents call it
  and set `globalThis.gramlot`.
- `Gramlot` instance (core): `state` (`'started'` once the page runs), `source`,
  `data`, `remoteSource(node, method, params)`, `dispose()`. In the export,
  `transport` is the `WorkerTransport` and `dispose()` terminates the Worker.
- `WorkerTransport` (`serverless/src/worker-transport.js`): `open(signal)`,
  `main(pageId, signal)`, `source(pageId, method, params, signal)`,
  `dispose(error)`; `pending` (outstanding requests), `closed`. A Worker `error`
  or `messageerror` event disposes it and rejects every pending request.
- `WorkerHost` (`serverless/src/worker-host.js`): extends the core `Host`; operations
  `open`, `main`, `source` over `postMessage`; an unknown operation answers
  `Unknown Worker operation: <name>`. Errors cross the channel as
  `{name, message}`.

<a id="gs-130-020"></a>

## 020 · Exported files

Block ID: **GS-130-020**.

Single file: `<!doctype html>`, `<meta charset>`, viewport, the policy meta, the
title, `<script type="application/json" id="gramlot-runtime-notices">` (the
license notices of the bundled runtime and of this package), `<div id="gramlot-root">`
one `<style>` per stylesheet in `<head>`, and one `<script>` with the runtime
(global `GramlotStandalone`, which exposes `Page` and `source` to the logic
module), the Worker source and the logic module source as strings turned into
Blob URLs at start and revoked after it.

Directory: see [GS-120-010](120-configuration.md). The bootstrap
`assets/workers/<route>.js` is a classic script that calls
`GramlotStandalone.mount({workerUrl, modules, assetRoot})` with the document's
directory as `assetRoot`.

<a id="gs-130-025"></a>

## 025 · Verification scripts

Block ID: **GS-130-025**.

| Script | Checks |
| --- | --- |
| `npm test` | 32 tests: exporter output and failure handling, stylesheets, page logic, directory and folder export, gallery, bundles, Worker host and transport, `mount`, the quick start with typing (jsdom) |
| `serverless/scripts/verify_page_module_browser.mjs PLAYWRIGHT [ENGINE]` | A page with `Page` and `Logic` in one module, a core theme, `Page.css` and its stylesheet, as one file and as a directory |
| `serverless/scripts/verify_gallery_browser.mjs PLAYWRIGHT [ENGINE]` | `gramlot-serverless gallery` from disk: the gallery page, frames and theme, every example, the `Logic` of b08, c03, c08 and c09 |
| `serverless/scripts/verify_quickstart_browser.mjs PLAYWRIGHT [ENGINE] [EXECUTABLE]` | The quick start as one file and as a directory export in a real browser: initial values, typing, the stylesheet, no HTTP(S) |
| `serverless/scripts/verify_export_browser.mjs HTML PLAYWRIGHT EXECUTABLE TEXT [METHOD] [ENGINE]` | An exported file: `main`, live Source edits, optional `remoteSource`, Worker termination, no HTTP(S) |
| `serverless/scripts/verify_inline_browser.mjs HTML PLAYWRIGHT [EXECUTABLE] [ENGINE]` | An exported file with inline code (`examples/inline-code`): formula, controller, `==`, `_if`/`_else`, `action`, `connect_onclick` and a remote Source, no CSP violation, no HTTP(S) |
| `serverless/scripts/verify_worker_sentinel_browser.mjs PLAYWRIGHT [ENGINE] [EXECUTABLE]` | The core fixture `avvio` (Page and Logic in one module) under the policy of the single file: the Logic runs in the window only, a tampered copy blocked (needs a linked core checkout) |
| `scripts/check_docs.py` | Paired guides and Sphinx build of both views |

<a id="gs-130-030"></a>

## 030 · The gallery command

Block ID: **GS-130-030**.

```sh
gramlot-serverless gallery OUTPUT [--catalog CATALOG.json PAGES]...
```

writes the gallery of `@gramlot/gramlot-examples` as a directory that opens from
disk: `OUTPUT/index.html` is the gallery page, each example is the route
`<key>/` (`OUTPUT/c03/index.html`). It holds every common family (`e01`–`e13`,
`b01`–`b11`, `c01`–`c09`), the family of this package (`serverless-01`, the quick
start; `serverless-02`, the page of `npm create @gramlot page`) and the families of
each `--catalog`. The command prints `Built <output>: the gallery and <n> examples;
open index.html`.

The gallery page is the browser-safe `GalleryPage` of gramlot-examples with its
texts as data; each example extends its page with the gallery frame script, links
its stylesheet and takes the `Logic` of its page module. The directory follows the
rules of `buildDirectory`: a previous gallery at `OUTPUT` is replaced. With 36
routes it takes about 30 MB, since every route holds its Worker. Without
`@gramlot/gramlot-examples` the command answers `The gallery needs
@gramlot/gramlot-examples: npm install @gramlot/gramlot-examples`.
