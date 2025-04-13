// LanguageContext.js
import React, { createContext, useState, useContext } from 'react';

// Crée le contexte
const LanguageContext = createContext();

// Crée un hook personnalisé pour utiliser le contexte
export const useLanguage = () => useContext(LanguageContext);

// Crée le fournisseur de contexte
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en'); // Langue par défaut en anglais

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
