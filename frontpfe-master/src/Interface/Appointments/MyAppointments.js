import React, { useState, useEffect, useCallback, useContext } from 'react'; // Import useContext
import apiClient from '../../utils/apiClient'; // Import apiClient
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUserData, getToken, clearUserData, isTokenExpired } from '../../utils/auth'; // Added auth utils
import ThemeContext from '../../utils/ThemeContext'; // Import ThemeContext
import './MyAppointments.css'; // Import CSS

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Helper function to format LocalDateTime string (using t for fallbacks)
const formatLocalDateTime = (dateTimeString, t) => {
    if (!dateTimeString) return t('common.notAvailable', 'N/A');
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) {
             console.warn("Invalid date string received:", dateTimeString);
             return t('common.invalidDate', 'Invalid Date');
        }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
        console.error("Error formatting date:", dateTimeString, error);
        return t('common.dateError', 'Date Error');
    }
};

// Helper function to format LocalDateTime string for datetime-local input
const formatForInput = (dateTimeString) => {
    if (!dateTimeString) return '';
    // Ensure the input string is long enough before slicing
    if (dateTimeString && dateTimeString.length >= 16) {
        return dateTimeString.substring(0, 16); // Takes YYYY-MM-DDTHH:mm
    }
    console.warn("Received date string is too short for input formatting:", dateTimeString);
    // Attempt to parse and reformat if possible, otherwise return empty
    try {
        const date = new Date(dateTimeString);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    } catch (e) {
        // Ignore parsing errors here, return empty
    }
    return '';
};


// Helper function to determine badge class based on status (using translated status if possible)
const getStatusBadgeClass = (status, t) => {
    // Normalize status for comparison, potentially using translated values if needed
    const normalizedStatus = status?.toLowerCase();

    // Compare against potential keys or normalized English/French terms
    if (normalizedStatus === t('myAppointments.statusAccepted', 'accepté').toLowerCase()) {
        return 'bg-success';
    } else if (normalizedStatus === t('myAppointments.statusPending', 'en attente').toLowerCase()) {
        return 'bg-warning text-dark';
    } else if (normalizedStatus === t('myAppointments.statusRefused', 'refusé').toLowerCase()) {
        return 'bg-danger';
    } else if (normalizedStatus === t('myAppointments.statusCancelled', 'annulé').toLowerCase()) {
        return 'bg-secondary';
    } else if (normalizedStatus === t('myAppointments.statusCompleted', 'réalisé').toLowerCase()) {
        return 'bg-info text-dark';
    } else {
        return 'bg-light text-dark'; // Default fallback
    }
};


// Mapping for status keys to use in translation lookup
const statusKeyMap = {
    'en attente': 'Pending', // Map original backend values to consistent keys
    'accepté': 'Accepted',
    'refusé': 'Refused',
    'annulé': 'Cancelled',
    'réalisé': 'Completed'
};

// Mapping for appointment types
const typeKeyMap = {
    'Nouvelle consultation': 'NewConsultation',
    'Séance de contrôle': 'ControlSession'
};


const MyAppointments = () => {
    const { t } = useTranslation();
    const { theme } = useContext(ThemeContext); // Keep theme context if needed elsewhere
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [userData, setUserData] = useState(null);

    // State for Modification Modal
    const [showModifyModal, setShowModifyModal] = useState(false);
    const [modifyTargetAppt, setModifyTargetAppt] = useState(null);
    const [modifyDateTime, setModifyDateTime] = useState('');
    const [modifyType, setModifyType] = useState('');

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('myAppointments.alerts.sessionExpired', 'Session expired. Please log in again.')); // Add translation key
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


    // Effect to load user data after mount
    useEffect(() => {
        const data = getUserData();
        if (data && data.user && data.user.id) {
            setUserData(data);
        } else {
            console.error("Failed to get user data or user ID from storage.");
            setError(t('myAppointments.errorFetchUser', 'Unable to retrieve user information. Please log in again.'));
            // Optionally navigate to login or logout
            // navigate('/sign-in');
            // performLogout();
        }
    }, [t, performLogout]); // Added performLogout dependency

    const fetchAppointments = useCallback(async () => {
        if (!userData || !userData.user || !userData.user.id) {
            console.log("fetchAppointments called before userData was ready or is invalid.");
            return;
        }
        const patientId = userData.user.id;
        setIsLoading(true);
        setError('');
        setActionMessage('');
        try {
            const response = await apiClient.get(`/api/patients/${patientId}/rendezvous/list`); // Use apiClient and relative path
            setAppointments(response.data || []);
        } catch (err) {
            console.error("Error fetching patient appointments:", err);
            setError(err.response?.data?.message || t('myAppointments.errorFetchAppointments', 'Error retrieving your appointments.'));
            setAppointments([]);
        } finally {
            setIsLoading(false);
        }
    }, [userData, API_URL, t, performLogout]); // Added performLogout dependency

    useEffect(() => {
        // Only fetch if userData is available
        if (userData) {
            fetchAppointments();
        }
    }, [userData, fetchAppointments]); // Depend on userData and fetchAppointments

    // --- Action Handlers ---

    const handleCancel = async (appointmentId) => {
        setActionMessage('');
        if (!window.confirm(t('myAppointments.confirmCancel', 'Are you sure you want to cancel this appointment?'))) {
            return;
        }
        setIsLoading(true);
        try {
            await apiClient.put(`/api/rendezvous/mine/${appointmentId}/cancel`); // Use apiClient and relative path
            setActionMessage(t('myAppointments.cancelSuccess', 'Appointment cancelled successfully.'));
            fetchAppointments(); // Refresh list
        } catch (err) {
            console.error("Error cancelling appointment:", err);
            const backendError = err.response?.data?.error || err.message;
            setActionMessage(t('myAppointments.cancelError', 'Error cancelling: {{error}}', { error: backendError }));
        } finally {
            setIsLoading(false);
        }
    };

    const openModifyModal = (appointment) => {
        setModifyTargetAppt(appointment);
        setModifyDateTime(formatForInput(appointment.apptDateTime));
        setModifyType(appointment.apptType);
        setShowModifyModal(true);
        setActionMessage('');
    };

    const closeModifyModal = () => {
        setShowModifyModal(false);
        setModifyTargetAppt(null);
        setModifyDateTime('');
        setModifyType('');
    };

    const handleUpdateSubmit = async () => {
        if (!modifyTargetAppt || !modifyDateTime || !modifyType) {
            setActionMessage(t('myAppointments.modifyFillFieldsError', 'Please fill in the date/time and type.'));
            return;
        }
        setActionMessage('');
        setIsLoading(true);

        const updatedDetails = {
            apptDateTime: modifyDateTime,
            apptType: modifyType,
        };

        try {
            await apiClient.put(`/api/rendezvous/mine/${modifyTargetAppt.idAppointment}/modify`, updatedDetails); // Use apiClient and relative path
            setActionMessage(t('myAppointments.modifySuccess', 'Appointment modified successfully.'));
            setTimeout(() => {
                closeModifyModal();
                fetchAppointments();
            }, 1500);
        } catch (err) {
            console.error("Error updating appointment:", err);
            const backendError = err.response?.data?.error || err.message;
            setActionMessage(t('myAppointments.modifyError', 'Error modifying: {{error}}', { error: backendError }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleFixNewAppointment = (originalAppointmentId, proposedDateTime) => {
        navigate('/add-appointment', {
            state: {
                proposedDateTime: proposedDateTime,
                originalAppointmentId: originalAppointmentId
            }
        });
    };

    // --- Render Logic ---

    if (isLoading && appointments.length === 0) {
        // Optional: Add a spinner or more elaborate loading indicator
        return <div className="d-flex justify-content-center mt-5"><div className="spinner-border" role="status"><span className="visually-hidden">{t('myAppointments.loading', 'Loading your appointments...')}</span></div></div>;
    }

    if (error) {
        // Use Bootstrap alert style for errors
        return <div className="alert alert-danger mt-4" role="alert">{error}</div>;
    }

    return (
        // Add padding and potentially other container classes
        <div className="my-appointments-container container mt-4">
            <h2 className="mb-4">{t('myAppointments.title', 'My Appointments')}</h2>

            {/* Use Bootstrap alert styles for messages */}
            {actionMessage && !showModifyModal && ( // Only show global message if modal isn't open
                <div className={`alert ${actionMessage.toLowerCase().includes('error') ? 'alert-danger' : 'alert-success'}`} role="alert">
                    {actionMessage}
                </div>
            )}

            {appointments.length === 0 && !isLoading ? (
                 <p>{t('myAppointments.noAppointments', 'You have no appointments at the moment.')}</p>
            ) : (
                 // Add Bootstrap table classes (including table-bordered) and responsive wrapper
                 <div className="table-responsive">
                     <table className="table table-hover table-bordered appointments-table"> {/* Removed table-striped */}
                         <thead>
                             <tr>
                                 <th>📅 {t('myAppointments.tableHeaderDate', 'Date and Time')}</th>
                                 <th>📄 {t('myAppointments.tableHeaderType', 'Type')}</th>
                                 <th>🟡 {t('myAppointments.tableHeaderStatus', 'Status')}</th>
                                 <th>{t('myAppointments.tableHeaderActions', 'Actions')}</th>
                             </tr>
                         </thead>
                         <tbody>
                             {appointments
                                 .filter(appt => appt.apptState !== 'réalisé') // Filter out completed appointments
                                 .map((appt) => {
                                     // Use the map to get the key suffix for status
                                     const statusKeySuffix = statusKeyMap[appt.apptState] || appt.apptState; // Fallback to raw state if not in map
                                     const statusTranslationKey = `myAppointments.status${statusKeySuffix}`;
                                     // Use the map to get the key suffix for type
                                     const typeKeySuffix = typeKeyMap[appt.apptType] || appt.apptType;
                                     const typeTranslationKey = `myAppointments.type${typeKeySuffix}`;


                                     return ( // Return the JSX for the row
                                         <tr key={appt.idAppointment}>
                                             <td>{formatLocalDateTime(appt.apptDateTime, t)}</td> {/* Pass t to formatter */}
                                             <td>{t(typeTranslationKey, appt.apptType)}</td> {/* Translate type */}
                                             {/* Use Bootstrap badges for status */}
                                             <td>
                                                 <span className={`badge ${getStatusBadgeClass(appt.apptState, t)}`}> {/* Pass t to badge function */}
                                                     {/* Use the mapped key */}
                                                     {t(statusTranslationKey, appt.apptState)} {/* Translate status */}
                                                 </span>
                                             </td>
                                             <td>
                                         {/* Add margin between buttons */}
                                         {/* Check status using direct backend string values */}
                                         {appt.apptState === 'accepté' && (
                                             <button onClick={() => handleCancel(appt.idAppointment)} className="btn btn-danger btn-sm me-1" disabled={isLoading}> {/* Changed btn-warning to btn-danger */}
                                                 {t('myAppointments.buttonCancel', 'Cancel')}
                                             </button>
                                         )}
                                         {appt.apptState === 'en attente' && (
                                             <button onClick={() => openModifyModal(appt)} className="btn btn-info btn-sm me-1" disabled={isLoading}>
                                                 {t('myAppointments.buttonModify', 'Modify')}
                                             </button>
                                         )}
                                         {appt.apptState === 'refusé' && appt.apptProposedDateTime && (
                                             <>
                                                 <div className="mb-1"> {/* Use Bootstrap margin class */}
                                                     <small>{t('myAppointments.proposedDateLabel', 'Proposed Date:')} {formatLocalDateTime(appt.apptProposedDateTime, t)}</small> {/* Pass t */}
                                                 </div>
                                                 <button onClick={() => handleFixNewAppointment(appt.idAppointment, appt.apptProposedDateTime)} className="btn btn-primary btn-sm" disabled={isLoading}>
                                                     {t('myAppointments.buttonFixNew', 'Schedule New')} {/* Translate button */}
                                                 </button>
                                             </>
                                         )}
                                         {/* Add other states if needed */}
                                     </td>
                                         </tr>
                                     ); // Close the returned JSX
                                 })}
                         </tbody>
                     </table>
                 </div> // Close table-responsive wrapper
            )}

            {/* Modification Modal (Using Bootstrap Modal Structure) */}
            {showModifyModal && modifyTargetAppt && (
                 <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}> {/* Simulate backdrop */}
                     <div className="modal-dialog modal-dialog-centered" role="document"> {/* Center modal */}
                         <div className="modal-content">
                             <div className="modal-header">
                                 <h5 className="modal-title">{t('myAppointments.modalTitleModify', 'Modify Appointment')}</h5>
                                 {/* Use Bootstrap close button */}
                                 <button type="button" className="btn-close" onClick={closeModifyModal} aria-label={t('common.close', 'Close')}></button>
                             </div>
                             <div className="modal-body">
                                 <p><small>{t('myAppointments.modalApptIdLabel', 'Appointment ID:')} {modifyTargetAppt.idAppointment}</small></p>
                                 {/* Use Bootstrap form-group/mb-3 for spacing */}
                                 <div className="mb-3">
                                     <label htmlFor="modifyDateTime" className="form-label">📅 {t('myAppointments.modalDateLabel', 'New Date and Time:')}</label>
                                     <input
                                         type="datetime-local"
                                         id="modifyDateTime"
                                         value={modifyDateTime}
                                         onChange={(e) => setModifyDateTime(e.target.value)}
                                         required
                                         className="form-control" // Already has Bootstrap class
                                     />
                                 </div>
                                 <div className="mb-3">
                                      <label htmlFor="modifyType" className="form-label">📄 {t('myAppointments.modalTypeLabel', 'Appointment Type:')}</label>
                                      <select
                                          id="modifyType"
                                          value={modifyType} // Keep original value for selection state
                                          onChange={(e) => setModifyType(e.target.value)} // Update state with original value
                                          required
                                          className="form-select" // Use form-select for Bootstrap styling
                                      >
                                          {/* Use original backend values but display translated text */}
                                          <option value="Nouvelle consultation">{t('myAppointments.typeNewConsultation', 'New Consultation')}</option>
                                          <option value="Séance de contrôle">{t('myAppointments.typeControlSession', 'Follow-up Session')}</option>
                                          {/* Add other types if they exist */}
                                      </select>
                                  </div>
                                 {/* Use Bootstrap alert for messages inside modal */}
                                 {actionMessage && (
                                     <div className={`alert mt-3 ${actionMessage.toLowerCase().includes('error') ? 'alert-danger' : 'alert-info'}`} role="alert">
                                         {actionMessage}
                                     </div>
                                 )}
                             </div>
                             <div className="modal-footer">
                                 <button type="button" className="btn btn-secondary" onClick={closeModifyModal}>{t('common.cancel', 'Cancel')}</button>
                                 <button
                                     type="button"
                                     className="btn btn-primary"
                                     onClick={handleUpdateSubmit}
                                     disabled={isLoading || !modifyDateTime || !modifyType}
                                 >
                                     {isLoading ? (
                                         <>
                                             <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                             {t('myAppointments.modalSavingButton', 'Saving...')}
                                         </>
                                     ) : (
                                         t('myAppointments.modalSaveButton', 'Save Changes')
                                     )}
                                 </button>
                             </div>
                         </div>
                     </div>
                 </div>
             )}
             {/* End Modification Modal */}

         </div> // Close my-appointments-container
     );
 };

 export default MyAppointments;
