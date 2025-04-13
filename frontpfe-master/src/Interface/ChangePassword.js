import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect, useCallback
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getToken, clearUserData, isTokenExpired } from '../utils/auth'; // Corrected import path
import './ChangePassword.css'; // Import the dedicated CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const ChangePassword = () => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert("Session expired or logged out. Redirecting to login.");
        navigate("/sign-in");
    }, [navigate]);

    // --- Token Expiry & Inactivity Checks ---
    useEffect(() => {
        const token = getToken();
        if (!token || isTokenExpired(token)) {
            performLogout();
            return;
        }
        let expiryTimer;
        try {
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            const expiryTime = decodedToken.exp * 1000;
            const currentTime = Date.now();
            const timeToExpire = expiryTime - currentTime;
            if (timeToExpire > 0) {
                expiryTimer = setTimeout(performLogout, timeToExpire);
            } else {
                performLogout();
                return;
            }
        } catch (err) {
            console.error("Error decoding token for expiry check:", err);
            performLogout();
            return;
        }
        let inactivityTimer;
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(performLogout, INACTIVITY_TIMEOUT);
        };
        const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
        activityEvents.forEach(event => window.addEventListener(event, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(expiryTimer);
            clearTimeout(inactivityTimer);
            activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [performLogout]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        // Basic password strength check (example: length only)
        if (newPassword.length < 8) {
             setError('New password must be at least 8 characters long.');
             return;
        }
        // Add more complex strength check if needed

        const token = getToken();
        if (!token) {
            setError("Authentication required. Please log in again.");
            performLogout(); // Logout if no token
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('http://localhost:6952/Users/change-password',
                { oldPassword, newPassword, confirmPassword }, // Send all three
                { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );

            setMessage(response.data.message || 'Password changed successfully!');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');

            // Show success alert and redirect
            alert('Password changed successfully!');
            navigate('/sign-in');

        } catch (err) {
            console.error("Error changing password:", err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to change password.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        // Use Bootstrap container and classes
        <div className="change-password-container container mt-4">
            <h2>Change Password</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}

            <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3"> {/* Bootstrap margin bottom */}
                    <label htmlFor="oldPassword" className="form-label required">Old Password</label>
                    <input
                        type="password"
                        id="oldPassword"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className={`form-control ${error ? 'is-invalid' : ''}`} // Basic error indication
                        required
                    />
                     {/* Generic error shown above form, specific field errors not implemented here */}
                </div>
                <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label required">New Password</label>
                    <input
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min. 8 characters)"
                        className={`form-control ${error ? 'is-invalid' : ''}`}
                        required
                        minLength="8"
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="confirmPassword" className="form-label required">Confirm New Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className={`form-control ${error ? 'is-invalid' : ''}`}
                        required
                        minLength="8"
                    />
                </div>

                <div className="text-center"> {/* Center button */}
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                        {loading ? 'Changing...' : 'Change Password'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChangePassword;
