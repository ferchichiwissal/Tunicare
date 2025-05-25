import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import axios from 'axios'; // Keep axios
import { useNavigate } from 'react-router-dom'; // Added useNavigate
import { getUserData, getCabinetId, getToken, clearUserData, isTokenExpired } from '../../utils/auth'; // Keep getUserData/getCabinetId and add auth utils
import { useTranslation } from 'react-i18next'; // Add useTranslation back

import './MyConsultationsPage.css'; // Keep the new CSS file import

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const MyConsultationsPage = () => {
    const { t } = useTranslation(); // Initialize translation function
    // Keep original state management
    const [user, setUser] = useState(null);
    const [cabinetId, setCabinetId] = useState(null);
    const [consultations, setConsultations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate(); // Initialize useNavigate
    const [certificateStatusMap, setCertificateStatusMap] = useState({}); // { consultationId: 'exists' | 'not_found' | 'loading' }
    const [prescriptionStatusMap, setPrescriptionStatusMap] = useState({}); // { consultationId: 'exists' | 'not_found' | 'loading' } // New state
    const [isCheckingCertificates, setIsCheckingCertificates] = useState(false); // Track certificate check loading state
    const [isCheckingPrescriptions, setIsCheckingPrescriptions] = useState(false); // Track prescription check loading state // New state

    // Revert API_URL definition
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('myConsultationsPage.alerts.sessionExpired', 'Session expired. Please log in again.')); // Add translation key
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


    // --- Fetch User Data and Consultations ---
    useEffect(() => {
        // Revert fetching user data and cabinet ID
        const userData = getUserData();
        const currentCabinetId = getCabinetId();
        setUser(userData.user);
        setCabinetId(currentCabinetId);

        // Keep fetch logic using axios
        const fetchMyConsultations = async () => {
            if (!userData.user || !userData.user.id) {
                setError(t('myConsultationsPage.errors.unidentifiedUser')); // Use translation
                setIsLoading(false);
                return;
            }
            if (!currentCabinetId) {
                 setError(t('myConsultationsPage.errors.cabinetContextNotFound')); // Use translation
                 setIsLoading(false);
                 return;
            }

            setIsLoading(true);
            setIsCheckingCertificates(true); // Start checking certificates as well
            setIsCheckingPrescriptions(true); // Start checking prescriptions as well // New line
            setError('');
            let fetchedConsultations = []; // Temporary variable
            try {
                const response = await axios.get(`${API_URL}/api/consultations/my-consultations/${userData.user.id}`, {
                     params: {
                         cabinetId: currentCabinetId
                     },
                    headers: {
                         'Authorization': `Bearer ${userData.accessToken}`
                    }
                });
                 const sortedConsultations = (response.data || []).sort((a, b) => {
                    const dateA = a.dateConsultation || 0;
                    const dateB = b.dateConsultation || 0;
                    return new Date(dateB) - new Date(dateA);
                });
                setConsultations(sortedConsultations);
                fetchedConsultations = sortedConsultations; // Store fetched consultations
            } catch (err) {
                console.error("Error fetching patient consultations:", err);
                fetchedConsultations = []; // Ensure it's empty on error
                // Use translation for error messages
                if (err.response?.status === 403) {
                     // Assuming 403 might not have a specific key yet, use fallback or add one
                     setError(err.response?.data?.message || t('myConsultationsPage.errors.fetchFailedFallback'));
                } else {
                    setError(err.response?.data?.message || t('myConsultationsPage.errors.fetchFailedFallback'));
                }
                setConsultations([]);
            } finally {
                setIsLoading(false); // Stop main loading here
                // Don't stop certificate or prescription checking here
            }
            // --- Check for certificates and prescriptions after fetching consultations --- // Modified comment
            if (fetchedConsultations.length > 0 && userData.accessToken) {
                // Initialize status maps
                const initialCertificateStatusMap = fetchedConsultations.reduce((acc, consult) => {
                    acc[consult.idConsultation] = 'loading';
                    return acc;
                }, {});
                setCertificateStatusMap(initialCertificateStatusMap);

                 const initialPrescriptionStatusMap = fetchedConsultations.reduce((acc, consult) => { // New
                    acc[consult.idConsultation] = 'loading'; // New
                    return acc; // New
                }, {}); // New
                setPrescriptionStatusMap(initialPrescriptionStatusMap); // New


                // Check certificates
                const checkCertificatePromises = fetchedConsultations.map(async (consult) => {
                    try {
                        // Use the details endpoint which is more lightweight
                        await axios.get(`${API_URL}/api/certificates/details/consultation/${consult.idConsultation}`, {
                            headers: { 'Authorization': `Bearer ${userData.accessToken}` }
                        });
                        return { id: consult.idConsultation, status: 'exists' };
                    } catch (certErr) {
                        if (certErr.response?.status === 404) {
                            return { id: consult.idConsultation, status: 'not_found' };
                        } else {
                            console.error(`Error checking certificate for consultation ${consult.idConsultation}:`, certErr);
                            return { id: consult.idConsultation, status: 'error' }; // Mark as error
                        }
                    }
                });

                // Check prescriptions // New section
                 const checkPrescriptionPromises = fetchedConsultations.map(async (consult) => { // New
                    try { // New
                        // Use the download endpoint and check for 200 status // New
                        const response = await axios.head(`${API_URL}/api/ordonnances/consultation/${consult.idConsultation}/download`, { // Use HEAD request for efficiency // New
                            headers: { 'Authorization': `Bearer ${userData.accessToken}` } // New
                        }); // New
                         if (response.status === 200) { // New
                            return { id: consult.idConsultation, status: 'exists' }; // New
                        } else { // New
                             return { id: consult.idConsultation, status: 'not_found' }; // New
                        } // New
                    } catch (presErr) { // New
                        if (presErr.response?.status === 404) { // New
                            return { id: consult.idConsultation, status: 'not_found' }; // New
                        } else { // New
                            console.error(`Error checking prescription for consultation ${consult.idConsultation}:`, presErr); // New
                            return { id: consult.idConsultation, status: 'error' }; // Mark as error // New
                        } // New
                    } // New
                }); // New


                const certificateResults = await Promise.all(checkCertificatePromises);
                setCertificateStatusMap(prevMap => {
                    const newMap = { ...prevMap };
                    certificateResults.forEach(result => {
                        newMap[result.id] = result.status;
                    });
                    return newMap;
                });
                 setIsCheckingCertificates(false); // Finish checking certificates

                 const prescriptionResults = await Promise.all(checkPrescriptionPromises); // New
                setPrescriptionStatusMap(prevMap => { // New
                    const newMap = { ...prevMap }; // New
                    prescriptionResults.forEach(result => { // New
                        newMap[result.id] = result.status; // New
                    }); // New
                    return newMap; // New
                }); // New
                 setIsCheckingPrescriptions(false); // Finish checking prescriptions // New

            } else {
                 setIsCheckingCertificates(false); // Also finish if no consultations or no token
                 setIsCheckingPrescriptions(false); // Also finish if no consultations or no token // New
            }
        };

        // Check if user data is available before proceeding
        if (!userData || !userData.user || !userData.user.id || !userData.accessToken) {
            console.error("User data or token missing, cannot fetch consultations.");
            setError(t('myConsultationsPage.errors.authError')); // Use a generic auth error
            setIsLoading(false);
            // Optionally logout if critical data is missing
            // performLogout();
            return;
        }

        fetchMyConsultations();
        // Add API_URL to dependencies
    }, [API_URL, t, performLogout]); // Keep dependencies minimal, API_URL needed now

    // Keep formatDate function but use translation
    const formatDate = (dateString) => {
        if (!dateString) return t('myConsultationsPage.table.notAvailable'); // Use translation
        try {
            return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch (e) {
            return t('myConsultationsPage.table.invalidDate'); // Use translation
        }
    };

    // Keep handleDownload function but use translation for errors
    const handleDownload = async (consultationId) => {
        const userData = getUserData();
        if (!userData || !userData.accessToken) {
            setError(t('myConsultationsPage.errors.authErrorDownload')); // Use translation
            performLogout(); // Logout if no token
            return;
        }

        try {
            const response = await axios.get(`${API_URL}/api/ordonnances/consultation/${consultationId}/download`, {
                headers: {
                    'Authorization': `Bearer ${userData.accessToken}`
                },
                responseType: 'blob'
            });

            if (response.data && response.data instanceof Blob && response.data.type === 'application/pdf') {
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `ordonnance_${consultationId}.pdf`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } else {
                 setError(t('myConsultationsPage.errors.downloadInvalidResponse')); // Use translation
            }

        } catch (err) {
            console.error("Error downloading prescription:", err);
            if (err.response?.status === 404) {
                setError(t('myConsultationsPage.errors.prescriptionNotFound')); // Use translation
            } else {
                setError(err.response?.data?.message || t('myConsultationsPage.errors.downloadFailedFallback')); // Use translation
            }
        }
    };
 
    // --- Download Certificate Handler ---
    const handleDownloadCertificate = async (consultationId) => {
        const userData = getUserData();
        if (!userData || !userData.accessToken) {
            setError(t('myConsultationsPage.errors.authErrorDownload'));
            performLogout();
            return;
        }
        // Clear previous errors before attempting download
        setError('');

        try {
            // Use the correct endpoint defined in CertificateController
            const response = await axios.get(`${API_URL}/api/certificates/download/consultation/${consultationId}`, {
                headers: {
                    'Authorization': `Bearer ${userData.accessToken}`
                },
                responseType: 'blob' // Assuming backend sends PDF blob
            });
 
            // Assuming PDF response for now
            if (response.data && response.data instanceof Blob && response.data.type === 'application/pdf') {
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                // Extract filename from content-disposition header if available, otherwise generate one
                const contentDisposition = response.headers['content-disposition'];
                let filename = `certificat_${consultationId}.pdf`; // Default
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                    if (filenameMatch && filenameMatch.length > 1) {
                        filename = filenameMatch[1];
                    }
                }
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } else if (response.data && response.data instanceof Blob && response.data.type.includes('html')) {
                 // Handle HTML response - open in new tab
                 const htmlBlob = new Blob([response.data], { type: 'text/html' });
                 const url = window.URL.createObjectURL(htmlBlob);
                 window.open(url, '_blank');
                 // No revoke needed immediately for new tab
            } else {
                 // Handle cases where response is not a blob or not the expected type
                 console.warn("Received unexpected response type for certificate download:", response.headers['content-type']);
                 setError(t('myConsultationsPage.errors.downloadInvalidResponse'));
            }

        } catch (err) {
            console.error("Error downloading certificate:", err);
             // Improved error handling: Check response status first
             if (err.response?.status === 404) {
                setError(t('myConsultationsPage.errors.certificateNotFound')); // Use translation
            } else if (err.response && err.response.data instanceof Blob) {
                 // Attempt to read error message from blob if it's not 404
                 try {
                     const errorText = await err.response.data.text();
                     const errorJson = JSON.parse(errorText); // Assuming error is JSON within blob
                     setError(errorJson.message || t('myConsultationsPage.errors.downloadFailedFallback'));
                 } catch (parseError) {
                     // Blob doesn't contain JSON error or parsing failed
                     setError(t('myConsultationsPage.errors.downloadFailedFallback'));
                 }
             } else {
                 // Handle other errors (network, non-blob responses)
                 setError(err.response?.data?.message || err.message || t('myConsultationsPage.errors.downloadFailedFallback'));
             }
        }
    };

    const handleHideConsultation = async (consultationId) => {
        const userData = getUserData();
        if (!userData || !userData.accessToken) {
            setError(t('myConsultationsPage.errors.authError'));
            performLogout();
            return;
        }

        if (!window.confirm(t('myConsultationsPage.alerts.confirmHide'))) {
            return;
        }

        try {
            // Call the new patient-specific endpoint with hidden=true
            await axios.put(`${API_URL}/api/consultations/${consultationId}/visibility/patient`, null, { // Use PUT, null body
                 params: {
                     hidden: true // Set hidden parameter to true
                 },
                headers: {
                    'Authorization': `Bearer ${userData.accessToken}`
                }
            });
            // Update the local state to reflect the change
            setConsultations(prevConsultations =>
                prevConsultations.filter(c => c.idConsultation !== consultationId)
            );
            alert(t('myConsultationsPage.alerts.hideSuccess'));
        } catch (err) {
            console.error("Error hiding consultation:", err);
            setError(err.response?.data?.message || t('myConsultationsPage.errors.hideFailedFallback'));
            alert(t('myConsultationsPage.alerts.hideError'));
        }
    };

    // Combined loading state
    const showLoading = isLoading || isCheckingCertificates || isCheckingPrescriptions; // Added isCheckingPrescriptions

    if (showLoading) {
        // Keep Bootstrap spinner and use translation
        return <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>{t('myConsultationsPage.loading')}</div>;
    }

    return (
        // Keep Bootstrap container/padding classes and the new container class
        <div className="container mt-4 my-consultations-page-container">
            <h2>{t('myConsultationsPage.title')}</h2> {/* Use translation */}

            {/* Keep Bootstrap alert and use translation */}
            {error && <div className="alert alert-danger" role="alert">{t('myConsultationsPage.errorPrefix')}: {error}</div>}

            {/* Keep responsive wrapper and custom table class */}
            <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover custom-table">
                    <thead>
                        <tr>
                            {/* Use translated table headers */}
                            <th>{t('myConsultationsPage.table.date')}</th>
                            <th>{t('myConsultationsPage.table.type')}</th>
                            <th>{t('myConsultationsPage.table.actions', 'Actions')}</th> {/* Combined Actions Header */}
                        </tr>
                    </thead>
                    <tbody>
                        {consultations.length > 0 ? (
                            consultations.map(consult => (
                                <tr key={consult.idConsultation}>
                                    <td>{formatDate(consult.dateConsultation)}</td>
                                    {/* Use translation for default type */}
                                    <td>{consult.type || t('myConsultationsPage.table.defaultType')}</td>
                                    <td className="actions-cell"> {/* Combined Actions Cell */}
                                        {prescriptionStatusMap[consult.idConsultation] === 'loading' ? ( // Check prescription loading state
                                             <span className="text-muted small me-2">{t('myConsultationsPage.checking', 'Vérification...')}</span> // Added me-2
                                        ) : (
                                            <button
                                                className="btn btn-primary btn-sm me-2" // Change to btn-primary for teal color, added me-2
                                                onClick={() => handleDownload(consult.idConsultation)}
                                                disabled={prescriptionStatusMap[consult.idConsultation] !== 'exists'} // Disable if not 'exists'
                                                title={prescriptionStatusMap[consult.idConsultation] !== 'exists' ? t('myConsultationsPage.tooltips.prescriptionNotAvailable', 'Ordonnance non disponible') : t('myConsultationsPage.buttons.download')} // Add tooltip
                                            >
                                                {t('myConsultationsPage.buttons.downloadPrescription')} {/* Use translation key */}
                                            </button>
                                            )}
                                            {certificateStatusMap[consult.idConsultation] === 'loading' ? (
                                                <span className="text-muted small me-2">{t('myConsultationsPage.checking')}</span> // Use translation key
                                            ) : (
                                                 <button
                                                    className="btn btn-primary btn-sm me-2" // Changed to primary for teal color, added me-2
                                                    onClick={() => handleDownloadCertificate(consult.idConsultation)}
                                                    disabled={certificateStatusMap[consult.idConsultation] !== 'exists'} // Disable if not 'exists'
                                                    title={certificateStatusMap[consult.idConsultation] !== 'exists' ? t('myConsultationsPage.tooltips.certificateNotAvailable') : t('myConsultationsPage.buttons.downloadedCertificate')} // Use translation keys
                                                >
                                                    {t('myConsultationsPage.buttons.downloadCertificate')} {/* Use translation key */}
                                                </button>
                                            )}
                                            <button
                                                className="btn btn-primary btn-sm" // Removed ms-2, will be handled by me-2 on previous buttons
                                                onClick={() => handleHideConsultation(consult.idConsultation)}
                                            >
                                                {t('myConsultationsPage.buttons.hideConsultation')} {/* Use translation key */}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    {/* Use translated no consultations message, adjust colspan */}
                                    <td colSpan={3} className="text-center"> {/* Adjusted colspan to 3 */}
                                        {t('myConsultationsPage.table.noConsultations')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div> {/* Close table-responsive wrapper */}
            </div>
        );
    };
    
    export default MyConsultationsPage;
