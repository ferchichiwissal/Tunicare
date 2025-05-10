import React, { useEffect, useCallback } from "react"; // Import useCallback
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { clearUserData } from './auth'; // Import clearUserData


const ProtectedLayout = ({ requiredRole, children  }) => {
    const { t } = useTranslation(); // Initialize t function
    const navigate = useNavigate();
  const token =
    localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
  let isAuthenticated = false;
  let hasRequiredRole = false;
  let userRoles = null; // Déclarer userRoles ici pour une portée plus large

  // --- Logout Function ---
  const performLogout = useCallback(() => {
      clearUserData();
      alert(t('protectedLayout.sessionExpired')); // Use translation key
      navigate("/sign-in");
  }, [navigate, t]); // Add t to dependencies

// useEffect(() => {
//   // Handle logout if token becomes invalid after initial check (less likely but for completeness)
//   if (!isAuthenticated) {
//     performLogout(); // Call the correct logout function
//   }
// }, [isAuthenticated, performLogout]); // Add performLogout to dependencies

if (token) {
  try {
    const decodedToken = jwtDecode(token);
    console.log("ProtectedLayout: Decoded Token:", decodedToken); // Log existant

    const expirationTime = decodedToken.exp * 1000; // Convert expiration to milliseconds
    userRoles = decodedToken.roles; // Assigner la valeur ici
    const currentTime = Date.now();
    console.log("ProtectedLayout: Token Exists. Expiration Time:", expirationTime, "Current Time:", currentTime, "Is Expired:", currentTime > expirationTime);

    // Check if the token is valid
    if (expirationTime >= currentTime) {
      isAuthenticated = true;
      console.log("ProtectedLayout: Token not expired. isAuthenticated set to true.");

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
      console.error("ProtectedLayout: Error decoding token:", error);
      // isAuthenticated restera false
    }
  } else {
    console.log("ProtectedLayout: No token found.");
    // isAuthenticated restera false
  }

  console.log("ProtectedLayout: Final check before redirect - isAuthenticated:", isAuthenticated, "hasRequiredRole:", hasRequiredRole, "requiredRole:", requiredRole);

  // Removed unused and incorrectly implemented onLogout function

  // Redirect based on authentication and role
  if (!isAuthenticated) {
    console.log("ProtectedLayout: Redirecting to /sign-in because !isAuthenticated.");
    // Redirect unauthenticated users to the login page
    return <Navigate to="/sign-in" />;
  }
  if (!hasRequiredRole) {
    console.log("ProtectedLayout: Redirecting to / because !hasRequiredRole. User roles:", userRoles, "Required role:", requiredRole);
    // Redirect directly if unauthorized
    alert(t('protectedLayout.unauthorizedAccess')); // Use translation key
    return <Navigate to="/" />; // Use Navigate for direct redirect
  }

  return children; // Render the protected component if all checks pass
};

export default ProtectedLayout;
