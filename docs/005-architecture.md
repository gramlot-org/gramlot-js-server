# 005 · Architecture

Document ID: **GS-005**.

<a id="gs-005-005"></a>
## 005 · Responsibility boundary

Serverless owns JS bundling and HTML packaging, and
the standalone WorkerHost, WorkerTransport and mount orchestration. It uses
HtmlBuilder for the shell. Shared Host/Page execution, Source, Data and rendering
remain in Gramlot core. WorkerHost delegates execution to core Host; WorkerTransport
correlates messages and owns Worker disposal. Serverless mount loads declared CSS,
resolves export asset paths and exposes the app before Source scripts execute.

<a id="gs-005-010"></a>
## 010 · Browser/Worker profile

One JS Page, one classic bundled Worker, one browser runtime and one HTML file.
The module is bundled, not imported/executed by the exporter. At runtime mount
opens the page, prepares Gramlot, calls main and renders the returned typed Source.
Marked Source methods use that same host through messages, without HTTP.

<a id="gs-005-015"></a>
## 015 · Data boundary

Database and application-data import/export are excluded. The former envelope and
complete-v1 provider are removed from the active package, not emulated.

<a id="gs-005-020"></a>
## 020 · Limits

Node-specific imports fail browser bundling.
The single-file profile requires self-contained styling; its CSP blocks external CSS.
The directory profile supports declared Page.css with explicitly exported assets. CSP blocks network connections; it is not a static proof
that application code never attempts a request. The exporter has no custom runtime,
manual application DOM construction, eval bootstrap or fallback compiler.

Runtime license notices are embedded as inert JSON metadata in the HTML head,
not as a visible panel in the application.
