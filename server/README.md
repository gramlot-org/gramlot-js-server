# @gramlot/gramlot-js-server

Node.js and Bun host adapter for JavaScript [Gramlot](https://github.com/gramlot-org/gramlot)
pages. It connects a folder of Page modules to the core's `FileHost` and serves
the bootstrap document, the Source requests, the page modules and stylesheets,
the core themes and the files you list, under a mount prefix of your choice.

```sh
npm install @gramlot/gramlot @gramlot/gramlot-js-server
```

```js
import {startServer} from '@gramlot/gramlot-js-server/node';   // Bun: '@gramlot/gramlot-js-server/bun'

const app = await startServer({pages: '/path/to/pages', port: 8080});
```

The command `gramlot` serves the gallery of `@gramlot/gramlot-examples`
(an optional peer dependency):

```sh
npm install @gramlot/gramlot-examples
npx gramlot node gallery      # or: npx gramlot bun gallery
```

A new project: `npm create @gramlot site my-site`. Quick start, guides and
compatibility: the [repository README](https://github.com/gramlot-org/gramlot-js-server#readme)
and the [documentation](https://gramlot-js-server.readthedocs.io/en/latest/).
Licensed under the Apache License, Version 2.0.
