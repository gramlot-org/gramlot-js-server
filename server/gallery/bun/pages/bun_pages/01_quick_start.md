# Quick start

A field bound to `person.name` and a greeting computed by the method
`greeting` of the page's `Logic`. Typing in the field changes the greeting at
every keystroke.

The page is `pages/index.js`; `serve.mjs` starts the server on it:

```js
import {fileURLToPath} from 'node:url';
import {startServer} from '@gramlot/gramlot-js-server/bun';

const app = await startServer({pages: fileURLToPath(new URL('./pages/', import.meta.url)), port: 8080});
console.log(app.url);
```

```sh
bun serve.mjs
```

`npm create gramlot site my-site` writes a project with `pages/`, `serve.mjs` and the
scripts `npm start` (Node.js) and `npm run start:bun` (Bun).
