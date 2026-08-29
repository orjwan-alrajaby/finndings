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
        /*
         * The panel's stylesheet is fetched by the content script and put
         * inside a shadow root, so it has to be reachable as a resource.
         */
        resources: ["network-interceptor.js", "content-scripts/content.css"],
        matches: ["https://www.finn.com/*"]
      }
    ]
  })
});
