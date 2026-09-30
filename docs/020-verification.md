# 020 · Verification

Document ID: **GS-020**.

<a id="gs-020-005"></a>
## 005 · Automated checks

`npm test` checks output, no build-time Page execution, rejected Python/Node-only
inputs, CLI use and preservation of existing output on failure.
`npm test` also checks the companion (bundled for the window, absent from the Worker
bundle), the esbuild metafile of the WorkerHost bundle (no `binding/inline.js`), the
CSP hash of the final script bytes, and the `PageBootstrap` subclass that releases
the Worker without a close beacon.
`scripts/verify_native_html_browser.mjs` opens an actual exported artifact from file,
blocks HTTP(S), and checks main, Source mutations, optional remote Source and dispose.
`scripts/verify_worker_sentinel_browser.mjs PLAYWRIGHT [ENGINE]` builds the core page
`avvio` (`js/tests/fixtures/logic/avvio.js` and `avvio_aux.js` of the linked core
checkout) as one file and opens it under the strict CSP. The `_init` formula runs the
named logic in the window; `globalThis.gramlotSentinel` stays 0 in the Worker. A copy
with one byte added to the runtime script is blocked by the CSP.

<a id="gs-020-010"></a>
## 010 · Status

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
0.1.0 delivery uses the locally prepared `@gramlot/native-html` 0.1.0 archive;
see the core's [artifact handoff](https://github.com/gramlot-org/gramlot/blob/main/docs/internal/135-release-handoff.md).
Do not equate the historical PoC showcase or the old eight-profile matrix with
verification of this exporter. Safari and Firefox remain unverified.

<a id="gs-020-015"></a>

Local verification, 2026-09-24: the `@gramlot/minimal` npm archive and updated Hello World
archive install together; the installed CLI builds an HTML file opened by
Chromium 153 with live Source, Worker disposal and blocked HTTP(S). The three
exporter tests pass. These results do not imply publication of the new packages.

<a id="gs-020-020"></a>

Local verification, 2026-09-30, with the core branch `wf/gramlot-0-2-0-binding`
(`cb46c20`) linked in place of `@jsr/genro__gramlot`, `@jsr/genro__builders` 0.4.0 and
`@jsr/genro__bag` 0.10.0: `npm test` passes (19 tests). The sentinel check passes in
Chromium 153.0.8010.12 and Playwright WebKit 26.6 (window sentinel 1, Worker sentinel
0, altered script blocked). `verify_native_html_browser.mjs` passes for Hello World
and source-live in both engines. The core `scripts/verify_worker_host_browser.mjs`
passes in both engines. Firefox is not verified. Core 0.2.0 is not published; these
results do not imply publication.
