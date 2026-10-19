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
| `@gramlot/gramlot-serverless/gramlot-worker-server` | `GramlotWorkerServer` | Web Worker |

Command `gramlot-serverless` (`bin` of the package; from the checkout,
`node serverless/src/cli.js`): `build PAGE.js -o OUTPUT.html`, `build FOLDER -o
OUTPUT`, `gallery OUTPUT [--catalog CATALOG.json PAGES]...`
([GS-120-005](120-configuration.md)). Dependencies: `@gramlot/gramlot >=0.2.17`,
`@genrojs/builders >=0.5.2`, `esbuild`; `@gramlot/gramlot-examples >=0.2.12` is an
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
- `Gramlot` instance (core): `state` (`'started'` once the page runs), `src.source`,
  `data`, `src.remoteSource(node, method, params)`, `dispose()`. In the export,
  `rpc.transport` is the `WorkerTransport` and `dispose()` terminates the Worker.
- `WorkerTransport` (`serverless/src/worker-transport.js`): `open(signal)` resolves
  with `{pageId, title, resources, capabilities, nameSyntax}`; `call(text, signal)` sends a
  request envelope (TYTX text) and resolves with the response envelope text, as the
  core `HttpTransport`; `close(pageId)` sends the close message; `dispose(error)`;
  `pending` (outstanding requests), `closed`. A Worker `error` or `messageerror`
  event disposes it and rejects every pending request. It declares no
  `supportsCallSync`: `gramlot.rpc.callSync` throws and a `dataRemote` with `sync`
  reads asynchronously.
- `WorkerServerAdapter` (`serverless/src/worker-server-adapter.js`, not a package
  entry): the core `ServerAdapter` of a page whose server runs in a Worker. Its
  `createTransport()` returns the `WorkerTransport` that opened the page; the
  exported documents give it to `PageBootstrap`.
- `GramlotWorkerServer` (`serverless/src/gramlot-worker-server.js`): extends the core
  `GramlotServer` and realises the server protocol in a Worker (Part C of the
  public [server protocol](https://gramlot.readthedocs.io/en/latest/docs/public/101-server-protocol.html)) over
  `postMessage`:

  | Window sends | Worker answers |
  | --- | --- |
  | `{id, open: true}` | `{id, open: {pageId, title, resources, capabilities: [], nameSyntax}}` |
  | `{id, text}`, `text` the request envelope | `{id, text}`, `text` the response envelope of `call` |
  | `{pageId}`, no `id` | nothing; the page is closed |

  Outcomes (`page_expired`, `not_found`, `not_authenticated`, `not_authorized`,
  `application_error`) travel inside the response envelope. A failed open, an
  envelope that `call` refuses (`InvalidRequest`) and an unknown message
  (`Unknown Worker message`) answer `{id, error: {name, message}}`. The owner is
  null; `auth` rules answer `not_authenticated`.

Declare Source fragments with `Page.registerSource` and mount them with `remote`;
use `dataRpc` for endpoint values and `dataRemote` for lazy Data. See [Calling the server](https://github.com/gramlot-org/gramlot/blob/main/docs/public/098-server-calls.md#gc-095-100)
and [Remote content and lazy Data](https://github.com/gramlot-org/gramlot/blob/main/docs/public/099-remote-content.md#gc-095-105).

<a id="gs-130-020"></a>

## 020 · Exported files

Block ID: **GS-130-020**.

Single file: `<!doctype html>`, `<meta charset>`, viewport, the policy meta, the
title, `<script type="application/json" id="gramlot-runtime-notices">` (the
license notices of the bundled runtime and of this package), `<div id="gramlot-root">`
one `<style>` per stylesheet in `<head>`, and one `<script>` with the runtime
(global `GramlotStandalone`, which exposes `Page` to the logic
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
| `npm test` | Exporter output and failure handling, stylesheets, page logic, directory and folder export, gallery, bundles, `GramlotWorkerServer` and transport, `mount`, the quick start with typing (jsdom) |
| `serverless/scripts/verify_page_module_browser.mjs PLAYWRIGHT [ENGINE]` | A page with `Page` and `Logic` in one module, a core theme, `Page.css` and its stylesheet, as one file and as a directory |
| `serverless/scripts/verify_gallery_browser.mjs PLAYWRIGHT [ENGINE]` | `gramlot-serverless gallery` from disk: the gallery page, frames and theme, every example, the `Logic` of the examples that call its methods |
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
`<key>/` (`OUTPUT/<key>/index.html`). It holds every family of the common
`catalog.json` of the installed examples package, the registration-form example (`serverless-02`, the page
of `npm create @gramlot page`) and the families of
each `--catalog`. The command prints `Built <output>: the gallery and <n> examples;
open index.html`.

The gallery page is the browser-safe `GalleryPage` of gramlot-examples with its
texts and descriptions as data; each example extends its page with the gallery frame script, links
its stylesheet and takes the `Logic` of its page module. The staged example class also receives galleryUrls, a map from route keys to relative HTML files. The carousel uses this map for its nested frames, so the same selection works from disk and under a static-host prefix. The directory follows the
rules of `buildDirectory`: a previous gallery at `OUTPUT` is replaced. The export includes the common catalogue and Registration form; its size
depends on the installed examples and runtime, since every route holds its Worker. Without
`@gramlot/gramlot-examples` the command answers `The gallery needs
@gramlot/gramlot-examples: npm install @gramlot/gramlot-examples`.

Setup quick starts remain in the server README and tutorials; the gallery does
not include their sections or routes. Registration form remains an application
example in the standalone gallery.


<a id="gs-130-035"></a>

## 035 · Install a directory export

Block ID: **GS-130-035**.

`buildDirectory` reads the root Page's `installable` flag. When true, it writes
`app.webmanifest` from `new Page().manifest({baseUrl: './'})` and adds a manifest
link only to `index.html`. The output reserves the name `app.webmanifest`; an
asset with that name is rejected. Copy the icon named by `appIcon` through the
build's asset map. The default manifest declares a square 512×512 PNG. The gallery
export includes that asset automatically. Child Page flags do not create manifests.
A single-file `build` rejects an installable root; use directory export instead.

Serve the directory over HTTPS or localhost for browser installation. The app
still executes in the browser Worker; a static server only serves its files.
Opening `index.html` directly remains supported for execution, but is not the
installation path. No service worker or offline cache is added. Safari on macOS
Sonoma or later uses File → Add to Dock; Chromium can offer its installation prompt.

The reusable `IndexPage` and `IndexLogic` are available through the existing Page
entry in both Worker and window bundles. Use concrete exported URLs such as
`hello/index.html` in navigation. See the
[core index guide](https://github.com/gramlot-org/gramlot/blob/main/docs/public/095-writing-pages.md#gc-095-110).
