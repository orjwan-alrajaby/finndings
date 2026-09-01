import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: () => ({
    /*
     * Set here rather than left to package.json, which would install this as
     * "finn-lens" — the npm package name, not the product's.
     */
    name: "FINN Lens",
    description:
      "Choose between FINN car subscriptions. Pin the cars you're weighing up and Lens ranks them against the things you said matter, with the reasoning and the compromises spelled out.",

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
