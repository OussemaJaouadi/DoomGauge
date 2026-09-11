import { DEV_DATA } from '../config/dataMode';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { startCollector } from '../tracking/content';
export default defineContentScript({
  matches: ['*://www.instagram.com/*'],
  runAt: 'document_idle',
  main(context) {
    if (DEV_DATA) return;
    const stop = startCollector('instagram');
    context.onInvalidated(stop);
  },
});
