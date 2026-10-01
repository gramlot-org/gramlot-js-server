# 115 · Writing pages for this host

Document ID: **GS-115**.

[Paired view](../docs_llm/115-writing-pages.md).

The binding itself (pointers, setters, formulas, controllers, events) is the
core's: read [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).
This guide covers what is specific to the standalone export.

<a id="gs-115-005"></a>

## 005 · Files and folders

Block ID: **GS-115-005**.

- A page is a `.js` or `.mjs` module that exports `class Page` extending the core
  `Page` from `@gramlot/gramlot/page`. Any other export, or a module whose
  `Page` does not extend the core class, fails at start with
  `Page modules must export a subclass of Page`.
- The page imports the core under the same name the exporter uses,
  `@gramlot/gramlot`, installed from npm. A page that imports another name of the
  same core bundles a second copy, and the start fails with the error above.
- `<name>_aux.js` beside `<name>.js` is the companion. A `*_aux.js` file is never
  accepted as a page: `A *_aux file is a page companion, not a page`.
- Imports must be browser-compatible. The page and its imports are bundled for the
  Worker with esbuild: a Node-only import (`node:fs`, …) fails the build, and the
  existing output is kept.
- Pages are never executed at build time: a page may throw at module level without
  affecting the build; it fails only when the Worker starts.

<a id="gs-115-010"></a>

## 010 · The companion and named logic

Block ID: **GS-115-010**.

The companion exports `class Logic`. Its methods are the root logic group of the
page: `func: 'greeting'` names `Logic.prototype.greeting`. A formula method is
called as `method(kwargs)` and returns the value; a controller method as
`method(node, kwargs)`.

- The exporter bundles the companion as one ES module for the window. The Worker
  bundle never contains it (`tests/bundles.test.js` checks the esbuild metafile).
- The Worker returns only the URL that names the companion (`/<name>_aux.js`).
  The window replaces it with a Blob URL and `PageBootstrap` imports it before the
  page starts. A failing import stops the start and releases the Worker.
- The export has one Content Security Policy profile, strict: inline code
  (`formula`, `script`, `==`, `action`, `connect_on<event>`, `_if`/`_else`) is
  refused by the browser and the core reports it as an `EvalError`
  ([Troubleshooting](140-troubleshooting.md)). Move the code to a
  method of the companion.
- `js_requires` groups (`func: 'business.discount'`) need a Host with a resource
  system. `WorkerHost` resolves `Page.css` and the companion only.

<a id="gs-115-015"></a>

## 015 · Stylesheets and styles

Block ID: **GS-115-015**.

`Page.css` is a static array of URL strings, as in `<link href>`. Anything else
fails the start with `Standalone Page.css must be an array of strings`.

| Export | `Page.css` | Why |
| --- | --- | --- |
| One file (`build`) | Leave it empty; use `style` attributes | The policy of the file allows inline styles only (`style-src 'unsafe-inline'`), and there is no directory to resolve a link against |
| Directory (`buildDirectory`) | Root-relative URLs (`/theme.css`), each listed in `assets` | `mount` receives the directory as `assetRoot` and resolves each URL inside it; a relative URL, `//…`, or a `.`/`..` segment is refused |

The exporter does not rewrite `Page.css` and copies only the assets you list. A
URL that points outside the export is not served by anything.

<a id="gs-115-020"></a>

## 020 · Source methods in the Worker

Block ID: **GS-115-020**.

A method marked with `source(Page.prototype.method)` builds a Source branch on
request. In the export it runs in the Worker; the window calls it with
`gramlot.remoteSource(node, 'method', params)` and receives the branch through a
message. `main` cannot be called this way (`Unknown Source method`), and a method
that is not marked is unknown too. Parameters must survive structured cloning: a
function in `params` fails with `DataCloneError`. The core creates a fresh Page
instance for every call.

The page registered in the Worker expires after the core default of 1800
seconds; a `remoteSource` after that fails with `Unknown, expired or unowned page`.
The exporter creates the `WorkerHost` with the core defaults. Reload the file to
start again.

<a id="gs-115-025"></a>

## 025 · What the export contains and what it does not

Block ID: **GS-115-025**.

- Contained: the Gramlot runtime, the `WorkerHost` with the page, the companion,
  the runtime license notices as inert JSON (`<script type="application/json"
  id="gramlot-runtime-notices">` in the file, `assets/runtime-notices.json` in the
  directory).
- Not contained: anything the page does not import, any file not listed in
  `assets`, a server, a database, `dataRpc` or server resolvers.
- Public: everything in the export is readable by whoever opens it, the
  companion included. Keep secrets out of pages and companions.
