export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const decodedToken = JSON.parse(atob(token.split('.')[1])); // Decode the JWT
    const expirationTime = decodedToken.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();

    return currentTime > expirationTime; // Token is expired if current time > expiration
  } catch (error) {
    console.error('Invalid token:', error);
    return true; // Treat invalid tokens as expired
  }
};

// Determine which storage to use
const getStorage = (remember) => {
  return remember ? localStorage : sessionStorage;
};

// Store user data based on the remember flag
export const storeUserData = (data, remember = false) => {
  const storage = getStorage(remember);
  // Clear the other storage to avoid conflicts if the user changes preference
  const otherStorage = remember ? sessionStorage : localStorage;
  otherStorage.removeItem('accessToken');
  otherStorage.removeItem('refreshToken');
  otherStorage.removeItem('roles');
  otherStorage.removeItem('user');
  otherStorage.removeItem('rememberPreference'); // Also clear preference flag

  // Store in the selected storage
  storage.setItem('accessToken', data.accessToken);
  storage.setItem('refreshToken', data.refreshToken);
  storage.setItem('roles', JSON.stringify(data.roles || []));

  // Decode JWT to extract user ID and centre ID if available
  let userId = null;
  let centreId = null;
  if (data.accessToken) {
    try {
      const decodedToken = JSON.parse(atob(data.accessToken.split('.')[1]));
      userId = decodedToken.id || decodedToken.userId || null; // Try common claim names
      centreId = decodedToken.centreId || null; // Assuming 'centreId' claim name
    } catch (error) {
      console.error('Error decoding token for user/centre ID:', error);
    }
  }

  // Combine original user data with extracted IDs
  const userToStore = {
    ...data.user, // Include original user data from login response
    id: userId || (data.user ? data.user.id : null), // Prioritize extracted ID, fallback to original
    centreId: centreId || (data.user ? data.user.centreId : null), // Prioritize extracted ID, fallback to original
    // Ensure cabinetId is also included if present in original user data or token
    cabinetId: (data.user ? data.user.cabinetId : null) || (userId ? getCabinetIdFromToken(data.accessToken) : null) // Keep existing cabinetId logic or extract from token if needed
  };

  storage.setItem('user', JSON.stringify(userToStore)); // Store combined user object
  // Store the preference itself so getUserData knows where to look first next time
  storage.setItem('rememberPreference', JSON.stringify(remember));
};

// Helper function to get cabinetId from token claims (if needed)
const getCabinetIdFromToken = (token) => {
    if (!token) return null;
    try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        return decodedToken.cabinetId || null; // Assuming 'cabinetId' claim name
    } catch (error) {
        console.error('Error decoding token for cabinetId:', error);
        return null;
    }
};


// Retrieve user data, checking both storages based on preference
export const getUserData = () => {
  let storage = localStorage; // Default check localStorage first
  const localPreference = localStorage.getItem('rememberPreference');
  const sessionPreference = sessionStorage.getItem('rememberPreference');

  // Determine the primary storage based on stored preference
  if (localPreference !== null) {
    storage = localStorage;
  } else if (sessionPreference !== null) {
    storage = sessionStorage;
  }
  // If no preference found, default to localStorage, then check sessionStorage

  let accessToken = storage.getItem('accessToken');
  let refreshToken = storage.getItem('refreshToken');
  let rolesString = storage.getItem('roles');
  let userString = storage.getItem('user');

  // If not found in primary storage, check the other one
  if (!accessToken) {
    const otherStorage = storage === localStorage ? sessionStorage : localStorage;
    accessToken = otherStorage.getItem('accessToken');
    refreshToken = otherStorage.getItem('refreshToken');
    rolesString = otherStorage.getItem('roles');
    userString = otherStorage.getItem('user');
  }

  const roles = rolesString ? JSON.parse(rolesString) : [];
  const user = userString ? JSON.parse(userString) : {};
  // console.log("[getUserData] Parsed user:", user); // Optional log

  // Extract cabinetId and centreId directly from the stored user object
  const cabinetId = user ? user.cabinetId : null;
  const centreId = user ? user.centreId : null; // Extract centreId
  const userId = user ? user.id : null; // Extract user ID

  // console.log("[getUserData] Extracted cabinetId:", cabinetId); // Optional log
  // console.log("[getUserData] Extracted centreId:", centreId); // Optional log
  // console.log("[getUserData] Extracted userId:", userId); // Optional log


  // Return all relevant data, including the full user object and extracted IDs
  return { accessToken, refreshToken, roles, cabinetId, centreId, user, id: userId };
};

// Clear user data from both storages
export const clearUserData = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('roles');
  localStorage.removeItem('user');
  localStorage.removeItem('rememberPreference');

  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('roles');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('rememberPreference');
};

// Helper to get just the access token, checking both storages
export const getToken = () => {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
};

// Helper to get just the roles, checking both storages
export const getRoles = () => {
  const rolesString = localStorage.getItem('roles') || sessionStorage.getItem('roles');
  return rolesString ? JSON.parse(rolesString) : [];
};

// Helper to get just the cabinet ID, checking both storages
export const getCabinetId = () => {
  const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {};
  const cabinetId = user ? user.cabinetId : null;
  return cabinetId;
};

// Helper to get just the centre ID, checking both storages
export const getCentreId = () => {
  const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {};
  const centreId = user ? user.centreId : null;
  return centreId;
};
