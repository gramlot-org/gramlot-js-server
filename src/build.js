import {build as bundle} from 'esbuild';
import {runtimeNotices} from './runtime-notices.js';
import {HtmlBuilder} from '@jsr/genro__builders';
import {readFile, writeFile, mkdir, rename, rm} from 'node:fs/promises';
import {dirname, resolve, extname, basename, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash, randomUUID} from 'node:crypto';

const require = createRequire(import.meta.url);
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const options = {bundle: true, platform: 'browser', format: 'iife', write: false, legalComments: 'inline'};

/** Bundle one JS Page without executing it. Runtime behavior belongs to Gramlot. */
export async function build({page, output}) {
    const input = resolve(page);
    const destination = resolve(output);
    if (!['.js', '.mjs'].includes(extname(input))) throw new TypeError('Standalone pages must be JavaScript (.js or .mjs)');
    if (!['.html', '.htm'].includes(extname(destination))) throw new TypeError('Output must be an HTML file');
    const worker = (await bundle({...options, stdin: {
        resolveDir: packageRoot,
        contents: `import {WorkerHost} from './src/worker-host.js';
import {Page} from ${JSON.stringify(input)};
new WorkerHost(Page);`,
    }})).outputFiles[0].text;
    const runtime = (await bundle({...options, stdin: {
        resolveDir: packageRoot,
        contents: `import {mount} from './src/standalone.js';
const url = URL.createObjectURL(new Blob([${JSON.stringify(worker)}], {type:'text/javascript'}));
mount({workerUrl:url}).then(app => { globalThis.gramlot=app; })
    .catch(error => { console.error(error); })
    .finally(() => URL.revokeObjectURL(url));`,
    }})).outputFiles[0].text;
    const notices = await runtimeNotices(require.resolve('@jsr/genro__gramlot/runtime'));
    const document = new HtmlBuilder();
    const html = document.root.html({lang: 'en'});
    const head = html.head();
    head.meta({charset: 'utf-8'});
    head.meta({name: 'viewport', content: 'width=device-width,initial-scale=1'});
    head.meta({http_equiv: 'Content-Security-Policy', content: "default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'"});
    head.title(basename(input, extname(input)));
    const body = html.body();
    body.div({id: 'gramlot-root'});
    // Preserve attribution as inert metadata, without adding application UI.
    head.script(JSON.stringify(notices).replaceAll('<', '\\u003c'),
        {type: 'application/json', id: 'gramlot-runtime-notices'});
    // Prevent the HTML parser from ending the script inside bundled string data.
    body.script(runtime.replace(/<\/script/gi, '<\\/script'));
    const artifact = '<!doctype html>' + document.render();
    await mkdir(dirname(destination), {recursive: true});
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporary, artifact, {flag: 'wx'});
        await rename(temporary, destination);
    } finally { await rm(temporary, {force: true}); }
    return {output: destination, bytes: Buffer.byteLength(artifact), sha256: createHash('sha256').update(artifact).digest('hex')};
}
