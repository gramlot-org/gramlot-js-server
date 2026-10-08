# @gramlot/create

Creates a new [Gramlot](https://gramlot.readthedocs.io/) project with JavaScript pages.

```sh
npm create @gramlot page my-form    # index.js: one page, built to index.html
npm create @gramlot site my-site    # pages/: a site, built to dist/
npm create @gramlot my-project      # asks: page or site?
```

The folder must be new or empty. The command writes the files and installs nothing;
then:

```sh
cd my-form
npm install
npm run build        # page: index.html, one file; site: dist/, one folder per page
npm start            # development: the same pages on http://127.0.0.1:8080/ with Node
npm run start:bun    # the same with Bun
```

A page is one module that exports `Page`, which builds the page, and `Logic`, the
methods the page calls in the browser. The templates show a form whose data leave
the browser through `gramlot.utl.inout` (email, file, download).

The build uses `@gramlot/gramlot-serverless`, the server uses
`@gramlot/gramlot-js-server`; both live in the repository
[gramlot-js-server](https://github.com/gramlot-org/gramlot-js-server), with the
guides on [Read the Docs](https://gramlot-js-server.readthedocs.io/).
