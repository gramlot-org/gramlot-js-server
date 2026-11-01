/** Execute the saved page once with the shared Source builder in a fresh runtime. */
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {GramlotServer, Page} from '@gramlot/gramlot/server';
try {
    const {file, revision, dataRoot} = JSON.parse(readFileSync(0, 'utf8'));
    const current = createHash('sha256').update(readFileSync(file)).digest('hex');
    if (current !== revision) throw new Error('Saved page changed before preview');
    const module = await import(pathToFileURL(file).href);
    if (typeof module.Page !== 'function' || !(module.Page.prototype instanceof Page)) {
        throw new TypeError('The saved module must export a Gramlot Page class');
    }
    const server = new GramlotServer();
    const builder = new module.Page.sourceBuilder('editor_document_preview');
    server.loadCollections(builder, server.pageCollections(module.Page));
    await new module.Page().main(builder.root.div({node_label:'pageRoot', datapath:dataRoot}));
    writeFileSync(3, builder.toTytx());
} catch (error) {
    process.stderr.write(error.message);
    process.exitCode = 1;
}
