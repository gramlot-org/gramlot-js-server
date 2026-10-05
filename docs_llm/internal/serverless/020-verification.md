# 020 · Verification

> **Naming (2026-10-02):** in the dated text of this document, "native" as the label of a release, profile, milestone, adapter, module, API or pages names the scope of the 0.1.0 milestone (no web components, no recipes). That label has no technical meaning; current documents do not use it ([GC-005 §030](https://github.com/gramlot-org/gramlot/blob/main/docs/005-documentation-policy.md#gc-005-030)). "native" for browser controls, DOM events, HTML attributes, DOM operations, Bag events or platform APIs keeps its technical meaning. Dated text is not rewritten.

Document ID: **GS-020**.

> **Historical record (2026-09-21 to 2026-10-01):** blocks 010 to 025 describe the
> verification status of those dates; not the current state. Current: block 005,
> and the Compatibility table of the [README](../../../README.md).

[Paired view](../../../docs/internal/serverless/020-verification.md).

<a id="gs-020-005"></a>

## 005 · Automated checks

Block ID: **GS-020-005**.

`npm test` checks output, that `main` does not run at build time, rejected
Python/Node-only inputs, CLI use and preservation of existing output on failure.
`npm test` also checks the page logic (the `Logic` export or the companion, bundled
for the window, absent from the Worker bundle), the esbuild metafile of the WorkerHost bundle (no `binding/inline.js`), the
CSP hash of the final script bytes, and the `PageBootstrap` subclass that releases
the Worker without a close beacon.
`scripts/verify_export_browser.mjs` opens an actual exported artifact from file,
blocks HTTP(S), and checks main, Source mutations, optional remote Source and dispose.
`scripts/verify_worker_sentinel_browser.mjs PLAYWRIGHT [ENGINE]` builds the core page
`avvio` (`js/tests/fixtures/logic/avvio.js` of the linked core checkout, `Page` and
`Logic` in one module) as one file and opens it under its CSP. The `_init` formula runs the
named logic in the window; `globalThis.gramlotSentinel` stays 0 in the Worker. A copy
with one byte added to the runtime script is blocked by the CSP. The fixture is not
part of the published package, so this check needs a linked core checkout.
`scripts/verify_inline_browser.mjs` opens the export of `examples/inline-code` and
checks its inline code (formula, controller, `==`, `_if`/`_else`, `action`,
`connect_onclick`) and the formula of a remote Source, with no CSP violation.

The workflow `.github/workflows/tests.yml` runs on push to `main` and `develop`, on
pull requests and manually. The required job `published core` installs the core
from the registry, runs `npm test` with coverage (`coverage/lcov.info`, uploaded to
Codecov), the `verify_export_browser.mjs` check in headless Chromium for
`examples/hello-world` and `examples/source-live`, `verify_inline_browser.mjs` for
`examples/inline-code`, `verify_quickstart_browser.mjs`, `verify_page_module_browser.mjs`
and `verify_gallery_browser.mjs`. The informational job `core main`
checks out `gramlot-org/gramlot` at `main` beside the repository, links it with
`npm install --no-save`, and runs the same tests, the sentinel check and the
source-live, inline-code, quick start, page module and gallery browser checks. The `documentation` job runs `scripts/check_docs.py`,
which validates the paired guides and builds both views with Sphinx.

<a id="gs-020-010"></a>

## 010 · Status

Block ID: **GS-020-010**.

Local verification, 2026-09-21: all three exporter tests pass. The npm tarball is
installed in gramlot-examples Hello World; its build:standalone command succeeds
and its existing host test passes. Chrome153.0.8010.48 opens the exported Hello World
with blocked HTTP(S), typed main, Source updates/insertion/deletion and Worker cleanup.
Chrome and Playwright WebKit26.6 also pass the source-live artifact, including a
marked remote Source method executed in the Worker. WebKit is not Safari.

The 2026-09-21 verified graph used local archives: core0.0.0-dev.1, Builder JS0.1.3,
Bag JS0.5.2 (gramlot-strict-source artifact) and TYTX0.15.0. The new exporter is
0.0.0-dev.1. No manifest pin or lockfile was retained. Local installation is not
proof of fresh upstream availability; no package was published. Current native
0.1.0 delivery uses the local `@gramlot/native-html` 0.1.0 archive; see the
[artifact handoff](https://github.com/gramlot-org/gramlot/blob/main/docs/internal/135-release-handoff.md).
Do not equate the historical PoC showcase or the old eight-profile matrix with
verification of this exporter. Safari and Firefox remain unverified.

<a id="gs-020-015"></a>

## 015 · Status 2026-09-24

Block ID: **GS-020-015**.

Local verification, 2026-09-24: the `@gramlot/minimal` npm archive and updated Hello World
archive install together; the installed CLI builds an HTML file opened by
Chromium 153 with live Source, Worker disposal and blocked HTTP(S). The three
exporter tests pass. These results do not imply publication of the new packages.

<a id="gs-020-020"></a>

## 020 · Status 2026-09-30

Block ID: **GS-020-020**.

Local verification, 2026-09-30, with the core branch `wf/gramlot-0-2-0-binding`
(`cb46c20`) linked in place of `@gramlot/gramlot`, `@genrojs/builders` 0.4.0 and
`@genrojs/bag` 0.10.0: `npm test` passes (19 tests). The sentinel check passes in
Chromium 153.0.8010.12 and Playwright WebKit 26.6 (window sentinel 1, Worker sentinel
0, altered script blocked). `verify_native_html_browser.mjs` passes for Hello World
and source-live in both engines. The core `scripts/verify_worker_host_browser.mjs`
passes in both engines. Firefox is not verified. Core 0.2.0 was not yet published on
that date; these results did not imply publication.

<a id="gs-020-025"></a>

## 025 · Status 2026-10-01

Block ID: **GS-020-025**.

Verification with the released core, 2026-10-01, in a clean clone with
`@gramlot/gramlot` 0.2.0 and `@genrojs/builders` 0.4.0 installed from the
registry: `npm test` passes (19 tests); `verify_native_html_browser.mjs` passes for
Hello World and source-live in headless Chromium 153.0.8010.12. With the core
`main` checkout (`93cacf1`) linked in place of the registry package: the same 19
tests pass, the sentinel check and the source-live browser check pass in the same
Chromium. The exporter package is not published; these results concern the
repository checkout.
