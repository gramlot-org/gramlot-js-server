# Gramlot Serverless

[![tests](https://github.com/gramlot-org/gramlot-serverless/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/gramlot-org/gramlot-serverless/actions/workflows/tests.yml)
[![Coverage](https://codecov.io/gh/gramlot-org/gramlot-serverless/branch/main/graph/badge.svg)](https://app.codecov.io/gh/gramlot-org/gramlot-serverless)
[![Documentation](https://readthedocs.org/projects/gramlot-serverless/badge/?version=latest)](https://gramlot-serverless.readthedocs.io/en/latest/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue)](LICENSE)

Standalone Browser/Worker exporter for [Gramlot](https://github.com/gramlot-org/gramlot)
JavaScript pages. It packages a `Page` module, the Gramlot runtime and a classic
Worker into one HTML file, or several pages into one static directory, that open
from disk without a server, a database or a Python process.

| Profile | Page | Runtime |
| --- | --- | --- |
| Browser / Worker (standalone) | JavaScript `Page` | One HTML file, or one directory, opened from disk |

The exporter does not execute the Page at build time. At runtime the Worker runs
the core `Host`; this repository owns the standalone `WorkerHost`, the
`WorkerTransport` and the startup (`mount`, export asset paths, the companion URL
and a `PageBootstrap` subclass that disposes the Worker on close). Source, Data,
Host and rendering stay in the core. The package `@gramlot/serverless` is not
published on any registry.

## Install

Gramlot 0.2.0 is released on JSR as `@genro/gramlot`. The repository `.npmrc`
resolves the `@jsr` scope from `npm.jsr.io`, so a clean clone installs the
released core without a local link:

```sh
git clone https://github.com/gramlot-org/gramlot-serverless.git
cd gramlot-serverless
npm install
```

`package.json` requires `@jsr/genro__gramlot >=0.2.0` and
`@jsr/genro__builders >=0.4.0`. Node 22 or later.

## Usage

Build one page into one HTML file and open it from disk:

```sh
node src/cli.js build examples/hello-world/page.js -o build/hello-world.html
```

The command takes one `.js` or `.mjs` page and one `.html` output. A failed build
leaves an existing output untouched. For several pages and shared assets, the
programmatic [`buildDirectory`](docs/010-usage.md#gs-010-030) export writes a
directory that opens from `index.html`.

- **No server, no mount prefix.** The exported file has no HTTP endpoint; marked
  Source methods run in the Worker through messages.
- **Content Security Policy.** The single-file profile always applies the strict
  profile: `script-src` allows the runtime script by the SHA-256 hash of its final
  bytes and `blob:` for the Worker and the companion, without `'unsafe-inline'`
  and `'unsafe-eval'`; `connect-src 'none'`. There is no permissive option. The
  directory profile writes no CSP.
- **Companion rule.** Named logic lives in `page_aux.js` beside `page.js`, exporting
  `Logic`. The exporter bundles it as an ES module for the window only; the Worker
  never runs it, and a `*_aux` file is never accepted as a page. Inline code is
  blocked by the single-file CSP.
- For this single-file build the page must use browser-compatible imports and
  `Page.css` must be empty; the directory profile supports declared `Page.css`
  with explicitly exported assets.

The core guide [Classes and hosts](https://github.com/gramlot-org/gramlot/blob/main/docs/public/090-classes-and-hosts.md)
describes the Host contract, the JavaScript standalone host and the CSP profiles
this exporter implements.

## Tests

```sh
npm test                 # 19 exporter tests, node:test
npm run test:coverage    # the same tests, lcov in coverage/
```

Browser checks need Playwright (`npm install --no-save playwright` and
`npx playwright install chromium`):

```sh
node src/cli.js build examples/source-live/page.js -o build/source-live.html
node scripts/verify_native_html_browser.mjs build/source-live.html node_modules/playwright/index.mjs - 'Hello Worker' details
node scripts/verify_worker_sentinel_browser.mjs node_modules/playwright/index.mjs
```

The sentinel check builds the core fixture `avvio` under the strict CSP; the
fixture is not in the published package, so it needs a core checkout beside this
repository linked with `npm install --no-save @jsr/genro__gramlot@file:../gramlot/js`.

The workflow `.github/workflows/tests.yml` runs on `main`, `develop` and pull
requests: the required job `published-core` installs the released core, runs the
tests with coverage (uploaded to Codecov) and the browser check of the exported
Hello World and source-live files in headless Chromium; the informational job
`core-main` links the `main` branch of `gramlot-org/gramlot` and adds the sentinel
check; the `documentation` job validates and builds the guides.

## Documentation

- Guides: `docs/` (expanded) and `docs_llm/` (concise), namespace GS, built with
  Sphinx and the Read the Docs theme (`.readthedocs.yaml`). Build locally with
  `python scripts/check_docs.py` (see `CONTRIBUTING.md`).
- [Architecture](docs/005-architecture.md) · [Usage](docs/010-usage.md) ·
  [Core contract](docs/015-core-port-requirements.md) ·
  [Verification](docs/020-verification.md).
- Rules for contributors and coding agents: `AGENTS.md`, `CONTRIBUTING.md`.

## Shared examples

Gramlot owns the framework documentation, the teaching examples, the runner and
the theme. This repository is a downstream consumer: it owns packaging and startup
and uses the shared material through its Gramlot dependency without a copied
suite. Update the dependency and rebuild the export to receive example changes.
See [shared example ownership](docs/010-usage.md#gs-010-035).

`examples/showcase` and `showcase.zip` are historical PoC artifacts, not output
from the current exporter and not evidence for its supported features.
