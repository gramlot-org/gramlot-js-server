# 135 · No server: a tutorial

Document ID: **GS-135**.

[Paired view](../docs/135-serverless-tutorial.md).

Mario's club registration form without a server, then a small site. Uses
`npm create @gramlot` (`@gramlot/create`) and the packages 0.2.4 or later; run on 2026-10-04,
both projects in CI (`create/test/create.test.js`).

<a id="gs-135-005"></a>

## 005 · What Mario needs

Block ID: **GS-135-005**.

Node.js 22+ with npm to build; a browser to open. Each page: one module, `Page`
(builds) and `Logic` (methods called while it runs).

<a id="gs-135-010"></a>

## 010 · One page: the registration form

Block ID: **GS-135-010**.

`npm create @gramlot page iscrizione && cd iscrizione && npm install` (no word → asks
`page or site?`). Files: `index.js` (Page, Logic), `index.css`, `serve.mjs`,
`package.json`, `README.md`, `.gitignore`. The form writes `modulo.name`,
`modulo.email` (`value: '^.name'`, `live: true`); `dataFormula` computes
`modulo.summary` with `Logic.summary(kwargs)`.

<a id="gs-135-015"></a>

## 015 · Build the file and hand it out

Block ID: **GS-135-015**.

`npm run build` (`gramlot-serverless build index.js -o index.html`) →
`Built /…/iscrizione/index.html: 1827710 bytes, sha256 946972b4…`. One file: page,
stylesheet, theme, runtime, Worker. Double-click to open; send by mail, USB stick or
web site. Old copies keep working.

<a id="gs-135-020"></a>

## 020 · The limits of a page without a server

Block ID: **GS-135-020**.

No Python ([gramlot-py-server](https://github.com/gramlot-org/gramlot-py-server)).
Source methods run in the Worker of the same browser: no shared data, database,
files or secrets; the file is readable by anyone. Typed data stay in the browser
and are lost on close unless sent (025). The file receives nothing: registrations
come by email, files or a service of Mario's.

<a id="gs-135-025"></a>

## 025 · How the data reach Mario

Block ID: **GS-135-025**.

`gramlot.inout`, path `modulo`, called from button `action` (inline, allowed in the
file) or from `Logic` (`this.page.inout`):

- `sendMail('modulo', 'office@example.org')`: the user's mail program, subject the
  page title, one line per value; leaves on send; > 2000 characters → error.
- `sendHttp('modulo', 'https://…')`: JSON `POST`; connections open in the file.
- `save('modulo', 'registration.json')`: internal format; sent as an attachment.
- `restore('modulo')`: reads a `save` file with exact types (dates, decimals).
- `download('modulo', 'registration.json', 'json'|'xml')`: export, types as text.

<a id="gs-135-030"></a>

## 030 · A site of several pages

Block ID: **GS-135-030**.

`npm create @gramlot site club && cd club && npm install && npm run build` →
`Built /…/club/dist: 2 pages (index, registration)`. `pages/index.js` (menu),
`pages/registration.js` (the form, at `registration/`), `pages/site.css` (`Page.css`
`/site.css`); shared modules in subfolders. `dist/`: `index.html`,
`registration/index.html`, `assets/`, `site.css`, theme. Links
`registration/index.html` / `../index.html` work from disk, static site and
`npm start`. A new build replaces `dist/`. Share `dist/` as is or as an archive.

<a id="gs-135-035"></a>

## 035 · The same pages with a server

Block ID: **GS-135-035**.

`npm start` (Node) / `npm run start:bun` (Bun): `serve.mjs` serves the same pages
on `http://127.0.0.1:8080/`; `main` and Source methods run on the server (files,
database, secrets, shared registrations); `Logic` stays in the browser. `serve.mjs` is
for development (page template: the project folder, `node_modules` included;
[Deployment](025-deployment.md)).
[Introduction](005-introduction.md).
