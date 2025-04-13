import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import {jwtDecode} from "jwt-decode";
import { useNavigate} from 'react-router-dom';


const ProtectedLayout = ({ requiredRole, children  }) => {
    const navigate = useNavigate();
  const token =
    localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
  let isAuthenticated = false;
  let hasRequiredRole = false;

  useEffect(() => {
    // Handle logout if token is invalid or expired
    if (!isAuthenticated) {
      onLogout();
    }
  }, [isAuthenticated]);

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

  const onLogout = () => {
    // Clear tokens
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");

    // Redirect to login
    return <Navigate to="/sign-in" />;
  };

  // Redirect based on authentication and role
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }
  if (!hasRequiredRole) {
    // Use a setTimeout to delay the navigation
    alert("Unauthorized access");
    setTimeout(() => {
      navigate("/"); // Navigate to the desired page
    }, 100); // Delay the navigation by 1 second (you can adjust the time)
    return null; // Prevent rendering protected content
  }

  return children; // Render the protected component if all checks pass
};

export default ProtectedLayout;
