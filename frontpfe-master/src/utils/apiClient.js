import axios from 'axios';
// Import necessary functions from auth.js
import { getToken, getUserData, storeUserData, clearUserData } from './auth';

const apiClient = axios.create({
  baseURL: 'http://localhost:6952',
});

// Flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;
// Array to hold requests waiting for token refresh
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add the auth token header
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken(); // Get token from localStorage
    if (token && !config.headers['Authorization']) { // Add header only if not already present
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling token expiration and refresh
apiClient.interceptors.response.use(
  (response) => response, // Simply return successful responses
  async (error) => {
    const originalRequest = error.config;

    // Check if it's a 401 error and not a retry attempt
    if (error.response?.status === 401 && !originalRequest._retry) {

      // Avoid refresh loops if the refresh endpoint itself returns 401
      if (originalRequest.url === '/auth/refresh') {
         console.error('Refresh token failed or is expired. Logging out.');
         clearUserData();
         // Redirect to login - using window.location for simplicity here
         // In a real app, consider a more integrated approach with routing history
         window.location.href = '/sign-in';
         return Promise.reject(error);
      }

      if (isRefreshing) {
        // If token is already being refreshed, queue the original request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return apiClient(originalRequest); // Retry with new token
          })
          .catch(err => {
            return Promise.reject(err); // Propagate error if refresh failed
          });
      }

      originalRequest._retry = true; // Mark as retry
      isRefreshing = true;

      const { refreshToken } = getUserData(); // Get refresh token

      if (!refreshToken) {
        console.error('No refresh token available. Logging out.');
        clearUserData();
        window.location.href = '/sign-in';
        isRefreshing = false; // Reset flag
        processQueue(new Error('No refresh token'), null); // Reject queued requests
        return Promise.reject(error);
      }

      try {
        console.log('Attempting token refresh...');
        // Use base axios or a new instance to avoid interceptor loop
        // Ensure the refresh request itself doesn't trigger the auth header interceptor if using apiClient
        const refreshResponse = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`, // Use baseURL from apiClient
          { refreshToken }
          // No Authorization header needed for refresh token endpoint
        );

        const newAccessToken = refreshResponse.data.accessToken;
        console.log('Token refreshed successfully.');

        // Update stored tokens (only access token changed)
        const currentData = getUserData();
        // Ensure we don't lose other user data when updating
        storeUserData({
            ...currentData, // Keep existing user data (roles, user object, etc.)
            accessToken: newAccessToken,
            refreshToken: currentData.refreshToken // Keep the same refresh token unless backend provides a new one
        });

        // Update the header of the original request for retry
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken); // Process queue with new token
        isRefreshing = false; // Reset flag

        return apiClient(originalRequest); // Retry the original request with the new token

      } catch (refreshError) { // Corrected: Removed '=>'
        console.error('Unable to refresh token:', refreshError.response?.data || refreshError.message);
        clearUserData(); // Clear data on refresh failure
        processQueue(refreshError, null); // Reject queue
        isRefreshing = false; // Reset flag
        window.location.href = '/sign-in'; // Redirect to login
        return Promise.reject(refreshError); // Reject the original request's promise
      }
    }

    // For errors other than 401, just reject the promise
    return Promise.reject(error);
  }
);

export default apiClient;
