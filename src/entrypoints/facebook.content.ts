import { defineContentScript } from 'wxt/utils/define-content-script';
import { startCollector } from '../tracking/content';
export default defineContentScript({matches:['*://www.facebook.com/*'],runAt:'document_idle',main(ctx){const stop=startCollector('facebook');ctx.onInvalidated(stop);}});
