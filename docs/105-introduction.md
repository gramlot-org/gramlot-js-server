# 105 · Introduction

Document ID: **GS-105**.

[Paired view](../docs_llm/105-introduction.md).

<a id="gs-105-005"></a>

## 005 · What this repository does

Block ID: **GS-105-005**.

Gramlot describes a web interface in Python or JavaScript and keeps it bound to the
application state in the browser. [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html)
explains the core concepts (Page, Source, Data, logic, Host) and lists the repositories.

`@gramlot/gramlot-browser` takes one JavaScript Gramlot page and produces something that
opens without a server:

- **one HTML file** (`build`): the page, the Gramlot runtime and a Web Worker in a
  single file, under a strict Content Security Policy;
- **one static directory** (`buildDirectory`): several pages, one shared runtime,
  the stylesheets and assets you list, opened from `index.html`.

The Page runs in a dedicated Web Worker; the window renders its Source and keeps
the Data bound to the controls. There is no HTTP endpoint, no database and no
Python process. Pages in Python, or JavaScript pages behind a server, belong to
the other adapters of the family.

<a id="gs-105-010"></a>

## 010 · How a page runs here

Block ID: **GS-105-010**.

At build time the exporter bundles the page module and its companion without
executing them. At run time, in the browser:

1. The runtime script of the exported document calls `mount`. `mount` creates the
   Worker from the bundled script and sends it the `open` request.
2. In the Worker, `WorkerHost` registers the Page and answers with the page ID,
   the title and the resources: `Page.css` as written, and the URL that names the
   companion `<page>_aux.js`.
3. In the window, the core `PageBootstrap` writes the stylesheet links, imports
   the companion module and registers its `Logic` class, creates the `Gramlot`
   instance (`window.gramlot`) and starts the page.
4. The start sends `main` to the Worker. The Worker runs `Page.main`, builds the
   Source and returns it. The window renders the DOM and binds the Data.
5. A method marked with `source(...)` runs in the Worker when the window calls
   `remoteSource`; messages replace HTTP.
6. `window.gramlot.dispose()` terminates the Worker; a dedicated Worker also
   ends with its document. Nothing is sent anywhere.

The companion never runs in the Worker, and the Worker bundle contains no inline
compiler: named logic is the only logic of the export (see
[Configuration](120-configuration.md)).
