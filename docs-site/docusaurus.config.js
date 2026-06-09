import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "TSTS API Documentation",
  tagline: "Complete API reference for the Technical Support Ticketing System",
  favicon: "img/favicon.ico",

  // Production URL — docs are served on their own container at port 8080
  url: process.env.DOCS_URL || "http://localhost:8080",
  baseUrl: "/",

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: "../docs",
          routeBasePath: "/",
          sidebarPath: path.resolve(__dirname, "sidebars.js"),
          breadcrumbs: true,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: path.resolve(__dirname, "src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "TSTS API Docs",
        logo: {
          alt: "TSTS Logo",
          src: "img/logo.svg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "docs",
            position: "left",
            label: "Documentation",
          },
          {
            href: "/",
            label: "Back to App",
            position: "right",
          },
          {
            href: "https://openrouter.ai",
            label: "Get Free AI Key",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Documentation",
            items: [
              { label: "Getting Started", to: "/api-integrations" },
              { label: "Authentication", to: "/authentication/auth-v1" },
              { label: "Tickets API", to: "/tickets/tickets" },
            ],
          },
          {
            title: "AI Assistant",
            items: [
              { label: "AI Assistant API", to: "/management/ai-assistant" },
              { label: "OpenRouter (Free AI)", href: "https://openrouter.ai" },
              { label: "Ollama (Local AI)", href: "https://ollama.com" },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} TSTS. Built with Docusaurus.`,
      },
      prism: {
        theme: { plain: { color: "#393A34", backgroundColor: "#f6f8fa" }, styles: [] },
        additionalLanguages: ["bash", "json", "typescript", "python"],
      },
      colorMode: {
        defaultMode: "light",
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
    }),
};

export default config;
