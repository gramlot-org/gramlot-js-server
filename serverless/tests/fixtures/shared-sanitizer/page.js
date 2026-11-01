/** Prepared collections, lazy editor engine and component-local HTML policies under file://. */
import {Bag} from '@gramlot/gramlot';
import {Page as BasePage} from '@gramlot/gramlot/page';
import {collections} from '@gramlot/gramlot-examples/gallery/collections.js';

export class Page extends BasePage {
    static title = 'Shared sanitizer';
    static gramlots = collections.filter(({name}) => ['inputs', 'layout', 'editors', 'grid'].includes(name));
    main(root) {
        root.dataSetter({value:'<b>Safe drawer</b><img src="data:," onerror="window.attack=1">', destination_path:'caption'});
        root.dataSetter({value:'<p><strong>Safe markdown</strong></p><script>window.attack=1</script>', destination_path:'markdown'});
        root.dataSetter({value:'<p>Safe editor</p><script>window.attack=1</script>', destination_path:'html'});
        const border = root.borderContainer({id:'border', height:'180px'});
        border.contentPane({region:'center'}).p('Offline sanitization');
        border.contentPane({region:'right', drawer:true, drawer_label:'^caption', width:'120px'}).p('Drawer content');
        root.markdownPreview({id:'markdown', value:'^markdown', allowHtml:true, height:'150px'});
        root.markdownEditor({id:'richMarkdown', value:'^markdown', height:'200px'});
        root.dataSetter({destination_path:'rows', value:new Bag({r1:new Bag({name:'Before'})})});
        const grid = root.grid({id:'editable-grid', storepath:'rows', rowMode:'values', height:'180px'});
        grid.struct().column({field:'name', width:'200px', edit:{validate_notnull:true}});
        root.htmlEditor({id:'html', value:'^html', height:'260px'});
    }
}
