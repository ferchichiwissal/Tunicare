import React, { createContext, useState, useEffect, useContext } from 'react';
// apiClient is not needed here anymore as we don't fetch profile
// import apiClient from '../utils/apiClient'; 
import { getUserData, getToken } from '../utils/auth'; // Import helpers to get data from storage

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null); // Initialize as null, read from storage in useEffect
    const [loading, setLoading] = useState(true); // Start loading until user/token is read or confirmed absent

    // Function to load user data from storage and set state
    const loadUserFromStorage = () => {
        setLoading(true);
        const storedToken = getToken(); // Use helper to check both storages
        const userData = getUserData(); // Use helper to get user object

        if (storedToken && userData.user && userData.user.id) { // Check if user object has data
            setToken(storedToken);
            // Combine firstName and lastName into name property
            const userWithCombinedName = {
                ...userData.user,
                name: `${userData.user.firstName || ''} ${userData.user.lastName || ''}`.trim()
            };
            setUser(userWithCombinedName);
            console.log("AuthContext: User loaded from storage:", userWithCombinedName);
        } else {
            // No token or user data found
            setToken(null);
            setUser(null);
            console.log("AuthContext: No user data found in storage.");
        }
        setLoading(false);
    };

    useEffect(() => {
        loadUserFromStorage(); // Load user on initial mount
    }, []);

    // fetchUserDetails is removed as we load directly from storage

    // Login logic is handled outside the context by Login.js using storeUserData
    // However, we might need a way for Login.js to signal the context to reload data
    // Or rely on the storage event listener below.

    const contextLogout = () => {
        // This context logout only clears the state.
        // Token removal from localStorage should be handled by the component triggering logout (e.g., Logout.js or a utility).
        setToken(null);
        setUser(null);
        setLoading(false); // Stop loading state on logout
        console.log("AuthContext state cleared.");
    };

    // Function to manually refresh user details from storage
    const refreshUser = () => {
        console.log("AuthContext: Refreshing user data from storage.");
        loadUserFromStorage(); // Reload data from storage
    };

    // Listen for storage changes to potentially auto-logout/login if token/user is changed elsewhere
    useEffect(() => {
        const handleStorageChange = (event) => {
            // When 'user' or 'token' changes in storage (e.g., login/logout in another tab)
            if (event.key === 'user' || event.key === 'token' || event.key === 'accessToken' || event.key === 'refreshToken') {
                 console.log(`AuthContext: Storage change detected for key '${event.key}'. Reloading user data.`);
                 loadUserFromStorage(); // Reload user data from storage
            }
            // Specific handling for token removal remains useful for immediate logout feedback
            if ((event.key === 'token' || event.key === 'accessToken') && !event.newValue) {
                 console.log('AuthContext: Token removed from storage, ensuring context state is cleared.');
                 contextLogout(); // Ensure state is cleared if token specifically removed
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);


    return (
        // Provide user, token, loading state, the context-specific logout, and refresh function
        <AuthContext.Provider value={{ user, token, loading, logout: contextLogout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
