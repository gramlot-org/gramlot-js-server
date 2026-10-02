# 105 · Introduction

Document ID: **GS-105**.

[Paired view](../docs/105-introduction.md).

<a id="gs-105-005"></a>

## 005 · What this repository does

Block ID: **GS-105-005**.

Gramlot describes a web interface in Python or JavaScript and keeps it bound to the
application state in the browser; see [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html).
`@gramlot/gramlot-browser` exports one JavaScript page to one HTML file (`build`), or
several pages to one static directory (`buildDirectory`), opened without a server.
The Page runs in a Web Worker; the window renders and binds. No HTTP, no database,
no Python. Python pages and served JavaScript pages belong to the other adapters.

<a id="gs-105-010"></a>

## 010 · How a page runs here

Block ID: **GS-105-010**.

Build: the page and its companion are bundled, not executed. Run, in the browser:
`mount` creates the Worker and sends `open`; `WorkerHost` registers the Page and
returns the title, `Page.css` and the companion URL; the core `PageBootstrap`
writes the CSS links, imports the companion, registers `Logic`, creates
`window.gramlot` and starts; `main` runs in the Worker and returns the Source; the
window renders and binds the Data; `remoteSource` runs marked methods in the Worker
through messages; `dispose()` terminates the Worker. The companion never runs in
the Worker; the Worker bundle has no inline compiler
([Configuration](120-configuration.md)).
