import { defineContentScript } from 'wxt/utils/define-content-script';
import { startCollector } from '../tracking/content';
export default defineContentScript({matches:['*://www.youtube.com/*'],runAt:'document_idle',main(ctx){const stop=startCollector('youtube');ctx.onInvalidated(stop);}});
