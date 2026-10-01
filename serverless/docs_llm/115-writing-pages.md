# 115 · Writing pages for this host

Document ID: **GS-115**.

[Paired view](../docs/115-writing-pages.md).

Binding: the core [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).
Here: what is specific to the export.

<a id="gs-115-005"></a>

## 005 · Files and folders

Block ID: **GS-115-005**.

- `.js`/`.mjs` module exporting `class Page extends Page` of
  `@gramlot/gramlot/page`; otherwise `Page modules must export a subclass of Page`.
- Same core name as the exporter (`@gramlot/gramlot`, from npm);
  another name bundles a second core and fails with the same error.
- `<name>_aux.js` beside `<name>.js` is the companion; never a page
  (`A *_aux file is a page companion, not a page`).
- Browser-compatible imports only: a Node-only import fails the esbuild bundle;
  the existing output is kept.
- Pages are not executed at build time.

<a id="gs-115-010"></a>

## 010 · The companion and named logic

Block ID: **GS-115-010**.

`export class Logic`; methods are the root group (`func: 'greeting'`); formula
`method(kwargs)` returns the value, controller `method(node, kwargs)`. Bundled as
one ES module for the window; absent from the Worker bundle (checked by
`tests/bundles.test.js`); the Worker returns only its URL, the window imports a
Blob URL before start; a failed import stops the start and releases the Worker.
One strict CSP profile: inline code (`formula`, `script`, `==`, `action`,
`connect_on<event>`, `_if`/`_else`) raises the core `EvalError`
([Troubleshooting](140-troubleshooting.md)). `js_requires` groups need
a resource Host; `WorkerHost` resolves `Page.css` and the companion only.

<a id="gs-115-015"></a>

## 015 · Stylesheets and styles

Block ID: **GS-115-015**.

`Page.css`: static array of URL strings, else `Standalone Page.css must be an array
of strings`. Single file: leave it empty, use `style` attributes (`style-src
'unsafe-inline'` only, no directory to resolve against). Directory: root-relative
URLs listed in `assets`, resolved inside `assetRoot`; relative, `//…`, `.`/`..`
refused. `Page.css` is not rewritten; only listed assets are copied.

<a id="gs-115-020"></a>

## 020 · Source methods in the Worker

Block ID: **GS-115-020**.

`source(Page.prototype.method)` methods run in the Worker on
`gramlot.remoteSource(node, 'method', params)`. `main` and unmarked methods:
`Unknown Source method`. Params must be structured-cloneable (`DataCloneError`
otherwise). Fresh Page instance per call. The registered page expires after the
core default 1800 s (`Unknown, expired or unowned page`); the exporter uses the
core defaults; reload the file.

<a id="gs-115-025"></a>

## 025 · What the export contains and what it does not

Block ID: **GS-115-025**.

Contained: runtime, `WorkerHost` with the page, companion, license notices
(`gramlot-runtime-notices` JSON script, or `assets/runtime-notices.json`). Not
contained: unimported files, unlisted assets, a server, a database, `dataRpc`,
server resolvers. Everything in the export is public, the companion included.
