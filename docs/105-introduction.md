# 105 · Introduction

Document ID: **GS-105**.

[Paired view](../docs_llm/105-introduction.md).

<a id="gs-105-005"></a>

## 005 · What this repository does

Block ID: **GS-105-005**.

Gramlot describes a web interface in Python or JavaScript and keeps it bound to the
application state in the browser. [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html)
explains the core concepts (Page, Source, Data, logic, Host) and lists the repositories.

`@gramlot/gramlot-serverless` takes JavaScript Gramlot pages and produces something
that opens without a server. One command, `gramlot-serverless build`, does both:

- **one HTML file** from one page (`build page.js -o page.html`): the page, its
  stylesheets, the Gramlot runtime and a Web Worker in a single file, under the
  Content Security Policy of the file;
- **one static directory** from a folder of pages (`build pages -o dist`): one
  folder per page, one shared runtime, the stylesheets and the other files of the
  folder, opened from `index.html`.

`gramlot-serverless gallery <folder>` writes the gallery of
`@gramlot/gramlot-examples` the same way. `npm create @gramlot page|site` writes a
new project with the build ready ([No server: a tutorial](135-serverless-tutorial.md)).

The Page runs in a dedicated Web Worker; the window renders its Source and keeps
the Data bound to the controls. There is no HTTP endpoint, no database and no
Python process. Pages in Python, or JavaScript pages behind a server, belong to
the other adapters of the family.

<a id="gs-105-010"></a>

## 010 · How a page runs here

Block ID: **GS-105-010**.

At build time the exporter imports the page module, as the core `FileHost` does,
to read `Page.css` and its `Logic` export; `main` does not run. It bundles the
page for the Worker and the page logic for the window. At run time, in the
browser:

1. The runtime script of the exported document calls `mount`. `mount` creates the
   Worker from the bundled script and sends it the `open` request.
2. In the Worker, `WorkerHost` registers the Page and answers with the page ID,
   the title and the resources: the stylesheet URLs (none in the single file,
   which holds the stylesheets) and the URL that names the page logic module.
3. In the window, the core `PageBootstrap` writes the stylesheet links, imports
   the logic module and registers its `Logic` class, creates the `Gramlot`
   instance (`window.gramlot`) and starts the page.
4. The start sends `main` to the Worker. The Worker runs `Page.main`, builds the
   Source and returns it. The window renders the DOM and binds the Data.
5. A method marked with `source(...)` runs in the Worker when the window calls
   `remoteSource`; messages replace HTTP.
6. `window.gramlot.dispose()` terminates the Worker; a dedicated Worker also
   ends with its document. Nothing is sent anywhere.

The page logic is the `Logic` export of the page module, else the module
`<page>_aux.js` beside it. It runs in the window only, and imports
`@gramlot/gramlot/page` from the core of the window: one core instance in the
window. Inline code of the Source runs in the window as well
([Configuration](120-configuration.md)).
