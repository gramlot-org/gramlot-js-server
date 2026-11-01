/** Embed the packaged optional library once; import it only on first use. */
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
const require = createRequire(import.meta.url);

export async function markdownBundlePlugin() {
    const library = await readFile(join(dirname(require.resolve('@gramlot/gramlot/runtime')), 'gramlot-markdown.js'), 'utf8');
    const loader = require.resolve('@gramlot/gramlot').replace(/index\.js$/, 'markdown-loader.js');
    return {name:'standalone-markdown', setup(build) {
        build.onLoad({filter:/markdown-loader\.js$/}, args => {
            if (args.path !== loader) return;
            return {loader:'js', contents:`
let module;
export function loadMarkdown() {
    return module ??= (async () => {
        const url = URL.createObjectURL(new Blob([${JSON.stringify(library)}], {type:'text/javascript'}));
        try {return await import(url);} finally {URL.revokeObjectURL(url);}
    })();
}`};
        });
    }};
}
