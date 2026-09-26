// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {Application} from "gramlot-dom";
import {GramlotBuilder} from "gramlot-builder";
import {fromTytx} from "genro-tytx";
import {Bag} from "genro-bag-js";

const RPC_MESSAGE="RPC unavailable in offline export; use FastAPI";

function decodeSource(wire) {
    const typed=fromTytx(wire,"json");
    if(!typed || typeof typed.getNodes!=="function") throw Error("Embedded showcase Source must decode to a Bag");
    const root=new Bag();
    for(const node of typed.getNodes()) {
        root.setItem(node.label,node.getValue(true),{...node.getAttr()},">",false,true,null,false,false,null,node.nodeTag);
    }
    return root;
}

class OfflineRpcService {
    constructor(application) { this.application=application; this.requests=new Map(); }
    prepareProvider() {}
    cancel() {}
    dispose() { this.requests.clear(); }
    call() { return Promise.reject(new Error(RPC_MESSAGE)); }
    invokeProvider(node,params={}) {
        const [,attr]=this.application.builder.runtimeValues(node);
        const kwargs={...params};
        if(attr._onCalling) this.application._recipeRuntime.evaluate(node,attr._onCalling,{kwargs,...kwargs});
        const error=new Error(RPC_MESSAGE);
        const promise=Promise.resolve().then(()=>{
            if(attr._onError) this.application._recipeRuntime.run(node,attr._onError,{error,kwargs});
            return {status:"error",error};
        });
        node._rpcPromise=promise;
        return promise;
    }
    invokeSourceProvider(node) {
        const error=new Error(RPC_MESSAGE);
        const promise=Promise.resolve({status:"error",error});
        node._rpcPromise=promise;
        return promise;
    }
}

async function mount(sourceTytx,{host=document.getElementById("app"),name="page",inspector=true}={}) {
    if(!host) throw Error("Gramlot showcase mount host is missing");
    const builder=new GramlotBuilder(name);
    builder.loadSource(decodeSource(sourceTytx));
    const application=new Application(host,null,{inspector});
    application.server.dispose();
    application.server=new OfflineRpcService(application);
    application.mountBuilder(builder);
    const onHide=event=>{if(!event.persisted)application.dispose();};
    host.ownerDocument.defaultView.addEventListener("pagehide",onHide,{once:true});
    globalThis.__gramlotShowcaseApplication=application;
    return application;
}

async function autoMount() {
    const payload=document.getElementById("gramlot-page");
    const host=document.getElementById("app");
    if(!payload||!host)return null;
    try {
        const page=JSON.parse(payload.textContent);
        const app=await mount(page.source,{host,name:page.name||"page",inspector:page.inspector});
        document.documentElement.dataset.gramlotReady="true";
        return app;
    } catch(error) {
        document.documentElement.dataset.gramlotReady="false";
        const target=document.getElementById("error")||host;
        target.hidden=false; target.textContent=error.message; target.setAttribute("role","alert");
        throw error;
    }
}

globalThis.GramlotShowcase=Object.freeze({mount,autoMount,RPC_MESSAGE});
void autoMount();
