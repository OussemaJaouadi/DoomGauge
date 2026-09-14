// React & 3rd-party
import { defineBackground } from 'wxt/utils/define-background';

// Tokens & Meta
import { DEV_DATA } from '../config/dataMode';

// Utilities & Helpers
import { startBackground } from '../runtime/background';

export default defineBackground(() => {
  const stop = startBackground(DEV_DATA);
  if (import.meta.hot) {
    import.meta.hot.dispose(stop);
  }
});
