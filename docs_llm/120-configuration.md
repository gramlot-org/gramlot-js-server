# 120 · Configuration

Document ID: **GS-120**.

[Paired view](../docs/120-configuration.md).

No server: no mount prefix, request identity or payload limits. Configuration is
the options of `build`, `buildDirectory` and `mount`, and the policy of the file.

<a id="gs-120-005"></a>

## 005 · `build` and the command line

Block ID: **GS-120-005**.

`build({page, output})` (`@gramlot/serverless`): `page` `.js`/`.mjs` path
(`Standalone pages must be JavaScript (.js or .mjs)`; `*_aux` refused); `output`
`.html`/`.htm` (`Output must be an HTML file`), parents created, temporary file
renamed, so a failed build keeps the existing output. Returns `{output, bytes,
sha256}`. Title: the file name until start, then `Page.title`. Command
`gramlot-serverless build PAGE.js -o OUTPUT.html` prints `Built <output>: <bytes>
bytes, sha256 <hash>`; `-h` usage; errors `gramlot-serverless: <message>`, exit 1.

<a id="gs-120-010"></a>

## 010 · `buildDirectory`

Block ID: **GS-120-010**.

`buildDirectory({pages, output, assets = []})` (`@gramlot/serverless/directory`):
`pages` route → absolute `.js`/`.mjs`, `index` required, routes
`^[a-z][a-z0-9_-]*$`; `output` must not exist (`Output directory already exists`),
staged then renamed; `assets` `{source: absolute file, target: relative path
^[A-Za-z0-9._/-]+$, no leading /, no . or ..}`, no collision with generated files.
One core installation for pages and exporter (`… must resolve the same Gramlot core
installation`). Returns `{output, routes}`. Writes `index.html`,
`<route>/index.html`, `assets/standalone.js`, `assets/runtime-notices.json`,
`assets/workers/<route>.js`; relative script paths; `assetRoot` = the document's
directory; no Content Security Policy in the documents.

<a id="gs-120-015"></a>

## 015 · Content Security Policy of the single file

Block ID: **GS-120-015**.

```text
default-src 'none'; script-src 'sha256-<hash of the runtime script>' blob:;
worker-src blob:; style-src 'unsafe-inline'; img-src data: blob:;
connect-src 'none'; base-uri 'none'; form-action 'none'
```

Script allowed by the hash of its final bytes (a changed byte blocks the start;
checked by `scripts/verify_worker_sentinel_browser.mjs`); `blob:` for Worker and
companion; no `'unsafe-inline'`/`'unsafe-eval'`: named logic only
([Troubleshooting](140-troubleshooting.md)); inline styles only;
`data:`/`blob:` images; no connections. Only profile; no permissive profile; not an
option of `build`.

<a id="gs-120-020"></a>

## 020 · `mount`

Block ID: **GS-120-020**.

`mount(options)` (`@gramlot/serverless/standalone`): `workerUrl` (required);
`modules` `{}` (companion URL → import URL; missing: `Standalone module not
provided: <url>`); `element` `null`; `rootId` `'gramlot-root'`; `document`
`globalThis.document`; `signal` (abort disposes the Worker, rejects with the
reason); `assetRoot` `null` (absolute `file:`/`http:`/`https:` directory URL ending
in `/`; `Page.css` then root-relative, no `.`/`..`, resolved inside it). Resolves to
the started `Gramlot` (`window.gramlot`, `transport`, `dispose()`); on failure
disposes Worker and half-created instance.

<a id="gs-120-025"></a>

## 025 · `WorkerHost`

Block ID: **GS-120-025**.

`new WorkerHost(PageClass, {aux = null, pageTtl = 1800, maxPages = 1000, …})`
(`@gramlot/serverless/worker-host`), in the Worker. The exporter writes
`new WorkerHost(Page, {aux})` itself; options matter for custom Worker bundles.
Other core Host options are server URLs, no effect in a Worker. One page (`/`);
`resolveResources` returns `Page.css` as written and the companion URL.
