import React, { useState, useEffect, useContext, useCallback } from 'react'; // Import useContext, useCallback
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Added useNavigate
import { getUserData, getCabinetId, getToken, clearUserData, isTokenExpired } from '../../utils/auth'; // Import getCabinetId and auth utils
import ThemeContext from '../../utils/ThemeContext'; // Corrected: Import ThemeContext as default
import './MyExaminationsPage.css'; // Import the CSS file
import { useTranslation } from 'react-i18next'; // Import useTranslation

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const MyExaminationsPage = () => {
    const { t } = useTranslation(); // Initialize translation hook
    const { theme } = useContext(ThemeContext); // Get theme from context
    const [user, setUser] = useState(null); // State to hold user info
    const [cabinetId, setCabinetId] = useState(null); // State to hold cabinet ID
    const [examinations, setExaminations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(null); // Track which exam is downloading
    const navigate = useNavigate(); // Initialize useNavigate

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('myExaminationsPage.alerts.sessionExpired', 'Session expired. Please log in again.')); // Add translation key
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


    // Function to handle the download click
    const handleDownload = async (examId) => {
        setDownloading(examId); // Indicate download start for this exam
        setError(''); // Clear previous errors

        // --- BACKEND REQUIRED ---
        // This part needs a backend endpoint like:
        // GET /api/medical-examinations/{examId}/download
        // which returns the PDF file content with appropriate headers.

        console.log(`Attempting to download examination ID: ${examId}`);
        // Removed the placeholder alert:
        // alert(`La fonctionnalité de téléchargement pour l'examen ${examId} nécessite une mise à jour du backend.`);

        // Example of how it *would* work with axios if the endpoint existed:
        // UNCOMMENTED THE ACTUAL LOGIC:
        const token = getToken(); // Use getToken
        if (!token) {
            setError(t('myExaminationsPage.errors.authMissing')); // Use translation key
            setDownloading(null);
            performLogout(); // Logout if no token
            return;
        }

        try {
            const response = await axios.get(`${API_URL}/api/medical-examinations/${examId}/download`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob', // Important for file download
            });

            // Create a URL for the blob object
            const fileURL = window.URL.createObjectURL(new Blob([response.data]));
            // Create a temporary link element
            const fileLink = document.createElement('a');
            fileLink.href = fileURL;
            // Suggest a filename (backend might provide one via Content-Disposition header)
            fileLink.setAttribute('download', `examen_${examId}.pdf`);
            // Append to body, click, and remove
            document.body.appendChild(fileLink);
            fileLink.click();
            fileLink.parentNode.removeChild(fileLink);
            window.URL.revokeObjectURL(fileURL); // Clean up blob URL

        } catch (err) {
            console.error("Error downloading examination PDF:", err);
            // Use translation key with interpolation
            setError(err.response?.data?.message || t('myExaminationsPage.errors.downloadFailed', { examId: examId }));
        } finally {
            setDownloading(null); // Indicate download end/failure
        }
        // --- END BACKEND REQUIRED --- UNCOMMENTED MARKER REMOVED

        // For now, just stop the loading indicator - REMOVED THIS SIMULATION
        // setTimeout(() => setDownloading(null), 500);
    };


    useEffect(() => {
        // Fetch user data and cabinet ID using the same approach as MyConsultationsPage
        const userData = getUserData();
        const currentCabinetId = getCabinetId(); // Use the dedicated helper function

        // Check if user and cabinetId are available
        if (!userData || !userData.user || !userData.user.id) {
             setError(t('myExaminationsPage.errors.unidentifiedUser')); // Use translation key
             setIsLoading(false);
             return;
        }
        if (!currentCabinetId) {
            setError(t('myExaminationsPage.errors.cabinetContextNotFound')); // Use translation key
            setIsLoading(false);
            return;
        }

        setUser(userData.user); // Store user object in state
        setCabinetId(currentCabinetId); // Store cabinet ID in state

        const fetchMyExaminations = async () => {
            // Use userData and currentCabinetId directly
            const currentPatientId = userData.user.id;

            // No need for this check anymore as it's done above
            // if (!currentPatientId || !currentCabinetId) {
            //     setError("ID utilisateur ou ID cabinet manquant.");
            //     setIsLoading(false);
            //     return;
            // }

            // Use accessToken from userData for authorization
            const token = userData.accessToken;
            if (!token) {
                setError(t('myExaminationsPage.errors.authMissingLogin')); // Use translation key
                setIsLoading(false); // Re-add missing lines
                return;             // Re-add missing lines
            }                       // Re-add missing closing brace

            setIsLoading(true);
            setError('');
            try {
                // Log the IDs being sent
                console.log(`Fetching examinations for Patient ID: ${currentPatientId}, Cabinet ID: ${currentCabinetId}`);

                // Use the updated endpoint with cabinetId query parameter
                const response = await axios.get(`${API_URL}/api/medical-examinations/my-examinations/${currentPatientId}?cabinetId=${currentCabinetId}`, {
                    headers: {
                        Authorization: `Bearer ${token}` // Use token from userData
                    }
                });
                 // Sort examinations by date descending (using createdAt)
                 const sortedExaminations = (response.data || []).sort((a, b) => {
                    const dateA = a.createdAt || 0; // Use createdAt from MedicalExamination entity
                    const dateB = b.createdAt || 0;
                    return new Date(dateB) - new Date(dateA);
                });
                setExaminations(sortedExaminations);
            } catch (err) {
                console.error("Error fetching patient examinations for cabinet:", err);
                 setError(err.response?.data?.message || t('myExaminationsPage.errors.fetchFailedFallback')); // Use translation key
                setExaminations([]);
            } finally {
                setIsLoading(false);
            }
        };

        // Check if user data is available before proceeding
        if (!userData || !userData.user || !userData.user.id || !userData.accessToken) {
            console.error("User data or token missing, cannot fetch examinations.");
            setError(t('myExaminationsPage.errors.authError')); // Use a generic auth error
            setIsLoading(false);
            // Optionally logout if critical data is missing
            // performLogout();
            return;
        }

        fetchMyExaminations();
    }, [API_URL, t, performLogout]); // Added t and performLogout dependencies

    // Helper function to format date
    const formatDate = (dateString) => {
        if (!dateString) return t('common.notAvailable'); // Use translation key
        try {
            // Using createdAt for exam request date
            // TODO: Consider using i18n locale for date formatting if needed globally
            return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch (e) {
            return t('common.invalidDate'); // Use translation key
        }
    };

     // Function to display centre information using the centreName field set by the backend
     const displayCentre = (exam) => {
        return exam.centreName || t('myExaminationsPage.common.unspecified'); // Use translation key
    };


    if (isLoading) {
        // Use translation key for loading message
        return <div style={{ padding: '20px' }}>{t('myExaminationsPage.loading')}</div>;
    }

    // Determine the container class based on the theme
    const containerClass = `my-examinations-page-container ${theme === 'night' ? 'night-mode' : ''}`;

    return (
        <div className={containerClass} style={{ padding: '20px' }}> {/* Use containerClass and remove inline style if handled by CSS */}
            {/* Use translation key for title */}
            <h2>{t('myExaminationsPage.title')}</h2>

            {/* Use translation key for error prefix */}
            {error && <p style={{ color: 'red' }}>{t('myExaminationsPage.errorPrefix')} {error}</p>}

            {examinations.length > 0 ? (
                <table className="table table-striped">
                    {/* Apply custom-table class for styling */}
                    <thead className="custom-table">
                        <tr>
                            {/* Use translation keys for table headers */}
                            <th>{t('myExaminationsPage.table.dateRequested')}</th>
                            <th>{t('myExaminationsPage.table.type')}</th>
                            <th>{t('myExaminationsPage.table.centre')}</th>
                            <th>{t('myExaminationsPage.table.action')}</th>
                        </tr>
                    </thead>
                    <tbody className="custom-table"> {/* Apply custom-table class for styling */}
                        {examinations.map(exam => (
                            <tr key={exam.idExam}>
                                <td>{formatDate(exam.createdAt)}</td> {/* Using createdAt as request date */}
                                <td>{exam.act || t('common.notAvailable')}</td> {/* Use translation key */}
                                <td>{displayCentre(exam)}</td> {/* Needs logic based on backend */}
                                <td> {/* Replaced recommendation with button */}
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleDownload(exam.idExam)}
                                        disabled={downloading === exam.idExam} // Disable while downloading this specific exam
                                    >
                                        {/* Use translation keys for button text */}
                                        {downloading === exam.idExam ? t('loading') : t('myExaminationsPage.buttons.download')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                 /* Use translation key for no examinations message */
                 !error && <p>{t('myExaminationsPage.noExaminations')}</p>
            )}
        </div>
    );
};

export default MyExaminationsPage;
