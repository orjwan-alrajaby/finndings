import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  /*
   * react-to-pdf takes its screenshot with html2canvas, which was last
   * released before CSS Color 4 and cannot parse `color-mix(in oklab, …)`.
   * Tailwind v4 compiles every opacity utility — `bg-white/45`, `ring-white/60`
   * — to exactly that, so the PDF export threw on the first colour it met
   * rather than producing a file.
   *
   * html2canvas-pro is the maintained fork of the same library, same API,
   * with the modern colour functions understood. Aliased rather than adopted
   * outright because react-to-pdf asks for `html2canvas` by name: this hands
   * it the fork without forking react-to-pdf itself.
   */
  vite: () => ({
    resolve: {
      alias: {
        html2canvas: 'html2canvas-pro',
      },
    },
  }),
  manifest: () => ({
    /*
     * Set here rather than left to package.json, which would install this as
     * "finn-lens" — the npm package name, not the product's.
     */
    name: "Finn Lens",
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
         *
         * The fonts come with it. That stylesheet's `@font-face` rules point
         * at `/fonts/…`, and a font pulled in by an extension stylesheet that
         * is applying to finn.com is being loaded into that page — so without
         * this the request is blocked there and the panel alone falls back to
         * system sans while every extension page renders in Inter.
         */
        resources: [
          "network-interceptor.js",
          "content-scripts/content.css",
          "fonts/*",
        ],
        matches: ["https://www.finn.com/*"]
      }
    ]
  })
});
