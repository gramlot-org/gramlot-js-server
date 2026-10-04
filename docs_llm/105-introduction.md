# 105 · Introduction

Document ID: **GS-105**.

[Paired view](../docs/105-introduction.md).

<a id="gs-105-005"></a>

## 005 · What this repository does

Block ID: **GS-105-005**.

Gramlot describes a web interface in Python or JavaScript and keeps it bound to the
application state in the browser; see [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html).
`gramlot-serverless build page.js -o page.html` exports one page to one HTML file
(stylesheets inside, CSP of the file); `gramlot-serverless build pages -o dist`
exports a folder of pages to one static directory. `gramlot-serverless gallery`
writes the gramlot-examples gallery; `npm create @gramlot page|site` writes a
project ([No server: a tutorial](135-serverless-tutorial.md)). The Page runs in a
Web Worker; the window renders and binds. No HTTP, no database, no Python.

<a id="gs-105-010"></a>

## 010 · How a page runs here

Block ID: **GS-105-010**.

Build: the page module is imported (as `FileHost`) for `Page.css` and `Logic`;
`main` does not run; the page is bundled for the Worker, its logic for the window.
Run: `mount` creates the Worker and sends `open`; `WorkerHost` returns the title,
the stylesheet URLs (none in the single file) and the logic URL; `PageBootstrap`
writes the CSS links, imports the logic, registers `Logic`, creates
`window.gramlot`, starts; `main` runs in the Worker; the window renders and binds;
`remoteSource` runs marked methods in the Worker; `dispose()` ends the Worker.
Logic: `Logic` of the page module, else `<page>_aux.js`; window only; imports
`@gramlot/gramlot/page` from the core of the window ([Configuration](120-configuration.md)).
