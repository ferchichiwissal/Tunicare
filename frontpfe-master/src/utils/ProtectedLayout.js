import React, { useEffect, useCallback } from "react"; // Import useCallback
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';
import { clearUserData } from './auth'; // Import clearUserData


const ProtectedLayout = ({ requiredRole, children  }) => {
    const navigate = useNavigate();
  const token =
    localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
  let isAuthenticated = false;
  let hasRequiredRole = false;

  // --- Logout Function ---
  const performLogout = useCallback(() => {
      clearUserData();
      // Removed t() function call as useTranslation is not used here
      alert("Session expired or invalid. Redirecting to login.");
      navigate("/sign-in");
  }, [navigate]);

  useEffect(() => {
    // Handle logout if token becomes invalid after initial check (less likely but for completeness)
    if (!isAuthenticated) {
      performLogout(); // Call the correct logout function
    }
  }, [isAuthenticated, performLogout]); // Add performLogout to dependencies

  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      console.log("Decoded Token:", decodedToken);

      const expirationTime = decodedToken.exp * 1000; // Convert expiration to milliseconds
      const userRoles = decodedToken.roles; // Assume roles are stored as "roles" in the token (array or single value)

      // Check if the token is valid
      if (expirationTime >= Date.now()) {
        isAuthenticated = true;

        // Check if the user has the required role(s)
        if (requiredRole) {
          if (Array.isArray(requiredRole)) {
            hasRequiredRole = requiredRole.some((role) =>
              Array.isArray(userRoles)
                ? userRoles.includes(role)
                : userRoles === role
            );
          } else {
            hasRequiredRole = Array.isArray(userRoles)
              ? userRoles.includes(requiredRole)
              : userRoles === requiredRole;
          }
        } else {
          hasRequiredRole = true; // No specific role required
        }
      }
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  }

  // Removed unused and incorrectly implemented onLogout function

  // Redirect based on authentication and role
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }
  if (!hasRequiredRole) {
    // Redirect directly if unauthorized
    alert("Unauthorized access"); // Keep the alert for user feedback
    return <Navigate to="/" />; // Use Navigate for direct redirect
  }

  return children; // Render the protected component if all checks pass
};

export default ProtectedLayout;
