# 010 · Usage

Document ID: **GS-010**.

[Paired view](../../docs/internal/010-usage.md).

<a id="gs-010-005"></a>

## 005 · Build

Block ID: **GS-010-005**.

Clone and `npm install`: `@gramlot/gramlot` 0.2.1 (npm, 2026-10-01) and `@genrojs/builders` from the registry. The exporter is
not published; run it from the checkout:

```sh
node src/cli.js build examples/hello-world/page.js -o build/hello-world.html
```

Installed as a dependency, the command is `npx --no-install gramlot-serverless build`.

The command takes exactly one .js or .mjs page and an .html/.htm output. It does not
read the old TOML project format. Paths resolve against the current directory.
Failed builds do not replace an existing output; successful writes are atomic.

<a id="gs-010-010"></a>

## 010 · Author a page

Block ID: **GS-010-010**.

```javascript
import {Page as BasePage, source} from '@gramlot/gramlot/page';
export class Page extends BasePage {
    main(root) { root.h1('Hello'); root.section(null, {id:'details'}); }
    details(root, {text}) { root.p(text); }
}
source(Page.prototype.details);
```

Page.main is executed when the HTML opens, not when building. Runtime transport
is owned by Gramlot. There is no additional standalone Page subclass.

Named logic lives in the companion `page_aux.js` beside `page.js`, which exports
`Logic`. The exporter bundles it for the window only. Inline code is blocked by the
single-file CSP (GS-005-020).

<a id="gs-010-015"></a>

## 015 · Open and close

Block ID: **GS-010-015**.

Open the output from disk. globalThis.gramlot is the started instance; its normal
Source APIs and remoteSource operate without a server. dispose terminates its Worker.
Runtime startup errors are reported to the browser console. No database is included.

<a id="gs-010-020"></a>

<a id="gs-010-030"></a>

## 030 · Export a static directory

Block ID: **GS-010-030**.

`buildDirectory` from `@gramlot/serverless/directory` builds several JavaScript Pages
that open directly from disk. It requires an `index` route, absolute `.js`/`.mjs` Page
paths, a fresh output directory, and an explicit list of assets with absolute
sources and safe relative targets. Routes are lowercase identifiers. It rejects
path traversal, generated-file collisions and Pages resolving different Gramlot
core installations.

The output contains `index.html`, `<route>/index.html`, classic bootstrap scripts
with bundled Worker source under `assets/workers/`, a shared
`assets/standalone.js` runtime, runtime notices, and only listed assets. Each page
loads scripts through relative paths. The bootstrap creates a Blob Worker, passes
the directory root to Serverless mount for declared `Page.css` and exported assets,
embeds a companion `<page>_aux.js` for the window, then revokes the Blob URLs. Pages are not run at build time and `Page.css` is not
altered. Open `index.html` with `file://`; no HTTP server is required. This
directory profile is browser-verified in Chromium only; the single-HTML exporter
remains separate.


<a id="gs-010-035"></a>

## 035 · Shared examples from Gramlot

Block ID: **GS-010-035**.

Serverless packages JavaScript pages for a browser Worker without a server.

Gramlot is the upstream reference for framework documentation and the shared
teaching suite: pages, READMEs, runner, logo and theme. Read its manual first,
then the chosen integration's guide; clone that downstream repository for its
adapter, configuration and launch instructions. Read the Docs is the documentation
target, not a claim that all integration sites are already published.

Integrations consume Gramlot's examples without maintaining local source copies.
Python runs in Flask/FastAPI/Django/Kajenn or gramlot-uvicorn; JavaScript runs
in Node.js/Bun or Serverless's browser Worker. The integration selects the language.
Update the Gramlot dependency, then restart or regenerate the standalone export
to receive changes. Installed environments and exports do not refresh themselves.
Generated assets are outputs, not another source. First-party dependencies remain
unpinned; published 0.1.0 archives are immutable.

Agreed model, not completed ecosystem rollout: sources exist in `examples/html_svg`,
`examples/00-runner` and `themes/gramlot-base`; uniform dependency packaging and
launch commands for all six integrations remain to be implemented and verified.
Historical demos and existing Hello World smoke launchers are separate evidence.

See the [Gramlot guide](https://github.com/gramlot-org/gramlot/blob/main/docs/public/025-try.md#gc-025-020) for the authoritative shared policy. Public documentation follows `main`; unpublished development changes are not yet part of that public reference.


<a id="gs-010-040"></a>

## 040 · Development standalone ownership

Block ID: **GS-010-040**.

Serverless owns WorkerHost, WorkerTransport and standalone startup, including local
export asset resolution and the companion module URL. CSS links and Logic
registration belong to the core `PageBootstrap`. Serverless consumes the shared core
Host through `@gramlot/gramlot/host`. It requires core 0.2.0
(`@gramlot/gramlot >=0.2.0`), published on JSR on 2026-09-30 and installed from
the registry by `npm install`. Verification against the core `main` branch links a
checkout beside this repository with
`npm install --no-save @gramlot/gramlot@file:../gramlot/js`; the CI job
`core main` does the same. The 0.1.x archives remain unchanged. There is no
compatibility wrapper for the former core standalone entries.
