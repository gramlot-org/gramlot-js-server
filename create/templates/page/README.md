# {{name}}

One Gramlot page: `index.js` exports `Page`, which builds the page, and `Logic`,
the methods the page calls in the browser. `index.css` is its stylesheet.

```sh
npm install
npm run build        # index.html: one file that opens without a server
npm start            # the same page on http://127.0.0.1:8080/ (Node)
npm run start:bun    # the same with Bun
```

`index.html` can travel by mail, on a USB stick or on any web site. The data typed
in it stay in the browser of whoever fills it in; the buttons send them by email,
save them to a file or download them (`gramlot.inout`).
