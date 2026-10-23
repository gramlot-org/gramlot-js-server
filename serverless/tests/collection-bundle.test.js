import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildGallery} from '@gramlot/gramlot-examples';
import * as core from '@gramlot/gramlot';
import {collectionBundle} from '../src/collection-bundle.js';

test('derived collection retains original identity and the shared runtime',async()=>{
    const gallery=buildGallery(), collection=gallery.collections.find(c=>c.name==='inputs');
    const code=await collectionBundle(collection,gallery.assets[collection.module].file);
    const previous=globalThis.GramlotStandalone;
    globalThis.GramlotStandalone=core;
    try {
        const module=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
        assert.equal(module.buildId,collection.buildId);
        assert.ok(module.default instanceof core.ComponentCollection);
        assert.doesNotMatch(code,/class ComponentCollection/);
    } finally {globalThis.GramlotStandalone=previous;}
});

test('artifact tampering stops derived bundling',async t=>{
    const gallery=buildGallery(), collection=gallery.collections.find(c=>c.name==='inputs');
    const root=await mkdtemp(join(tmpdir(),'gramlot-export-integrity-'));
    t.after(()=>rm(root,{recursive:true,force:true}));
    await cp(dirname(dirname(gallery.assets[collection.module].file)),root,{recursive:true});
    const file=join(root,'assets/collection.js');
    await writeFile(file,(await readFile(file,'utf8'))+'\n// changed');
    await assert.rejects(collectionBundle(collection,join(root,'assets/index.js')),/fingerprint mismatch/);
});
