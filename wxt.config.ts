import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: {
    name: "DoomGauge",
    permissions: ["alarms", "tabs"],
    host_permissions: [
      "*://www.youtube.com/*",
      "*://www.instagram.com/*",
      "*://www.facebook.com/*"
    ],
    icons: {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  }
});
