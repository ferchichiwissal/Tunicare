import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Récupérer la langue sauvegardée dans localStorage
const savedLanguage = localStorage.getItem("preferredLanguage") || "en";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: savedLanguage, // Utiliser la langue sauvegardée
    fallbackLng: "en",
    // preload: ['en', 'fr'], // Remove preload for now
    debug: true, // Re-enable debug logging
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      // load: 'languageOnly', // Revert to default load strategy
    },
    react: {
      useSuspense: true // Explicitly enable Suspense integration
    }
  });

export default i18n;