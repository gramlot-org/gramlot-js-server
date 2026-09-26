// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import {execFileSync} from "node:child_process";
import {dirname,join,resolve,extname} from "node:path";
import {fileURLToPath} from "node:url";
import {generateNotices} from "./generate_notices.mjs";
const here=resolve(dirname(fileURLToPath(import.meta.url)));
const [pocArg,outputArg]=process.argv.slice(2);
if(!pocArg||!outputArg)throw Error("usage: node build_runtime.mjs POC_ROOT OUTPUT_JS");
const poc=resolve(pocArg),dom=join(poc,"js/dom"),pages=join(poc,"js/pages"),modules=join(dom,"node_modules"),outputTarget=resolve(outputArg),output=extname(outputTarget)===".js"?outputTarget:join(outputTarget,"runtime.js");
const require=createRequire(join(dom,"package.json"));const {build,version}=require("esbuild");
const esbuildRoot=dirname(dirname(require.resolve("esbuild")));
const aliases=new Map([
 ["gramlot-builder",join(pages,"src/builder.js")],
 ["genro-bag-js",join(modules,"genro-bag-js/src/index.js")],
 ["#uuid",join(modules,"genro-bag-js/src/browser-uuid.js")],
 ["genro-tytx",join(modules,"genro-tytx/js/src/index.js")],
 ["genro-tytx/msgpack.js",join(modules,"genro-tytx/js/src/msgpack.js")],
 ["decimal.js",join(modules,"decimal.js/decimal.mjs")],
 ["@msgpack/msgpack",join(modules,"@msgpack/msgpack/dist.esm/index.mjs")],
 ["@xmldom/xmldom",join(poc,"js/pages/src/xmldom.js")],
 ["module",join(poc,"src/gramlot/contrib/_shared/frontend/module.js")],
]);
const patched=new Map([
 [join(dom,"src/collections/frame-channel.js"),join(here,"frame-channel.js")],
 [join(pages,"src/codemirror-component.js"),join(here,"codemirror-component.js")],
 [join(pages,"src/inspector-component.js"),join(here,"inspector-component.js")],
]);
const result=await build({entryPoints:[join(here,"entry.js")],bundle:true,write:false,platform:"browser",format:"iife",target:"es2022",minify:true,legalComments:"inline",supported:{"inline-script":true},metafile:true,nodePaths:[modules],plugins:[{name:"showcase-owned-patches",setup(api){
 api.onResolve({filter:/.*/},args=>{
  let candidate=null;
  if(args.path==="gramlot-dom")candidate=join(dom,"src/index.js");
  else if(args.path.startsWith("gramlot-dom/"))candidate=join(dom,"src",args.path.slice("gramlot-dom/".length)+".js");
  else if(args.path.startsWith("poc-pages/"))candidate=join(pages,"src",args.path.slice("poc-pages/".length)+".js");
  else if(args.path.startsWith("/_assets/dom/"))candidate=join(dom,"src",args.path.slice("/_assets/dom/".length));
  else if(args.path.startsWith("/_assets/pages/"))candidate=join(pages,"src",args.path.slice("/_assets/pages/".length));
  else if(aliases.has(args.path))candidate=aliases.get(args.path);
  else if(args.path.startsWith("."))candidate=resolve(args.resolveDir,args.path);
  if(candidate&&patched.has(candidate))return {path:patched.get(candidate)};
  if(candidate)return {path:candidate};
  return null;
 });
}}]});
const external=Object.values(result.metafile.outputs).flatMap(x=>x.imports).filter(x=>x.external);
if(external.length)throw Error(`external imports remain: ${JSON.stringify(external)}`);
const js=result.outputFiles.find(file=>extname(file.path)===".js")||result.outputFiles[0];
const others=result.outputFiles.filter(file=>file!==js);
if(others.length)throw Error(`unexpected non-JS outputs: ${others.map(x=>x.path).join(",")}`);
const runtime=js.text;if(/<\/script/i.test(runtime))throw Error("runtime is not inline-script safe");
await mkdir(dirname(output),{recursive:true});await writeFile(output,runtime);
const inputs={};
for(const name of Object.keys(result.metafile.inputs).sort()){
 const path=resolve(name),hash=createHash("sha256").update(await readFile(path)).digest("hex");
 const key=path.startsWith(poc+"/")?`poc/${path.slice(poc.length+1)}`:path.startsWith(here+"/")?`export/${path.slice(here.length+1)}`:path;
 inputs[key]=hash;
}
const revision=execFileSync("git",["-C",poc,"rev-parse","HEAD"],{encoding:"utf8"}).trim();
const dirty=execFileSync("git",["-C",poc,"status","--porcelain"],{encoding:"utf8"}).trim();
const originPaths=[
 "js/dom/src/collections/frame-channel.js",
 "js/pages/src/codemirror-component.js",
 "js/pages/src/inspector-component.js",
 "js/pages/src/inspector.js",
 "js/pages/src/inspector-editor.js",
 "src/gramlot/resources/pages/inspector-embedded.tytx",
 "js/pages/src/inspector.css",
 "js/pages/src/inspector-theme.css",
];
const patchOrigins={};for(const rel of originPaths)patchOrigins[rel]=createHash("sha256").update(await readFile(join(poc,rel))).digest("hex");
const provenance={schemaVersion:1,sourceRevision:`gramlot-poc@${revision}${dirty?"+working-tree":""}`,buildTool:{name:"esbuild",version},runtimeSha256:createHash("sha256").update(runtime).digest("hex"),bytes:Buffer.byteLength(runtime),externalImports:external,patchOrigins,inputs};
await writeFile(join(dirname(output),"provenance.json"),JSON.stringify(provenance,null,2)+"\n");
const notices=await generateNotices({metafile:result.metafile,pocRoot:poc,outputDirectory:dirname(output),runtimeSha256:provenance.runtimeSha256,esbuildVersion:version,esbuildRoot});
console.log(JSON.stringify({bytes:provenance.bytes,sha256:provenance.runtimeSha256,inputs:Object.keys(inputs).length,...notices}));
