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
for the window, absent from the Worker bundle), the esbuild metafile of the GramlotWorkerServer bundle (no `binding/inline.js`), the
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


Development verification, 2026-10-20 — The gallery snapshots one-level navigation Bags at export time, retaining lazy directory requests in its Worker. Root Logic uses the window core; FramePage, Bag and NavigationResolver are exposed through that shared module. Nested route segments retain the existing segment grammar, use depth-correct asset/frame URLs and get parent directories for workers/stylesheets. Ten directory/gallery exporter tests pass. This is a local build verification, not a deployment.


<a id="gs-020-030"></a>

## 030 · Numbered gallery paths — 2026-10-21

Block ID: **GS-020-030**.

Owner explicitly authorizes connected catalogue and staging changes: “Sì, adegua anche le integrazioni”. Gallery catalogues require the physical family `folder`; each executable route is staged at its nested `url`, with its companions. Catalogue keys remain lesson identities. Hosted carousel links include the mount path; offline links include the route depth. Numbered path segments, including `00-index`, are supported by the static exporter without accepting traversal or empty segments. Markdown directory descriptions are supplied by the examples navigation and rendered by the gallery. No core loader change, route alias, release or deployment is included.

Verification: three static-gallery tests and seven directory-export tests pass. The export preserves numbered nested routes, companion styles and Logic, root-relative resources and carousel file URLs. This is build/test evidence; no new offline browser qualification is claimed.


Intermediate release qualification — 2026-10-21. Owner authorizes tree, pages, gallery and guide only, including the necessary connected integrations. All 43 tests pass; the generator passes its three tests. Chromium opens all 85 offline gallery lessons without network access, including shared tree collection imports and the gallery theme. Collection modules and Logic share the window runtime; Worker source remains separate. Database selectors and Genropy experiments are excluded. Package publication is pending at this checkpoint.


Publication receipt — 2026-10-21. Release v0.2.15 passed all required repository and tag checks and was published for the Node/Bun server, serverless exporter and project generator. The publication workflow completed successfully: https://github.com/gramlot-org/gramlot-js-server/actions/runs/39574695535 . This records package publication; hosted gallery promotion has its own deployment receipt.

<a id="gs-020-035"></a>

## 035 · Optional Typst collection packaging — 2026-10-21

Block ID: **GS-020-035**.

Directory exports put collection module strings once in assets/collections.js.
Route bootstraps merge these with Logic and create local Blob module URLs.
Tests cover two routes sharing one module, script loading order, reserved-path
collision and execution of the generated module-map bootstrap. Typst's gallery
page exports with layout/editors/typst collections and local theme assets. Its
PDF compiler, renderer and fonts are embedded; the core tests exercise actual
WASM compilation with fetch forbidden. The single-HTML API is unchanged and
does not accept optional collections.

Combined build/directory/standalone/bundles run: 32 of 33 pass. The unchanged
module-graph test fails because inline.js is reachable through server/page.js →
index-page-runtime.js → core index → source-handler → binding/runtime. The
Typst modules are not on that path. This existing dependency-boundary defect is
not weakened or repaired by the packaging change. Eight directory tests pass.
Browser file:// opening was refused by the tool, so fresh file-origin UI
verification of the exported directory remains manual. No release or deployment.

The existing `codeMirrorWithOptions` is now exposed by the window-core bridge,
standalone runtime and single-file bootstrap. Its regression test passes; this
fixes the CodeMirror options playground export without bundling another core.

Editor release qualification — 2026-10-21. All 45 serverless tests pass against the consolidated core/examples candidates, including one shared collection payload across routes, reserved-output rejection, imported module semantics and the prohibition of inline.js in the Worker graph. Both documentation views build successfully. Typst compiler/font bytes are contained in the collection; the browser engine tests run with network disabled. The earlier inline-graph failure is resolved by retaining the published core entry-point boundaries. Publication is pending at this checkpoint.


Documentation source integration — 2026-10-23. The owner authorizes the core and
examples Read the Docs publication and consolidation of its required source
prerequisites, without npm/PyPI releases. Prepared collection artifacts are
verified before the directory exporter derives shared browser modules. The HTTP
consumer uses the same verified identity and rejects changed bytes. Public
cookie ownership and dynamic runtime exports are preserved. Coordinated CI uses
`scripts/prepare_source_dependencies.py`: main for public-source runs, develop
for preview runs, with commit identities in logs and no first-party pins.
