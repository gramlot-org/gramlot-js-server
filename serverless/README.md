# @gramlot/gramlot-serverless

No server: JavaScript [Gramlot](https://github.com/gramlot-org/gramlot) pages open
from one HTML file or a static directory. The page runs in a Web Worker of the
browser; the window renders it and runs its `Logic`.

```sh
npm install @gramlot/gramlot @gramlot/gramlot-serverless
npx gramlot-serverless build index.js -o index.html    # one page, one file
npx gramlot-serverless build pages -o dist             # a folder of pages, a directory
```

`npx gramlot-serverless gallery gallery` writes the gallery of
`@gramlot/gramlot-examples` (an optional peer dependency) as a directory. A new
project: `npm create gramlot page my-form`.

Quick start, guides and compatibility: the
[repository README](https://github.com/gramlot-org/gramlot-js-server#readme) and the
[documentation](https://gramlot-js-server.readthedocs.io/en/latest/105-introduction.html).
Licensed under the Apache License, Version 2.0.
