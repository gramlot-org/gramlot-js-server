# @gramlot/gramlot-serverless

No server: pages open from one HTML file or a static directory; the page logic
runs in a Web Worker of the browser.

The package exports JavaScript [Gramlot](https://github.com/gramlot-org/gramlot)
pages to that form.

```sh
npm install @gramlot/gramlot @gramlot/gramlot-serverless
npx gramlot-serverless build pages/index.js -o build/index.html
```

Quick start, guides and compatibility: the
[repository README](https://github.com/gramlot-org/gramlot-js-server#readme) and the
[documentation](https://gramlot-js-server.readthedocs.io/en/latest/105-introduction.html).
Licensed under the Apache License, Version 2.0.
