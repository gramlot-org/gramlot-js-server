# 010 · Usage

Document ID: **GS-010**.

[Paired view](../../docs_llm/internal/010-usage.md).

<a id="gs-010-005"></a>

## 005 · Build

Block ID: **GS-010-005**.

Clone this repository and run `npm install`: `@gramlot/gramlot` 0.2.1 (the core,
published on npm on 2026-10-01) and `@genrojs/builders` install from npm; no local
link is needed. The exporter itself is not published on any registry, so run
it from the checkout:

```sh
node src/cli.js build examples/hello-world/page.js -o build/hello-world.html
```

Where the package is installed as a dependency, the same command is
`npx --no-install gramlot-serverless build <page.js> -o <output.html>`.

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

`buildDirectory` is the programmatic Browser/Worker exporter for several JavaScript
Pages opened directly from one directory. It is separate from the single-file `build`
command. Supply an `index` Page and additional lowercase route identifiers; each
Page path and asset source must be absolute. The output directory must not exist.

```javascript
import {resolve} from 'node:path';
import {buildDirectory} from '@gramlot/serverless/directory';

await buildDirectory({
    pages: {
        index: resolve('pages/index.js'),
        e01: resolve('pages/e01.js'),
    },
    output: resolve('dist'),
    assets: [
        {source: resolve('themes/gramlot-base/theme.css'),
         target: 'themes/gramlot-base/theme.css'},
    ],
});
```

The exporter writes `index.html`, `e01/index.html`, one classic bootstrap script
per Page under `assets/workers/`, one copied `assets/standalone.js` runtime and
`assets/runtime-notices.json`. It copies only listed assets to their exact relative
targets. Routes are safe lowercase identifiers (`a`–`z`, digits, `_`, `-` after the
first letter); asset targets cannot escape the output or conflict with generated
files. All Pages must resolve the same Gramlot core installation. Builds do not
execute Page code and do not replace an existing output directory.

Open `dist/index.html` directly from disk; child pages are at
`dist/e01/index.html`. Each page loads the shared runtime and its own bootstrap
through relative file paths. The bootstrap contains the bundled Worker source,
creates a Blob Worker, and passes the directory root to Serverless mount so declared
`Page.css` and other exported assets resolve without changing the Page. A companion
`<page>_aux.js` is embedded in the same bootstrap and imported by the window from a
Blob URL. Blob URLs are revoked after startup. The directory profile requires no HTTP server and does
not execute Pages on the server. Chromium is the browser verified for this profile;
other browsers have not yet been verified.


<a id="gs-010-035"></a>

## 035 · Shared examples from Gramlot

Block ID: **GS-010-035**.

Serverless packages JavaScript pages for a browser Worker without a server.

Gramlot is the primary reference for framework concepts, APIs and the shared
teaching examples. Start with its documentation on Read the Docs and its source
repository. Then choose an integration, read its environment-specific guide and
clone that integration repository to configure and run the examples in that host.
Read the Docs is the documentation delivery target; this policy does not claim
that every integration site is already connected or published.

The integration repositories are downstream consumers of Gramlot. Gramlot owns
the example pages, their READMEs, the runner, logo and shared theme. Integrations
own adapters, environment configuration, launch commands and hosting instructions.
They must consume the shared material from the Gramlot dependency rather than
maintain copied teaching suites. Generated installation or export assets are
reproducible outputs, not independently maintained sources.

Python examples run inside Flask, FastAPI, Django, Kajenn or gramlot-uvicorn.
JavaScript examples run inside Node.js/Bun or Serverless's browser Worker
standalone profile. The integration selects the execution language; the shared
runner does not ask users to switch between Python and JavaScript.

To receive changed examples, update the Gramlot dependency following the chosen
integration's setup instructions, then restart the host or rebuild the standalone
export. An existing installation or exported folder does not update itself when
upstream changes. First-party dependencies remain unpinned; the published 0.1.0
archives remain immutable.

This is the agreed distribution model. The teaching sources already live in
Gramlot under `examples/html_svg`, the runner under `examples/00-runner`, and the
theme under `themes/gramlot-base`. Uniform dependency packaging and example launch
commands across all six integrations still need implementation and verification.
Existing Hello World smoke launchers and historical demos do not establish that
this shared teaching-suite workflow is already available in every integration.

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
