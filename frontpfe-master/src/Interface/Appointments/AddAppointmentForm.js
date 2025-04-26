import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import { useTranslation } from 'react-i18next'; // Import useTranslation
import axios from 'axios'; // Keep axios or use apiClient consistently
import './AddAppointmentForm.css';
import { getToken, clearUserData, isTokenExpired } from '../../utils/auth'; // Added auth utils
// Backend now handles patient and cabinet ID automatically based on authenticated user
// import { AuthContext } from '../../context/AuthContext'; // Example context import (if needed elsewhere)
import apiClient from '../../utils/apiClient'; // Keep apiClient if used

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const AddAppointmentForm = () => { // Removed patientId prop
    const { t } = useTranslation(); // Initialize useTranslation
    const location = useLocation(); // Get location object
    const proposedDateTime = location.state?.proposedDateTime; // Get proposed date from navigation state
    const originalAppointmentId = location.state?.originalAppointmentId; // Get original ID if rescheduling

    // Function to format LocalDateTime string (YYYY-MM-DDTHH:mm:ss) to datetime-local format (YYYY-MM-DDTHH:mm)
    const formatDateTimeLocal = (dateTimeString) => {
        if (!dateTimeString) return '';
        // Assuming dateTimeString is in ISO format like '2024-05-20T14:30:00'
        // We need 'YYYY-MM-DDTHH:mm'
        return dateTimeString.substring(0, 16); // Take the first 16 characters
    };

    const [apptDateTime, setApptDateTime] = useState(formatDateTimeLocal(proposedDateTime) || ''); // Updated state name and initial value
    // Use the canonical French string for the state, translate only for display
    const [apptType, setApptType] = useState('Nouvelle consultation');
    // Removed cabinetId state and cabinets state
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate(); // Initialize useNavigate
    // Removed isLoadingCabinets state

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('addAppointment.alerts.sessionExpired', 'Session expired. Please log in again.')); // Add translation key
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


    // Effect to update state if proposedDateTime changes (e.g., navigating back and forth)
    useEffect(() => {
        setApptDateTime(formatDateTimeLocal(proposedDateTime) || '');
    }, [proposedDateTime]);

    // Removed useEffect for fetching cabinets

    // const { user } = useContext(AuthContext); // Example: Get user context if needed for other purposes

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        // Removed patientId check

        // Updated validation: only check apptDateTime and apptType
        if (!apptDateTime || !apptType) { // Updated state name
            setError(t('addAppointment.fillFieldsError', 'Veuillez remplir la date, l\'heure et le type.')); // Use translation
            setIsLoading(false);
            return;
        }

        // --- START DATE/TIME VALIDATION ---
        const now = new Date();
        const selectedDateTime = new Date(apptDateTime); // Parse the input string

        // Create dates for comparison, ignoring time for date check
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const selectedDate = new Date(selectedDateTime.getFullYear(), selectedDateTime.getMonth(), selectedDateTime.getDate());

        // 1. Check if the selected date is in the past
        if (selectedDate < today) {
            setError(t('addAppointment.pastDateError', 'La date sélectionnée ne peut pas être dans le passé.'));
            setIsLoading(false);
            return;
        }

        // 2. Check if the selected time is in the past *if* the date is today
        if (selectedDate.getTime() === today.getTime()) { // Compare timestamps to check if it's the same day
            const nowTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
            const selectedTime = selectedDateTime.getHours() * 60 + selectedDateTime.getMinutes(); // Selected time in minutes

            if (selectedTime <= nowTime) {
                setError(t('addAppointment.pastTimeError', 'L\'heure sélectionnée doit être postérieure à l\'heure actuelle pour aujourd\'hui.'));
                setIsLoading(false);
                return;
            }
        }
        // --- END DATE/TIME VALIDATION ---


        // Prepare data according to the DTO expected by the backend (datetime and type)
        // Cabinet ID is now handled by the backend using the auth token
        const appointmentData = {
            apptDateTime: apptDateTime, // Updated key and value
            apptType: apptType,
            originalAppointmentId: originalAppointmentId, // Add original ID (will be null if not rescheduling)
            // cabinetId removed from payload
        };

        try {
            // Call the endpoint that uses authentication context
            // Use apiClient for consistency
            const response = await apiClient.post(`/api/rendezvous/mine`, appointmentData);

            // Format the returned date/time for display
            const formattedDateTime = formatDateTimeLocal(response.data.apptDateTime).replace('T', ' à ');
            setMessage(t('addAppointment.successMessage', 'Rendez-vous demandé avec succès pour le {{dateTime}}! Statut: {{status}}', { dateTime: formattedDateTime, status: response.data.apptState })); // Use translation with interpolation

            setApptDateTime(''); // Clear form using updated setter
            setApptType('Nouvelle consultation'); // Reset to the canonical French string
            // Removed setSelectedCabinetId('')
        } catch (err) {
            console.error("Error creating appointment:", err);
            const backendError = err.response?.data?.error || err.response?.data?.message;
            setError(backendError || t('addAppointment.failureMessage', 'Failed to create appointment. Please try again.')); // Use translation for fallback
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="add-appointment-container">
            <h2>{originalAppointmentId ? t('addAppointment.rescheduleTitle', 'Reprogrammer un rendez-vous') : t('addAppointment.title', 'Ajouter un rendez-vous')}</h2>
            <form onSubmit={handleSubmit} className="add-appointment-form">
                {/* Cabinet Selection Dropdown Removed */}

                <div className="form-group">
                    <label htmlFor="appt_datetime" className="required">📅 {t('addAppointment.dateLabel', 'Date et Heure du rendez-vous')}</label> {/* Added required class, removed colon from fallback */}
                    <input
                        type="datetime-local" /* Updated type */
                        id="appt_datetime" /* Updated id */
                        value={apptDateTime} /* Updated state variable */
                        onChange={(e) => setApptDateTime(e.target.value)} /* Updated setter */
                        required
                        className="form-control"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="appt_type" className="required">📄 {t('addAppointment.typeLabel', 'Type de rendez-vous')}</label> {/* Added required class, removed colon from fallback */}
                    <select
                        id="appt_type"
                        value={apptType}
                        onChange={(e) => setApptType(e.target.value)}
                        required
                        className="form-control"
                    >
                        {/* Use canonical French strings for value, translate display text */}
                        <option value="Nouvelle consultation">{t('addAppointment.typeOptionNew', 'Nouvelle consultation')}</option>
                        <option value="Séance de contrôle">{t('addAppointment.typeOptionControl', 'Séance de contrôle')}</option>
                        {/* Add other types if needed, ensuring they have corresponding translation keys and use the canonical value */}
                    </select>
                </div>
                 {/* Input for Cabinet ID Removed */}

                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? t('addAppointment.addingButton', 'Ajout en cours...') : (originalAppointmentId ? `✅ ${t('addAppointment.rescheduleButton', 'Reprogrammer')}` : `✅ ${t('addAppointment.addButton', 'Ajouter')}`)}
                </button>
            </form>
            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default AddAppointmentForm;
