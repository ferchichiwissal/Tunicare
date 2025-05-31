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
    const [previewing, setPreviewing] = useState(null); // Track which exam is previewing // Added state for previewing
    const [hidingExamId, setHidingExamId] = useState(null); // Track which exam is being hidden
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

    // Function to handle the preview click for examination request PDF // Added preview function
    const handlePreviewRequest = async (examId) => {
        setPreviewing(`request_${examId}`); // Set previewing state
        setError('');

        console.log(`Attempting to preview examination request PDF for ID: ${examId}`);

        const token = getToken();
        if (!token) {
            setError(t('myExaminationsPage.errors.authMissing'));
            setPreviewing(null); // Clear previewing state
            performLogout();
            return;
        }

        try {
            const previewResponse = await axios.get(`${API_URL}/api/medical-examinations/${examId}/download`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });

            if (previewResponse.data && previewResponse.data instanceof Blob && previewResponse.data.type === 'application/pdf') {
                const blob = new Blob([previewResponse.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank'); // Open in a new tab
            } else {
                 console.warn("Received unexpected response type for request preview:", previewResponse.headers['content-type']);
                 setError(t('myExaminationsPage.errors.previewInvalidResponse', 'Réponse invalide pour la prévisualisation de la demande.')); // Indicate preview failed
            }

        } catch (err) {
            console.error("Error fetching examination request PDF for preview:", err);
            let errorMessage = t('myExaminationsPage.errors.previewFailed', { examId: examId, defaultValue: 'Échec de la prévisualisation de la demande d\'examen.' });
            if (err.response) {
                try {
                    const errorBlob = err.response.data;
                    // Attempt to read error message from blob if it's not 404
                    if (errorBlob instanceof Blob) {
                        const errorText = await errorBlob.text();
                        try {
                            const errorJson = JSON.parse(errorText);
                            errorMessage = errorJson.message || errorText || errorMessage;
                        } catch (parseError) {
                            errorMessage = errorText || errorMessage;
                        }
                    } else {
                         errorMessage = err.response.data?.message || err.response.statusText || errorMessage;
                    }
                } catch (parseError) {
                    console.error("Could not parse error response for request preview:", parseError);
                }
            }
            setError(errorMessage);
        } finally {
            setPreviewing(null); // Clear previewing state
        }
    };


    // Function to handle the download click for examination request PDF // Keep download function
    const handleDownloadRequest = async (examId) => {
        setDownloading(`request_${examId}`);
        setError('');

        console.log(`Attempting to download examination request PDF for ID: ${examId}`);
        
        const token = getToken();
        if (!token) {
            setError(t('myExaminationsPage.errors.authMissing'));
            setDownloading(null);
            performLogout();
            return;
        }

        try {
            const response = await axios.get(`${API_URL}/api/medical-examinations/${examId}/download`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });

            const fileURL = window.URL.createObjectURL(new Blob([response.data]));
            const fileLink = document.createElement('a');
            fileLink.href = fileURL;
            fileLink.setAttribute('download', `demande_examen_${examId}.pdf`);
            document.body.appendChild(fileLink);
            fileLink.click();
            fileLink.parentNode.removeChild(fileLink);
            window.URL.revokeObjectURL(fileURL);

        } catch (err) {
            console.error("Error downloading examination request PDF:", err);
            let errorMessage = t('myExaminationsPage.errors.downloadFailed', { examId: examId });
            if (err.response) {
                try {
                    const errorBlob = err.response.data;
                    const errorText = await errorBlob.text();
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorText || errorMessage;
                } catch (parseError) {
                    console.error("Could not parse error response blob for request download:", parseError);
                }
            }
            setError(errorMessage);
        }
    };

    // Function to handle the preview click for examination result PDF // Added preview function
    const handlePreviewResult = async (examId) => {
        setPreviewing(`result_${examId}`); // Set previewing state
        setError('');

        console.log(`Attempting to preview examination result PDF for ID: ${examId}`);

        const token = getToken();
        if (!token) {
            setError(t('myExaminationsPage.errors.authMissing'));
            setPreviewing(null); // Clear previewing state
            performLogout();
            return;
        }

        try {
            const previewResponse = await axios.get(`${API_URL}/api/medical-examinations/${examId}/report/download-pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });

            if (previewResponse.data && previewResponse.data instanceof Blob && previewResponse.data.type === 'application/pdf') {
                const blob = new Blob([previewResponse.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank'); // Open in a new tab
            } else {
                 console.warn("Received unexpected response type for result preview:", previewResponse.headers['content-type']);
                 setError(t('myExaminationsPage.errors.previewInvalidResponse', 'Réponse invalide pour la prévisualisation du résultat.')); // Indicate preview failed
            }

        } catch (err) {
            console.error("Error fetching examination result PDF for preview:", err);
            let errorMessage = t('myExaminationsPage.errors.previewFailed', { examId: examId, defaultValue: 'Échec de la prévisualisation du résultat d\'examen.' });
            if (err.response) {
                try {
                    const errorBlob = err.response.data;
                    // Attempt to read error message from blob if it's not 404
                    if (errorBlob instanceof Blob) {
                        const errorText = await errorBlob.text();
                        try {
                            const errorJson = JSON.parse(errorText);
                            errorMessage = errorJson.message || errorText || errorMessage;
                        } catch (parseError) {
                            errorMessage = errorText || errorMessage;
                        }
                    } else {
                         errorMessage = err.response.data?.message || err.response.statusText || errorMessage;
                    }
                } catch (parseError) {
                    console.error("Could not parse error response for result preview:", parseError);
                }
            }
            setError(errorMessage);
        } finally {
            setPreviewing(null); // Clear previewing state
        }
    };

    // Function to handle the download click for examination result PDF // Keep download function
    const handleDownloadResult = async (examId) => {
        setDownloading(`result_${examId}`);
        setError('');

        console.log(`Attempting to download examination result PDF for ID: ${examId}`);
        
        const token = getToken();
        if (!token) {
            setError(t('myExaminationsPage.errors.authMissing'));
            setDownloading(null);
            performLogout();
            return;
        }

        try {
            const response = await axios.get(`${API_URL}/api/medical-examinations/${examId}/report/download-pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });

            const fileURL = window.URL.createObjectURL(new Blob([response.data]));
            const fileLink = document.createElement('a');
            fileLink.href = fileURL;
            fileLink.setAttribute('download', `resultat_examen_${examId}.pdf`);
            document.body.appendChild(fileLink);
            fileLink.click();
            fileLink.parentNode.removeChild(fileLink);
            window.URL.revokeObjectURL(fileURL);

        } catch (err) {
            console.error("Error downloading examination result PDF:", err);
            let errorMessage = t('myExaminationsPage.errors.downloadFailed', { examId: examId });
            if (err.response) {
                try {
                    const errorBlob = err.response.data;
                    const errorText = await errorBlob.text();
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorText || errorMessage;
                } catch (parseError) {
                    console.error("Could not parse error response blob for result download:", parseError);
                }
            }
            setError(errorMessage);
        } finally {
            setDownloading(null);
        }
    };

    // --- Function to Hide Examination ---
    const handleHideExamination = useCallback(async (examId) => {
        // Add confirmation dialog
        const confirmHide = window.confirm(t('myExaminationsPage.alerts.confirmHide', 'Êtes-vous sûr de vouloir masquer cet examen ? Cette action est irréversible depuis cette interface.'));
        if (!confirmHide) {
            return; // Stop if user cancels
        }

        setHidingExamId(examId);
        setError('');
        const token = getToken();

        if (!token) {
            setError(t('myExaminationsPage.errors.authMissing'));
            setHidingExamId(null);
            performLogout();
            return;
        }

        console.log(`Attempting to hide examination ID: ${examId}`);

        try {
            await axios.put(`${API_URL}/api/medical-examinations/${examId}/hide-for-patient`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Remove the examination from the list locally
            setExaminations(prevExams => prevExams.filter(exam => exam.idExam !== examId));
            // Optionally show a success message (e.g., using a toast notification library)
            console.log(`Successfully hid examination ID: ${examId}`);

        } catch (err) {
            console.error("Error hiding examination:", err);
            let errorMessage = t('myExaminationsPage.errors.hideFailed', { examId: examId });
            if (err.response) {
                // Try to parse backend error message if available
                try {
                    const errorData = err.response.data;
                    if (typeof errorData === 'string') {
                         errorMessage = errorData || errorMessage;
                    } else if (errorData && errorData.message) {
                         errorMessage = errorData.message;
                    }
                } catch (parseError) {
                     console.error("Could not parse error response for hiding:", parseError);
                }
            }
             setError(errorMessage);
        } finally {
            setHidingExamId(null);
        }
    }, [API_URL, t, performLogout]); // Added dependencies


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
    }, [API_URL, t, performLogout, handleHideExamination]); // Added handleHideExamination dependency

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
                            {/* <th>{t('myExaminationsPage.table.result', 'Résultat')}</th> {/* Suppressed Result Column Header */}
                            <th>{t('myExaminationsPage.table.action')}</th>
                        </tr>
                    </thead>
                    <tbody className="custom-table"> {/* Apply custom-table class for styling */}
                        {examinations.map(exam => (
                            <tr key={exam.idExam}>
                                <td>{formatDate(exam.createdAt)}</td> {/* Using createdAt as request date */}
                                <td>{exam.act || t('common.notAvailable')}</td> {/* Use translation key */}
                                <td>{displayCentre(exam)}</td> {/* Needs logic based on backend */}
                                {/* <td>{exam.resultat || t('common.notAvailable')}</td> {/* Suppressed Result Cell */}
                                <td className="actions-cell"> {/* Use actions-cell class for consistent styling */}
                                    {/* Preview Request Button */}
                                    <button
                                        className="btn btn-primary btn-sm me-2" // Bootstrap classes for margin
                                        onClick={() => handlePreviewRequest(exam.idExam)}
                                        disabled={previewing === `request_${exam.idExam}`} // Disable while previewing
                                        title={t('myExaminationsPage.buttons.viewRequestTooltip', 'Visualiser la demande')} // Add tooltip translation key
                                    >
                                        {previewing === `request_${exam.idExam}` ? t('loading') : t('myExaminationsPage.buttons.viewRequest', 'Visualiser Demande')} {/* Add button text translation key */}
                                    </button>
                                    {/* Download Request Button */}
                                    <button
                                        className="btn btn-primary btn-sm me-2" // Bootstrap classes for margin
                                        onClick={() => handleDownloadRequest(exam.idExam)}
                                        disabled={downloading === `request_${exam.idIdExam}`} // Disable while downloading
                                        title={t('myExaminationsPage.buttons.downloadRequestTooltip', 'Télécharger la demande')} // Add tooltip translation key
                                    >
                                        {downloading === `request_${exam.idExam}` ? t('loading') : t('myExaminationsPage.buttons.downloadRequest', 'Télécharger Demande')} {/* Add button text translation key */}
                                    </button>
                                    {/* Preview Result Button */}
                                    <button
                                        className="btn btn-primary btn-sm me-2" // Bootstrap classes for margin
                                        onClick={() => handlePreviewResult(exam.idExam)}
                                        disabled={previewing === `result_${exam.idExam}` || exam.etat !== 'terminé'} // Disable while previewing or if not finished
                                        title={exam.etat !== 'terminé' ? t('myExaminationsPage.tooltips.resultNotAvailable', 'Le résultat n\'est pas encore disponible.') : t('myExaminationsPage.buttons.viewResultTooltip', 'Visualiser le résultat')} // Add tooltip translation key
                                    >
                                        {previewing === `result_${exam.idExam}` ? t('loading') : t('myExaminationsPage.buttons.viewResult', 'Visualiser Résultat')} {/* Add button text translation key */}
                                    </button>
                                    {/* Download Result Button */}
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleDownloadResult(exam.idExam)}
                                        disabled={downloading === `result_${exam.idExam}` || exam.etat !== 'terminé'} // Disable while downloading or if not finished
                                        title={exam.etat !== 'terminé' ? t('myExaminationsPage.tooltips.downloadNotReady', 'Le résultat n\'est pas encore disponible pour téléchargement.') : t('myExaminationsPage.buttons.downloadResultTooltip', 'Télécharger le résultat')} // Add tooltip translation key
                                    >
                                        {downloading === `result_${exam.idExam}` ? t('loading') : t('myExaminationsPage.buttons.downloadResult', 'Télécharger Résultat')} {/* Add button text translation key */}
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
