/** Simulate successful stylesheet fetching in jsdom; failure gates are tested by core. */
export function loadStyles(document) {
    const append=document.head.append.bind(document.head);
    document.head.append=(...nodes)=>{
        append(...nodes);
        for(const node of nodes)if(node.tagName==='LINK')queueMicrotask(()=>node.dispatchEvent(new document.defaultView.Event('load')));
    };
    return document;
}
