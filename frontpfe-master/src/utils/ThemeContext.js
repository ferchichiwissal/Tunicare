import React, { createContext, useState, useEffect, useMemo } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or default to 'light'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme : 'light';
  });

  // Update localStorage and manage body class when theme changes
  useEffect(() => {
    const currentThemeClass = `${theme}-mode`;
    const otherThemeClass = theme === 'light' ? 'dark-mode' : 'light-mode';

    // Update localStorage
    localStorage.setItem('theme', theme);

    // Update body class
    document.body.classList.remove(otherThemeClass); // Remove the other theme class if present
    document.body.classList.add(currentThemeClass); // Add the current theme class
  }, [theme]);

  // Function to toggle theme
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;