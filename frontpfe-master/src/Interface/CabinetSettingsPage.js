import React, { useState, useEffect, useContext, useCallback } from 'react'; // Import useContext, useCallback
import axios from 'axios';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import ThemeContext from '../utils/ThemeContext'; // Corrected Import Path for ThemeContext
import { getUserData, getCabinetId, getToken, clearUserData, isTokenExpired } from '../utils/auth'; // Added auth utils
import './CabinetSettingsPage.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const CabinetSettingsPage = () => {
    const { t } = useTranslation(); // Initialize translation
    const { theme } = useContext(ThemeContext); // Get theme from context
    const [cabinetId, setCabinetId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState(''); // Success messages
    const [error, setError] = useState(''); // Error messages
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate(); // Initialize useNavigate

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('cabinetSettings.alerts.sessionExpired', 'Session expired. Please log in again.')); // Add translation key
        navigate("/sign-in");
    }, [navigate, t]);

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


    // Fetch cabinet ID on mount
    useEffect(() => {
        const currentCabinetId = getCabinetId();
        if (!currentCabinetId) {
            setError(t('cabinetSettings.cabinetIdError')); // Use translation
            // Optionally logout if cabinet ID is crucial and missing
            // performLogout();
        }
        setCabinetId(currentCabinetId);
    }, [t, performLogout]); // Added performLogout dependency

    // Handle file input change
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setMessage('');
        setError('');
    };

    // Handle signature upload
    const handleUpload = async () => {
        if (!selectedFile) {
            setError(t('cabinetSettings.selectFileError')); // Use translation
            return;
        }
        if (!cabinetId) {
            setError(t('cabinetSettings.cabinetIdError')); // Use translation
            return;
        }

        const token = getToken(); // Get token using the function
        if (!token) {
            setError(t('cabinetSettings.authError')); // Use translation
            performLogout(); // Logout if no token
            return;
        }

        setIsLoading(true);
        setMessage(''); // Clear messages before new attempt
        setError('');

        const formData = new FormData();
        formData.append('signatureFile', selectedFile);

        try {
            const response = await axios.post(
                `${API_URL}/cabinets/${cabinetId}/signature`, // Use API_URL directly
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`, // Use the fetched token
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            // Use translation for success message, fallback to response data if specific message exists
            setMessage(response.data || t('cabinetSettings.uploadSuccess'));
            setSelectedFile(null);
            // Clear the file input visually
            const fileInput = document.getElementById('signature-upload-input');
            if (fileInput) fileInput.value = null;

        } catch (err) {
            console.error("Error uploading signature:", err);
            // Use translation for error message, fallback to server error
            setError(err.response?.data || t('cabinetSettings.uploadFailed'));
            setMessage(''); // Clear success message on error
        } finally {
            setIsLoading(false);
        }
    };

    // Render the component
    return (
        // Apply theme class to the main container
        <div className={`cabinet-settings-page ${theme}`}>
            <h2>{t('cabinetSettings.title')}</h2>

            {/* Display error messages */}
            {error && <p className="error-message">{error}</p>}
            {/* Display success messages */}
            {message && <p className="success-message">{message}</p>}

            {/* Signature Upload Section */}
            <div className="form-group"> {/* Use form-group for structure */}
                <h3>{t('cabinetSettings.uploadTitle')}</h3>
                <p>{t('cabinetSettings.uploadDescription')}</p>

                {/* Consider adding a label for accessibility */}
                {/* <label htmlFor="signature-upload-input">{t('cabinetSettings.selectFileLabel')}</label> */}
                <input
                    type="file"
                    id="signature-upload-input" // Keep ID for potential label association or clearing
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleFileChange}
                    disabled={isLoading || !cabinetId}
                    // Removed inline style, handled by CSS
                />

                <button
                    onClick={handleUpload}
                    disabled={isLoading || !selectedFile || !cabinetId}
                    className="btn btn-primary" // Use consistent button class
                >
                    {isLoading ? t('cabinetSettings.uploading') : t('cabinetSettings.saveButton')}
                </button>
            </div>

            {/* Placeholder for other future settings */}
            {/* <div><h3>{t('cabinetSettings.otherSettingsTitle')}</h3> ... </div> */}
        </div>
    );
};

export default CabinetSettingsPage;
