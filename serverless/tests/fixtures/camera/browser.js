import {Page as BasePage} from '@gramlot/gramlot/page';
import {BrowserCameraProvider} from '@gramlot/gramlot';
export class Page extends BasePage {
    static css_theme = false;
    main(root) {
        root.dataController({func:'attachCamera',_onStart:true});
        root.button('Take photo',{id:'take-photo',fire:'gramlot.device.camera?capture'});
    }
}
export class Logic {
    attachCamera() { this.page.dvc.attach(new BrowserCameraProvider({document:this.page.src.renderer.destination.ownerDocument})); }
}
