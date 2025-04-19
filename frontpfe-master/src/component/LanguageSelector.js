import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    // Save the preference to localStorage
    localStorage.setItem("preferredLanguage", lng);
  };

  return (
    <select
      onChange={(e) => changeLanguage(e.target.value)}
      value={i18n.language}
      className="form-select form-select-sm" // Added Bootstrap classes for styling
      style={{ padding: "5px", borderRadius: "5px", width: 'auto' }} // Basic styling, adjust as needed
      aria-label="Select language"
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
      {/* Add other languages as needed */}
      {/* <option value="ar">العربية</option> */}
    </select>
  );
};

export default LanguageSelector;