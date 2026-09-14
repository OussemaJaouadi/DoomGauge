// React & 3rd-party
import { defineContentScript } from 'wxt/utils/define-content-script';

// Tokens & Meta
import { DEV_DATA } from '../config/dataMode';

// Utilities & Helpers
import { startCollector } from '../tracking/content';

export default defineContentScript({
  matches: ['*://www.facebook.com/*'],
  runAt: 'document_idle',
  main(context) {
    if (DEV_DATA) {
      return;
    }
    const stop = startCollector('facebook');
    context.onInvalidated(stop);
  },
});
