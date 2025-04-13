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
  storage.setItem('user', JSON.stringify(data.user || {}));
  // Store the preference itself so getUserData knows where to look first next time
  storage.setItem('rememberPreference', JSON.stringify(remember));
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

  const cabinetId = user ? user.cabinetId : null;
  // console.log("[getUserData] Extracted cabinetId:", cabinetId); // Optional log

  return { accessToken, refreshToken, roles, cabinetId, user };
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
