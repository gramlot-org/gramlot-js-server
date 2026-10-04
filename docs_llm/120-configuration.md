# 120 · Configuration

Document ID: **GS-120**.

[Paired view](../docs/120-configuration.md).

No server: no mount prefix, request identity or payload limits. Configuration is
the command, `build`, `buildDirectory`, `mount`, and the policy of the file.

<a id="gs-120-005"></a>

## 005 · `build` and the command line

Block ID: **GS-120-005**.

`build({page, output})` (`@gramlot/gramlot-serverless`): `page` `.js`/`.mjs` path
(`Standalone pages must be JavaScript (.js or .mjs)`; `*_aux` refused); `output`
`.html`/`.htm` (`Output must be an HTML file`), parents created, temporary file
renamed, so a failed build keeps the existing output. Returns `{output, bytes,
sha256}`. Title: the file name until start, then `Page.title`. Imports the module
for `Page.css` and `Logic`; stylesheets written into the file. Command:
`build PAGE.js -o OUTPUT.html` (`Built <output>: <bytes> bytes, sha256 <hash>`);
`build FOLDER -o OUTPUT` (`Built <output>: <n> pages (<routes>)`); `gallery OUTPUT
[--catalog CATALOG.json PAGES]...` ([Reference](130-reference.md)); `-h` usage;
errors `gramlot-serverless: <message>`, exit 1.

<a id="gs-120-010"></a>

## 010 · `buildDirectory`

Block ID: **GS-120-010**.

`buildDirectory({pages, output, assets = []})` (`@gramlot/gramlot-serverless/directory`):
`pages` route → absolute `.js`/`.mjs`, `index` required, routes
`^[a-z][a-z0-9_-]*$`; `output`: a previous export (with `assets/standalone.js`) is
replaced, any other existing path fails (`… is not a previous export`); staged then
renamed; `assets` `{source: absolute file, target: relative path
^[A-Za-z0-9._/-]+$, no leading /, no . or ..}`, no collision with generated files.
One core installation for pages and exporter (`… must resolve the same Gramlot core
installation`). Returns `{output, routes}`. Writes `index.html`,
`<route>/index.html`, `assets/standalone.js`, `assets/runtime-notices.json`,
`assets/workers/<route>.js`, `assets/styles/<route>.css` (`<name>.css`); `/themes/`
URLs of `Page.css` copied from the core; `folderPages(folder)` gives `{pages,
assets}` of a folder; relative script paths; `assetRoot` = the document's
directory; no Content Security Policy in the documents.

<a id="gs-120-015"></a>

## 015 · Content Security Policy of the single file

Block ID: **GS-120-015**.

```text
default-src 'none'; script-src 'sha256-<hash of the runtime script>' 'unsafe-eval' blob:;
worker-src blob:; style-src 'unsafe-inline'; img-src data: blob:;
connect-src *; base-uri 'none'; form-action 'none'
```

Script allowed by the hash of its final bytes (a changed byte blocks the start;
checked by `serverless/scripts/verify_worker_sentinel_browser.mjs`); `blob:` for Worker and
logic module; no `'unsafe-inline'`; `'unsafe-eval'` compiles the inline code of the Source
received from the Worker: named logic and inline code run; code written later is refused
([Troubleshooting](140-troubleshooting.md)); `<style>` (from `Page.css`, `<name>.css`) and `style` attributes; `data:`/`blob:` images;
connections open (`connect-src *`) until a page can declare its own policy. Only
profile, from 0.2.3 (0.2.2: no `'unsafe-eval'`, `connect-src 'none'`); not an option of
`build`.

<a id="gs-120-020"></a>

## 020 · `mount`

Block ID: **GS-120-020**.

`mount(options)` (`@gramlot/gramlot-serverless/standalone`): `workerUrl` (required);
`modules` `{}` (logic URL → import URL; missing: `Standalone module not
provided: <url>`); `element` `null`; `rootId` `'gramlot-root'`; `document`
`globalThis.document`; `signal` (abort disposes the Worker, rejects with the
reason); `assetRoot` `null` (absolute `file:`/`http:`/`https:` directory URL ending
in `/`; `Page.css` then root-relative, no `.`/`..`, resolved inside it). Resolves to
the started `Gramlot` (`window.gramlot`, `transport`, `dispose()`); on failure
disposes Worker and half-created instance.

<a id="gs-120-025"></a>

## 025 · `WorkerHost`

Block ID: **GS-120-025**.

`new WorkerHost(PageClass, {logic = null, stylesheet = null, inlineCss = false,
pageTtl = 1800, maxPages = 1000, …})` (`@gramlot/gramlot-serverless/worker-host`), in
the Worker; `logic` was `aux` until 0.2.3 (old name not accepted). The exporter
writes the entry itself; options matter for custom Worker bundles. Other core Host
options are server URLs. One page (`/`); `resolveResources` returns `Page.css`, the
page stylesheet (none with `inlineCss`) and the logic URL.
