# 135 · No server: a tutorial

Document ID: **GS-135**.

[Paired view](../docs_llm/135-serverless-tutorial.md).

This tutorial follows Mario, who runs the registrations of a small club. Mario
wants a registration form that opens without a server: a file he can send by
mail, put on a USB stick or upload to the club's web site. Later he wants a
small site of a few pages. The tutorial uses `npm create gramlot` (package
`create-gramlot`) and the packages `@gramlot/gramlot-serverless` and
`@gramlot/gramlot-js-server` 0.2.4 or later. The commands and their outputs were
run on 2026-10-04; `create/test/create.test.js` runs both projects in CI.

<a id="gs-135-005"></a>

## 005 · What Mario needs

Block ID: **GS-135-005**.

- Node.js 22 or later, with npm, on the computer that builds the pages.
- A browser, on every computer that opens them. The people who fill in the form
  need nothing else: no Node, no server, no account.

Mario writes the pages in JavaScript. Each page is one module with two classes:
`Page` builds the page, `Logic` holds the methods the page calls while it runs.

<a id="gs-135-010"></a>

## 010 · One page: the registration form

Block ID: **GS-135-010**.

```sh
npm create gramlot page iscrizione
cd iscrizione
npm install
```

The command creates the folder `iscrizione` and installs nothing; `npm install`
fetches the core and the two packages. Without the word `page` the command asks
`page or site?`. The folder:

```text
iscrizione/
├── index.js       the page: Page and Logic
├── index.css      its stylesheet
├── serve.mjs      the same page with a server (section 035)
├── package.json   npm run build, npm start, npm run start:bun
├── README.md
└── .gitignore     node_modules/ and the built index.html
```

`index.js` builds a form whose fields write the data under the path `modulo`:

```javascript
const form = root.div({datapath: 'modulo'});
form.html_label('Name', {for: 'name'});
form.input({id: 'name', value: '^.name', live: true});
form.html_label('Email', {for: 'email'});
form.input({id: 'email', type: 'email', value: '^.email', live: true});
form.p('^.summary', {id: 'summary'});
form.dataFormula({result_path: '.summary', func: 'summary', name: '^.name', email: '^.email', _init: true});
```

`value: '^.name'` binds the field to `modulo.name` in both directions. The formula
computes `modulo.summary` with the method `summary` of `Logic` each time the name
or the email changes:

```javascript
export class Logic {
    summary(kwargs) {
        if (!kwargs.name) return 'Type your name.';
        return kwargs.email ? `${kwargs.name} <${kwargs.email}>` : `${kwargs.name}, now your email.`;
    }
}
```

Mario changes the fields, the labels and the texts as he likes. The core guide
[Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html)
describes every element and declaration.

<a id="gs-135-015"></a>

## 015 · Build the file and hand it out

Block ID: **GS-135-015**.

```sh
npm run build
```

```text
Built /…/iscrizione/index.html: 1827710 bytes, sha256 946972b4…
```

`npm run build` runs `gramlot-serverless build index.js -o index.html`. The file
`index.html` holds the page, its stylesheet and the core theme, the Gramlot
runtime and the Web Worker in which the page runs. Mario opens it with a
double-click: the form appears, and the summary follows what he types.

Mario hands the file out as he prefers: an attachment to an email, a copy on a USB
stick, a file on the club's web site. Whoever opens it fills in the form in their
own browser. Each build writes a new file; the old copies keep working.

<a id="gs-135-020"></a>

## 020 · The limits of a page without a server

Block ID: **GS-135-020**.

The file runs entirely in the browser of whoever opens it. That decides what the
page can and cannot do:

- **No Python.** The page is JavaScript. Pages in Python need a Python server
  ([gramlot-py-server](https://github.com/gramlot-org/gramlot-py-server)).
- **The Source methods run in the Worker.** A method marked with `source(...)`
  runs in a Web Worker of the same browser, with the memory and the computing
  power of that browser. It sees no shared data, no database and no file of
  Mario's computer, and it keeps no secret: everything in the file is readable by
  whoever has the file.
- **The data stay in the browser.** What a person types into the form stays in
  the memory of their browser and is lost when they close the page. Nothing
  reaches Mario by itself: the page must send it, with one of the functions of
  section 025.
- **No reception.** The file cannot receive registrations. Mario receives them
  by email, as files, or through a service of his own that accepts an HTTP
  request.

<a id="gs-135-025"></a>

## 025 · How the data reach Mario

Block ID: **GS-135-025**.

`gramlot.inout` holds the functions that send, save and load the data of a page.
Each takes the path of the data, here `modulo`. The form of section 010 has one
button for each:

```javascript
buttons.button('Send by email', {id: 'send', action: "gramlot.inout.sendMail('modulo', 'office@example.org')"});
buttons.button('Save', {id: 'save', action: "gramlot.inout.save('modulo', 'registration.json')"});
buttons.button('Reload a saved file', {id: 'restore', action: "gramlot.inout.restore('modulo')"});
buttons.button('Download JSON', {id: 'download', action: "gramlot.inout.download('modulo', 'registration.json', 'json')"});
```

| Function | What happens |
| --- | --- |
| `sendMail('modulo', 'office@example.org')` | The mail program of the person opens a new email to Mario, with the page title as subject and one line per value (`name: Rossi`). The email leaves when the person presses send. Above 2000 characters, the practical limit of a `mailto:` link, the function reports an error. |
| `sendHttp('modulo', 'https://…')` | Sends the data as JSON with an HTTP `POST` to an address. The single file leaves connections open, so any address works; the address needs a service that accepts the request. |
| `save('modulo', 'registration.json')` | Saves the data to a file of the person, in the internal format of Gramlot. The person sends the file to Mario as an attachment. |
| `restore('modulo')` | Asks for a file written by `save` and loads it into the page, with the exact types: dates and decimals come back as dates and decimals. Mario opens a received file with the same page. |
| `download('modulo', 'registration.json', 'json' or 'xml')` | Exports the data for other programs; types become text. `restore` does not read it back. |

`action` holds inline code; the single file allows it. A longer procedure belongs
in a method of `Logic`, where `this.page.inout` is the same object.

<a id="gs-135-030"></a>

## 030 · A site of several pages

Block ID: **GS-135-030**.

```sh
npm create gramlot site club
cd club
npm install
npm run build
```

```text
Built /…/club/dist: 2 pages (index, registration)
```

Each file at the first level of `pages/` is a page. `pages/index.js` is the first
page, with a menu; `pages/registration.js` is the form of section 010, at the
address `registration/`. `pages/site.css` is the stylesheet of both, declared in
`Page.css` as `/site.css`. Modules shared by several pages go in a subfolder of
`pages/`.

```text
club/
├── pages/
│   ├── index.js          the first page, with the menu
│   ├── registration.js   the form
│   └── site.css
├── serve.mjs
└── package.json          npm run build: gramlot-serverless build pages -o dist
```

`npm run build` writes `dist/`: `dist/index.html`, `dist/registration/index.html`,
the shared runtime under `dist/assets/`, `site.css` and the core theme. The menu
links `registration/index.html` from the first page and `../index.html` back; the
same links work from `dist/` opened on disk, on a static web site and with
`npm start`. A new build replaces `dist/`.

Mario opens `dist/index.html` with a double-click, or uploads the content of
`dist/` to any static web site. To send the site by mail, he sends `dist/` as a
compressed archive; the recipient extracts it and opens `index.html`.

The first page is an ordinary page: Mario writes the menu he wants, as any other
element of the page.

<a id="gs-135-035"></a>

## 035 · The same pages with a server

Block ID: **GS-135-035**.

```sh
npm start            # Node.js
npm run start:bun    # Bun
```

`serve.mjs` serves the same pages with `@gramlot/gramlot-js-server` on
`http://127.0.0.1:8080/`. The pages do not change. What changes is where `main`
and the Source methods run: on the server, which can read files, use a database,
keep secrets and gather the registrations of everybody in one place.
`Logic` still runs in the browser. The server guides start at
[Introduction](005-introduction.md).
