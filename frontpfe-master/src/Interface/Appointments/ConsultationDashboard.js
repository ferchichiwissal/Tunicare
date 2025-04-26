import React, { useState, useEffect, useMemo, useContext, useCallback } from 'react'; // Import useContext, useCallback
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient'; // Import apiClient
import AuthContext from '../../context/AuthContext'; // Import AuthContext
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { getToken, clearUserData, isTokenExpired } from '../../utils/auth'; // Added auth utils

import './ConsultationDashboard.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const ConsultationDashboard = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(); // Initialize translation function
    const { user } = useContext(AuthContext); // Get user from context
    const [consultations, setConsultations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('consultationDashboard.alerts.sessionExpired', 'Session expired. Please log in again.')); // Add translation key
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


    // --- Fetch Consultations ---
    useEffect(() => {
        const fetchConsultations = async () => {
            // Ensure user and user ID are available from context
            if (!user || !user.id) {
                setError(t('consultationDashboard.errors.missingDoctorId')); // Use translation key
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError('');
            try {
                // Fetch consultations for the specific doctor using apiClient
                console.log(`Fetching consultations for doctor ID: ${user.id}`);
                const response = await apiClient.get(`/api/consultations/doctor/${user.id}`);
                // Sort consultations by date descending (optional, backend might do it)
                const sortedConsultations = (response.data || []).sort((a, b) => {
                    const dateA = a.dateConsultation || 0;
                    const dateB = b.dateConsultation || 0;
                    return new Date(dateB) - new Date(dateA);
                });
                setConsultations(sortedConsultations);
            } catch (err) {
                console.error("Error fetching doctor's consultations:", err);
                // Use translation key for fallback message
                setError(err.response?.data?.message || t('consultationDashboard.errors.fetchFailedFallback'));
                setConsultations([]);
            } finally {
                setIsLoading(false);
            }
        };

        // Check if user exists before fetching
        if (user) {
            fetchConsultations();
        } else {
            // Handle case where user context might not be ready yet or is null
            console.log("User context not available yet for fetching consultations.");
            // Optionally set an error or wait
            // setError(t('consultationDashboard.errors.userContextUnavailable'));
            setIsLoading(false); // Stop loading if user isn't available
        }
    }, [user, t, performLogout]); // Added t and performLogout as dependencies

    // Filter consultations based on search term (client-side)
    const filteredConsultations = useMemo(() => {
        if (!searchTerm) {
            return consultations;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return consultations.filter(consult =>
            (consult.patient?.firstName?.toLowerCase().includes(lowerSearchTerm) ||
             consult.patient?.lastName?.toLowerCase().includes(lowerSearchTerm))
        );
     }, [consultations, searchTerm]);

     // Renamed function for clarity
     const handleViewDetails = (consultationId) => {
         // Navigate to the consultation page, passing consultationId
         // We'll use a different route or parameter to indicate "view/edit" mode vs "new" mode
         navigate(`/consultation/details/${consultationId}`);
     };

    // Helper function to format date - Keep this as is, it's formatting, not UI text
     const formatDate = (dateString) => {
        if (!dateString) return t('consultationDashboard.table.notAvailable'); // Use translation for N/A
        try {
            // Consider locale from i18n if needed, for now using 'fr-FR'
            return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch (e) {
            return t('consultationDashboard.table.invalidDate'); // Use translation
        }
    };

    if (isLoading) {
        // Use Bootstrap spinner or simple text
        return <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>{t('consultationDashboard.loading')}</div>;
    }

    return (
        // Use Bootstrap container/padding classes
        <div className="container mt-4 consultation-dashboard-container">
            <h2>{t('consultationDashboard.title')}</h2>

            {/* Use Bootstrap alert for errors */}
            {error && <div className="alert alert-danger" role="alert">{t('consultationDashboard.errorPrefix')}: {error}</div>}

            {/* Search Bar - Use Bootstrap margin bottom, remove max-width */}
            <div className="mb-3">
                <input
                    type="text"
                    className="form-control"
                    placeholder={t('consultationDashboard.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Consultations List/Table - Add responsive wrapper, hover effect, and custom class */}
            <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover custom-table"> {/* Added custom-table */}
                    <thead>
                        <tr>
                            <th>{t('consultationDashboard.table.patient')}</th>
                            <th>{t('consultationDashboard.table.date')}</th>
                            <th>{t('consultationDashboard.table.type')}</th>
                            {/* Corrected role check */}
                            {user?.role === 'DOCTOR' && <th>{t('consultationDashboard.table.actions')}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredConsultations.length > 0 ? (
                            filteredConsultations.map(consult => (
                                <tr key={consult.idConsultation}>
                                    <td>{consult.patient ? `${consult.patient.firstName} ${consult.patient.lastName}` : t('consultationDashboard.table.notAvailable')}</td>
                                    <td>{formatDate(consult.dateConsultation)}</td>
                                    <td>{consult.type || t('consultationDashboard.table.defaultType')}</td> {/* Use translation for default */}
                                    {/* Corrected role check */}
                                    {user?.role === 'DOCTOR' && (
                                         <td>
                                             {/* Changed button text and handler, use btn-primary for specific teal styling */}
                                             <button
                                                 className="btn btn-sm btn-primary" // Using btn-primary for custom teal style
                                                 onClick={() => handleViewDetails(consult.idConsultation)}
                                             >
                                                 {t('consultationDashboard.buttons.viewDetails')}
                                             </button>
                                         </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                {/* Corrected role check for colSpan, remove inline style */}
                                <td colSpan={user?.role === 'DOCTOR' ? 4 : 3} className="text-center">
                                    {t('consultationDashboard.table.noConsultations')}
                                </td>
                            </tr>
                        )}
                </tbody>
            </table>
            </div> {/* Close table-responsive wrapper */}
        </div>
    );
};

export default ConsultationDashboard;
