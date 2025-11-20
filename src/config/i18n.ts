import i18next from "i18next";
import Backend from "i18next-fs-backend";
import { LanguageDetector } from "i18next-http-middleware";
import path from "path";
import { fileURLToPath } from "url";

// Create ESM dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

i18next
  .use(Backend)
  .use(LanguageDetector)
  .init({
    fallbackLng: "en",
    preload: ["en", "ar"],
    backend: {
      loadPath: path.join(
        __dirname,
        "..",
        "locales",
        "{{lng}}",
        "translation.json"
      ),
    },
    detection: {
      order: ["header", "querystring", "cookie"],
      caches: ["cookie"],
    },
    debug: false,
    compatibilityJSON: "v4",
  });

export default i18next;
