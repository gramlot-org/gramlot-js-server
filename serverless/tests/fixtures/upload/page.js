import {Page as BasePage, UploadTarget} from '@gramlot/gramlot/page';

class Sink extends UploadTarget {
    constructor(fields) { super({maxBytes:1000000}); this.fields = fields; this.size = 0; }
    write(chunk) { this.size += chunk.byteLength; }
    finish() { return {state:'completed', result:{size:this.size, fields:this.fields}}; }
    abort() { return {state:'unsaved'}; }
    status() { return {state:'pending'}; }
}
export class Page extends BasePage {
    main(root) { root.div('Upload test'); }
    receive(metadata) { return new Sink(metadata.fields); }
}
Page.registerUpload('receive');
