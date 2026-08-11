import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: () => ({
    host_permissions: ["https://www.finn.com/*"],
    permissions: [
      "tabs",
      "activeTab",
      "storage",
    ],
    web_accessible_resources: [
      {
        resources: ["network-interceptor.js"],
        matches: ["https://www.finn.com/*"]
      }
    ]
  })
});
