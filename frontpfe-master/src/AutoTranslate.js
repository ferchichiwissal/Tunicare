// src/AutoTranslate.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "./LanguageContext"; // Importer le contexte de la langue

const AutoTranslate = ({ text }) => {
  const { language } = useLanguage(); // Récupérer la langue actuelle
  const [translatedText, setTranslatedText] = useState(text);

  useEffect(() => {
    // Appel à l'API LibreTranslate pour traduire le texte
    axios
      .post("https://libretranslate.de/translate", {
        q: text, // Texte à traduire
        source: "en", // Langue source (ici, anglais)
        target: language, // Langue cible
        format: "text", // Format de la traduction
      })
      .then((res) => {
        setTranslatedText(res.data.translatedText); // Mettre à jour le texte traduit
      })
      .catch((err) => {
        console.error("Erreur lors de la traduction:", err);
      });
  }, [text, language]); // Refaites la traduction à chaque changement de texte ou de langue

  return <span>{translatedText}</span>;
};

export default AutoTranslate;
