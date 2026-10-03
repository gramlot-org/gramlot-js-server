# 005 · Architecture

Document ID: **GS-005**.

[Paired view](../../../docs_llm/internal/serverless/005-architecture.md).

<a id="gs-005-005"></a>

## 005 · Responsibility boundary

Block ID: **GS-005-005**.

Serverless owns JS bundling and HTML packaging, and
the standalone WorkerHost, WorkerTransport and mount orchestration. It uses
HtmlBuilder for the shell. Shared Host/Page execution, Source, Data and rendering
remain in Gramlot core. WorkerHost delegates execution to core Host; WorkerTransport
correlates messages and owns Worker disposal. Serverless mount opens the page in the
Worker, resolves export asset paths, maps the companion module and runs the core
`PageBootstrap`. `PageBootstrap` writes the CSS links, imports the companion,
registers its `Logic` and exposes the app before start. The Worker transport reaches
`Gramlot` inside the bootstrap config. A `PageBootstrap` subclass overrides
`closePage()`: it disposes the Worker transport instead of sending a close beacon.

<a id="gs-005-010"></a>

## 010 · Browser/Worker profile

Block ID: **GS-005-010**.

One JS Page, one classic bundled Worker, one browser runtime and one HTML file.
The module is bundled, not imported/executed by the exporter. At runtime mount
opens the page, prepares Gramlot, calls main and renders the returned typed Source.
Marked Source methods use that same host through messages, without HTTP.

A companion `foo_aux.js` beside the page `foo.js` is bundled separately as an ES
module for the window. The Worker returns only the URL that names it (`WorkerHost`
option `aux`) in the `open` resources, with group null. The window replaces that URL
with a Blob URL, keeping order and group, and `PageBootstrap` imports it. The
companion never runs in the Worker. A `*_aux` file is never a page. The core inline
compiler (`binding/inline.js`) is not in the WorkerHost bundle.

<a id="gs-005-015"></a>

## 015 · Data boundary

Block ID: **GS-005-015**.

Database and application-data import/export are excluded. The former envelope and
complete-v1 provider are removed from the active package, not emulated.

<a id="gs-005-020"></a>

## 020 · Limits

Block ID: **GS-005-020**.

Node-specific imports fail browser bundling.
The single-file profile requires self-contained styling; its CSP blocks external CSS.
Its CSP: `script-src` allows the runtime script by the SHA-256 hash of its final
bytes, `'unsafe-eval'` and `blob:` for the Worker and the companion, without
`'unsafe-inline'`; `connect-src *`. Named logic and the inline code of the received
Source run (core amendment 11.53); `serverless/scripts/verify_inline_browser.mjs`
checks inline code of main and of a remote Source in Chromium. The directory profile
writes no CSP (core amendment 11.40).
The directory profile supports declared Page.css with explicitly exported assets. CSP leaves network connections open. The exporter has no custom runtime,
manual application DOM construction, eval bootstrap or fallback compiler.

Runtime license notices are embedded as inert JSON metadata in the HTML head,
not as a visible panel in the application.
