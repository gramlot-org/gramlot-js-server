import {Bag, Page as BasePage, UploadTarget} from '@gramlot/gramlot/page';
class Sink extends UploadTarget {
    constructor(fields, context) { super({maxBytes:1000000}); this.fields = fields; this.context = context; this.size = 0; }
    write(chunk) { this.size += chunk.byteLength; }
    finish() { return {state:'completed', result:{size:this.size, fields:this.fields, context:this.context}}; }
    abort() { return {state:'unsaved'}; }
    status() { return {state:'pending'}; }
}
export class Page extends BasePage {
    static css_theme = false;
    main(root) {
        root.dataSetter({destination_path:'uploads', value:new Bag()});
        root.dataSetter({destination_path:'ready', value:false});
        root.dataSetter({destination_path:'context', value:new Bag({recordId:null})});
        root.uploader({id:'uploader', operation:'receive', storepath:'uploads', contextPath:'context', autoUpload:'^ready'});
    }
    receive(metadata) { return new Sink(metadata.fields, metadata.context); }
}
Page.registerUpload('receive');
