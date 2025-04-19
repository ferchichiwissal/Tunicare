import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect, useCallback
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation
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
    const { t } = useTranslation(); // Get translation function

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('changePassword.alerts.sessionExpired'));
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
            setError(t('changePassword.errors.passwordsMismatch'));
            return;
        }

        // Basic password strength check (example: length only)
        if (newPassword.length < 8) {
             setError(t('changePassword.errors.passwordTooShort'));
             return;
        }
        // Add more complex strength check if needed

        const token = getToken();
        if (!token) {
            setError(t('changePassword.errors.authRequired'));
            performLogout(); // Logout if no token
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('http://localhost:6952/Users/change-password',
                { oldPassword, newPassword, confirmPassword }, // Send all three
                { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );

            setMessage(response.data.message || t('changePassword.alerts.success'));
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');

            // Show success alert and redirect
            alert(t('changePassword.alerts.success')); // Reuse success message
            navigate('/sign-in');

        } catch (err) {
            console.error("Error changing password:", err);
            const errorMsg = err.response?.data?.message || err.message || t('changePassword.errors.generic');
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        // Use Bootstrap container and classes
        <div className="change-password-container container mt-4">
            <h2>{t('changePassword.title')}</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}

            <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3"> {/* Bootstrap margin bottom */}
                    <label htmlFor="oldPassword" className="form-label required">{t('changePassword.labels.oldPassword')}</label>
                    <input
                        type="password"
                        id="oldPassword"
                         value={oldPassword}
                         onChange={(e) => setOldPassword(e.target.value)}
                         className={`form-control ${error ? 'is-invalid' : ''}`} // Basic error indication
                         required
                     />
                     {/* Generic error shown above form, specific field errors not implemented here */}
                </div>
                <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label required">{t('changePassword.labels.newPassword')}</label>
                    <input
                        type="password"
                        id="newPassword"
                         value={newPassword}
                         onChange={(e) => setNewPassword(e.target.value)}
                         className={`form-control ${error ? 'is-invalid' : ''}`}
                         required
                         minLength="8"
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="confirmPassword" className="form-label required">{t('changePassword.labels.confirmPassword')}</label>
                    <input
                        type="password"
                        id="confirmPassword"
                         value={confirmPassword}
                         onChange={(e) => setConfirmPassword(e.target.value)}
                         className={`form-control ${error ? 'is-invalid' : ''}`}
                         required
                         minLength="8"
                    />
                </div>

                <div className="text-center"> {/* Center button */}
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                        {loading ? t('changePassword.buttons.changing') : t('changePassword.buttons.changePassword')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChangePassword;
