/** Configured JavaScript page documents for the shared visual editor. */
import {createHash, randomUUID} from 'node:crypto';
import {readFile, realpath, lstat, open, rename, unlink} from 'node:fs/promises';
import {basename, dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {fromTytx} from '@genrojs/tytx';
import {transform} from 'esbuild';
import '@gramlot/gramlot/page';

const MAX_BYTES = 2 * 1024 * 1024;
const locks = new Map();
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function locked(file, operation) {
    const previous = locks.get(file) ?? Promise.resolve();
    const result = previous.catch(() => {}).then(operation);
    locks.set(file, result);
    try { return await result; }
    finally { if (locks.get(file) === result) locks.delete(file); }
}

export class VisualEditorDocuments {
    #files;
    #remoteEdit;
    constructor({files, remoteEdit = false}) {
        if (typeof remoteEdit !== 'boolean') throw new TypeError('remoteEdit must be boolean');
        this.#remoteEdit = remoteEdit;
        this.#files = new Map(Object.entries(files).map(([key, path]) => {
            if (typeof path !== 'string' || !['.js', '.mjs'].includes(extname(path))) {
                throw new TypeError('Expected a JavaScript page file');
            }
            return [key, resolve(path)];
        }));
    }
    async #file(key) {
        if (typeof key !== 'string' || !this.#files.has(key)) throw new Error('Unknown editor document');
        const file = this.#files.get(key);
        if ((await lstat(file)).isSymbolicLink()) throw new Error('Editor document must not be a symbolic link');
        return realpath(file);
    }
    async #read(file) {
        const info = await lstat(file);
        if (!info.isFile() || info.size > MAX_BYTES) throw new Error('Expected a page file of at most 2 MiB');
        const bytes = await readFile(file);
        if (bytes.length > MAX_BYTES) throw new Error('Document is too large');
        const content = new TextDecoder('utf-8', {fatal:true}).decode(bytes);
        if (content.includes('\0')) throw new Error('Expected UTF-8 text');
        return {content, revision:digest(bytes), mode:info.mode};
    }
    #requireEdit() {
        if (!this.#remoteEdit) throw new Error('Remote editing is disabled by the host');
    }
    async document(key) {
        const file = await this.#file(key), snapshot = await this.#read(file);
        return {key, path:file, language:'javascript', content:snapshot.content,
            revision:snapshot.revision, writable:this.#remoteEdit};
    }
    async save({key, content, revision}) {
        this.#requireEdit();
        if (typeof content !== 'string' || content.includes('\0')) throw new TypeError('Expected UTF-8 text');
        const bytes = Buffer.from(content, 'utf8');
        if (bytes.toString('utf8') !== content) throw new TypeError('Expected valid Unicode text');
        if (bytes.length > MAX_BYTES) throw new Error('Document is too large');
        const file = await this.#file(key);
        return locked(file, async () => {
            const current = await this.#read(file);
            const check = actual => {
                if (actual !== revision) throw new Error('File changed on disk. Your draft was retained; reopen the file before saving.');
            };
            check(current.revision);
            // Parsing is independent of execution: imports and top-level code do not run on save.
            await transform(content, {loader:'js', format:'esm', target:'esnext', sourcefile:basename(file), logLevel:'silent'});
            const temporary = join(dirname(file), `.${basename(file)}.${randomUUID()}.tmp`);
            try {
                const handle = await open(temporary, 'wx', current.mode & 0o777);
                try { await handle.writeFile(bytes); await handle.sync(); }
                finally { await handle.close(); }
                if (await this.#file(key) !== file) throw new Error('Editor document path changed');
                check((await this.#read(file)).revision);
                await rename(temporary, file);
            } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
            return {revision:digest(bytes)};
        });
    }
    async preview(root, {key, revision, data_root}) {
        this.#requireEdit();
        const file = await this.#file(key);
        return locked(file, async () => {
            const document = await this.#read(file);
            if (document.revision !== revision) throw new Error('Saved page changed; reopen the document before previewing');
            const wire = await previewProcess({file, revision, dataRoot:data_root});
            const candidate = fromTytx(wire);
            const target = root.div({node_label:'pageRoot', datapath:data_root});
            candidate.bindBuilder(target.builder);
            root.update(candidate);
            if ((await this.#read(file)).revision !== revision) throw new Error('Saved page changed while preparing preview');
        });
    }
}


function previewProcess(request) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [fileURLToPath(new URL('./visual-editor-preview.mjs', import.meta.url))],
            {stdio:['pipe','ignore','pipe','pipe']});
        let output = '', errors = '', failure = null;
        const timer = setTimeout(() => { failure = new Error('Page preview timed out'); child.kill('SIGKILL'); }, 15000);
        child.stdio[3].setEncoding('utf8');
        child.stdio[3].on('data', chunk => {
            output += chunk;
            if (Buffer.byteLength(output) > 16 * 1024 * 1024) {
                failure = new Error('Page preview is too large'); child.kill('SIGKILL');
            }
        });
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', chunk => { errors = (errors + chunk).slice(-65536); });
        child.on('error', error => { failure = error; });
        child.stdin.on('error', error => { failure = error; });
        child.on('close', code => {
            clearTimeout(timer);
            if (failure) reject(failure);
            else if (code !== 0) reject(new Error(errors || 'Page preview process failed'));
            else resolve(output);
        });
        child.stdin.end(JSON.stringify(request));
    });
}
