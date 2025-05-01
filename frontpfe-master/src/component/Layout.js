import React from 'react';
// Removed incorrect logo import
import './Layout.css'; // We'll create this CSS file next

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <div className="app-logo-container">
        {/* Use the public URL path for the image */}
        <img src="/images/logo.png" alt="App Logo" className="app-logo-icon" />
      </div>
      <div className="app-content">
        {children}
      </div>
    </div>
  );
};

export default Layout;
