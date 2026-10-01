import {build as bundle} from 'esbuild';
import {runtimeNotices} from './runtime-notices.js';
import {checkPage, companion, companionBundle, workerBundle} from './bundles.js';
import {HtmlBuilder} from '@genrojs/builders';
import {writeFile, mkdir, rename, rm} from 'node:fs/promises';
import {dirname, resolve, extname, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash, randomUUID} from 'node:crypto';

const require = createRequire(import.meta.url);
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const options = {bundle: true, platform: 'browser', format: 'iife', write: false, legalComments: 'inline'};
const sha256 = text => createHash('sha256').update(text);

/** Strict profile: the runtime script is allowed by the hash of its final bytes, no
 * 'unsafe-inline' and no 'unsafe-eval'; only named logic runs. */
function policy(script) {
    return `default-src 'none'; script-src 'sha256-${sha256(script).digest('base64')}' blob:; worker-src blob:; ` +
        "style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'";
}

/** Bundle one JS Page without executing it. Runtime behavior belongs to Gramlot. */
export async function build({page, output}) {
    const input = resolve(page);
    const destination = resolve(output);
    if (!['.js', '.mjs'].includes(extname(input))) throw new TypeError('Standalone pages must be JavaScript (.js or .mjs)');
    if (!['.html', '.htm'].includes(extname(destination))) throw new TypeError('Output must be an HTML file');
    checkPage(input);
    const aux = await companion(input);
    const worker = (await workerBundle(input, aux, options)).text;
    const modules = aux ? {[aux.url]: await companionBundle(aux, options)} : {};
    const runtime = (await bundle({...options, stdin: {
        resolveDir: packageRoot,
        contents: `import {mount} from './src/standalone.js';
const blob = text => URL.createObjectURL(new Blob([text], {type:'text/javascript'}));
const workerUrl = blob(${JSON.stringify(worker)});
const modules = Object.fromEntries(Object.entries(${JSON.stringify(modules)}).map(([url, text]) => [url, blob(text)]));
mount({workerUrl, modules}).then(app => { globalThis.gramlot=app; })
    .catch(error => { console.error(error); })
    .finally(() => { for (const url of [workerUrl, ...Object.values(modules)]) URL.revokeObjectURL(url); });`,
    }})).outputFiles[0].text;
    // Prevent the HTML parser from ending the script inside bundled string data.
    const script = runtime.replace(/<\/script/gi, '<\\/script');
    const notices = await runtimeNotices(require.resolve('@gramlot/gramlot/runtime'));
    const document = new HtmlBuilder();
    const html = document.root.html({lang: 'en'});
    const head = html.head();
    head.meta({charset: 'utf-8'});
    head.meta({name: 'viewport', content: 'width=device-width,initial-scale=1'});
    head.meta({'http-equiv': 'Content-Security-Policy', content: policy(script)});
    head.title(basename(input, extname(input)));
    const body = html.body();
    body.div({id: 'gramlot-root'});
    // Preserve attribution as inert metadata, without adding application UI.
    head.script(JSON.stringify(notices).replaceAll('<', '\\u003c'),
        {type: 'application/json', id: 'gramlot-runtime-notices'});
    body.script(script);
    const artifact = '<!doctype html>' + document.render();
    if (!artifact.includes(`<script>${script}</script>`)) {
        throw new Error('HtmlBuilder changed the runtime script: its CSP hash would not match');
    }
    await mkdir(dirname(destination), {recursive: true});
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporary, artifact, {flag: 'wx'});
        await rename(temporary, destination);
    } finally { await rm(temporary, {force: true}); }
    return {output: destination, bytes: Buffer.byteLength(artifact), sha256: sha256(artifact).digest('hex')};
}
