# @gramlot/gramlot-js-server

Node.js and Bun host adapter for JavaScript [Gramlot](https://github.com/gramlot-org/gramlot)
pages. It connects a folder of Page modules to the core's `FileHost` and serves
the bootstrap document, the Source requests and the page companions.

```sh
npm install @gramlot/gramlot @gramlot/gramlot-js-server
```

```js
import {startNativeServer} from '@gramlot/gramlot-js-server/native';   // Bun: '@gramlot/gramlot-js-server/bun'

const app = await startNativeServer({pages: '/path/to/pages', port: 8080});
```

Quick start, guides and compatibility: the
[repository README](https://github.com/gramlot-org/gramlot-js-server#readme) and the
[documentation](https://gramlot-js-server.readthedocs.io/en/latest/).
Licensed under the Apache License, Version 2.0.
