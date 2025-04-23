import React, { useState, useEffect, useCallback, useContext } from 'react'; // Import useContext
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import apiClient from '../../utils/apiClient'; // Import apiClient
import { useTranslation } from 'react-i18next'; // Import useTranslation
import ThemeContext from '../../utils/ThemeContext'; // Import default export ThemeContext
import { getUserData } from '../../utils/auth'; // Import getUserData
import './ManageAppointments.css'; // Import CSS

// Helper function to format LocalDateTime string (e.g., "2024-05-20T10:30:00") to "DD/MM/YYYY HH:mm"
// Now accepts the 't' function as an argument
const formatLocalDateTime = (dateTimeString, t) => {
    if (!dateTimeString) return 'N/A';
    // Ensure t is a function before using it, provide fallback otherwise
    const translate = typeof t === 'function' ? t : (key, fallback) => fallback || key;
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) { // Check if the date is valid
             console.warn("Invalid date string received:", dateTimeString);
             // Note: Returning a translated string from here might be complex if t isn't available.
             // Consider handling this display logic where 't' is accessible, or pass 't' if needed.
             // For now, keeping it simple, but ideally, this should be handled differently.
             return translate('common.invalidDate', 'Invalid Date'); // Use translate helper
        }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
        console.error("Error formatting date:", dateTimeString, error);
        // Similar issue as above regarding 't' availability.
        return translate('common.dateError', 'Date Error'); // Use translate helper
    }
};

// Helper function to format date to YYYY-MM-DD (for date input filter)
const formatDateForInput = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
};


const ManageAppointments = () => {
    const { t } = useTranslation(); // Initialize useTranslation
    const { theme } = useContext(ThemeContext); // Use useContext with ThemeContext
    const navigate = useNavigate(); // Initialize useNavigate
    const [userData, setUserData] = useState(getUserData()); // Get user data on mount
    const [filterState, setFilterState] = useState('en attente'); // Keep internal state value as is
    const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date())); // Default to today, use new helper
    const [appointments, setAppointments] = useState([]);
    const [filteredAppointments, setFilteredAppointments] = useState([]); // For local filtering
    const [searchTerm, setSearchTerm] = useState(''); // State for search input
    const [showAddForm, setShowAddForm] = useState(false); // State to toggle add form visibility
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionMessage, setActionMessage] = useState(''); // For success/error messages from actions (WILL NOW BE USED FOR FORM TOO)
    // State to store filters before opening the form
    const [preFormFilterState, setPreFormFilterState] = useState(filterState);
    const [preFormSelectedDate, setPreFormSelectedDate] = useState(selectedDate);

    // State for the Refusal Modal
    const [showRefuseModal, setShowRefuseModal] = useState(false);
    const [refusalTargetId, setRefusalTargetId] = useState(null);
    const [proposedDateTime, setProposedDateTime] = useState(''); // For the datetime-local input

    // State for the Add Appointment Form
    const [newAppointment, setNewAppointment] = useState({
        firstName: '',
        lastName: '',
        apptDateTime: '', // Renamed from apptDate, default to empty
        apptType: 'Nouvelle consultation', // Keep internal state value as is, translate options in JSX
    });

    // Extract cabinetId and userRole from userData state
    const cabinetId = userData?.cabinetId; // cabinetId is directly available in userData
    const userRole = userData?.roles; // Use the 'roles' array from userData

    // Replace with your actual API base URL
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    const fetchAppointments = useCallback(async () => {
        // Check if cabinetId is available from userData
        if (!cabinetId) {
            setError(t('manageAppointments.error.missingCabinetId'));
            console.error("Cabinet ID not found in user data:", userData); // Debug log
            return;
        }
        setIsLoading(true);
        setError('');
        // setActionMessage(''); // Keep action messages between fetches unless explicitly cleared
        setAppointments([]); // Clear previous appointments

        let url = '';
        // Use the selectedDate which is already in YYYY-MM-DD format
        const params = { date: selectedDate };

        if (filterState === 'en attente') {
            // Fetch appointments with state 'en attente' for the selected date
            url = `${API_URL}/api/cabinets/${cabinetId}/rendezvous`;
            params.state = 'en attente';
        } else { // filterState === 'accepté'
            // Fetch appointments with state 'accepté' for the selected date
            url = `${API_URL}/api/cabinets/${cabinetId}/rendezvous/accepted`;
            // No 'state' param needed as the endpoint specifically fetches accepted ones
        }

        try {
            console.log(`Fetching appointments from: ${url} with params:`, params); // Debug log
            // Use apiClient and relative path (assuming API_URL is base for apiClient)
            const relativeUrl = url.replace(API_URL, '');
            const response = await apiClient.get(relativeUrl, { params });
            console.log("Appointments fetched:", response.data); // Debug log
            const fetchedAppointments = response.data || [];
            setAppointments(fetchedAppointments); // Ensure it's an array
            // --- DEBUGGING ---
            if (fetchedAppointments.length > 0) {
                console.log("Structure of the first appointment:", fetchedAppointments[0]);
                console.log("Patient data in first appointment:", fetchedAppointments[0]?.patient);
            }
            // --- END DEBUGGING ---
        } catch (err) {
            console.error("Error fetching appointments:", err);
            const errorMessage = err.response?.data?.message || t('manageAppointments.error.fetchFailed', { filterState });
            setError(errorMessage);
            setAppointments([]); // Clear appointments on error
        } finally {
            setIsLoading(false);
        }
    }, [cabinetId, filterState, selectedDate, API_URL]);

    // Effect to fetch appointments
    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]); // Re-fetch when filters change (date, state)

    // Effect to filter appointments locally when appointments or searchTerm change
    useEffect(() => {
        let results = appointments;
        if (searchTerm) {
            results = appointments.filter(appt =>
                (appt.patient?.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (appt.patient?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        setFilteredAppointments(results);
    }, [appointments, searchTerm]);

    // Effect to automatically clear action messages after a delay
    useEffect(() => {
        if (actionMessage) {
            const timer = setTimeout(() => {
                setActionMessage('');
            }, 5000); // Clear after 5 seconds

            // Cleanup function to clear the timer if the message changes
            // or the component unmounts before the timer finishes
            return () => clearTimeout(timer);
        }
    }, [actionMessage]); // Run this effect whenever actionMessage changes

    const handleAccept = async (appointmentId) => {
        setActionMessage('');
        try {
            await apiClient.put(`/api/rendezvous/${appointmentId}/accept`); // Use apiClient and relative path
            setActionMessage(t('manageAppointments.action.acceptSuccess', { appointmentId }));
            fetchAppointments(); // Refresh list
        } catch (err) {
            console.error("Error accepting appointment:", err);
            const errorMessage = err.response?.data?.message || '';
            setActionMessage(t('manageAppointments.action.acceptFailed', { appointmentId, error: errorMessage }));
        }
    };

    // --- Refusal Modal Logic ---
    const openRefuseModal = (appointmentId) => {
        setRefusalTargetId(appointmentId);
        setProposedDateTime(''); // Clear previous date
        setShowRefuseModal(true);
        setActionMessage(''); // Clear any previous action messages
    };

    const closeRefuseModal = () => {
        setShowRefuseModal(false);
        setRefusalTargetId(null);
        setProposedDateTime('');
    };

    const handleRefuseSubmit = async () => {
        if (!refusalTargetId || !proposedDateTime) {
            setActionMessage(t('manageAppointments.modal.refuse.validationError'));
            return;
        }
        setActionMessage('');
        setIsLoading(true); // Indicate loading

        try {
            // Use the correct endpoint and send proposedDateTime as a request parameter
            const relativeUrl = `/api/rendezvous/${refusalTargetId}/refuse-propose`; // Use relative path
            await apiClient.put(relativeUrl, null, { // Use apiClient
                 params: { proposedDateTime: proposedDateTime }
            });
            setActionMessage(t('manageAppointments.modal.refuse.success', { refusalTargetId }));
            closeRefuseModal();
            fetchAppointments(); // Refresh list
        } catch (err) {
            console.error("Error refusing/proposing appointment:", err);
            const errorMessage = err.response?.data?.error || err.message;
            setActionMessage(t('manageAppointments.modal.refuse.failure', { refusalTargetId, error: errorMessage }));
            // Keep modal open on error? Or close? Let's keep it open for now.
        } finally {
             setIsLoading(false);
        }
    };
    // --- End Refusal Modal Logic ---


    const handleMarkAsDone = async (appointmentId) => {
        setActionMessage('');
        try {
            // Assuming '/complete' endpoint sets state to 'réalisé'
            await apiClient.put(`/api/rendezvous/${appointmentId}/complete`); // Use apiClient and relative path
            // No need for success message here as we navigate away
            // setActionMessage(t('manageAppointments.action.markDoneSuccess', { appointmentId }));
            // Redirect to consultation page AFTER successful update
            navigate(`/consultation/${appointmentId}`);
            // No need to fetchAppointments() here as we are navigating away
        } catch (err) {
            console.error("Error marking appointment as done:", err);
            const errorMessage = err.response?.data?.message || '';
            setActionMessage(t('manageAppointments.action.markDoneFailed', { appointmentId, error: errorMessage }));
        }
    };

    // Handle changes in the add appointment form
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setNewAppointment(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    // Handle form submission
    const handleAddAppointmentSubmit = async (e) => {
        e.preventDefault();
        setActionMessage(''); // Clear previous general action messages
        // setFormError(''); // No longer needed
        // setFormSuccess(''); // No longer needed
        setIsLoading(true); // Indicate loading state during submission

        const { firstName, lastName, apptDateTime, apptType } = newAppointment; // Use apptDateTime

        // Basic validation
        if (!firstName || !lastName || !apptDateTime || !apptType) { // Use apptDateTime
            setActionMessage(t('manageAppointments.addForm.validationError'));
            setIsLoading(false);
            return;
        }

        try {
            // 1. Check if patient exists in the current cabinet
            console.log(`Checking patient: ${firstName} ${lastName} in cabinet ${cabinetId}`);
            let patientId = null;
            try {
                // Corrected backend endpoint path
                const patientSearchRelativeUrl = `/Users/cabinet/${cabinetId}/patients/search`; // Use relative path
                const response = await apiClient.get(patientSearchRelativeUrl, { // Use apiClient
                    params: { firstName, lastName }
                });

                // Assuming the API returns the patient object directly if found (status 200),
                // or throws a 404 error if not found (caught below).
                // Check if the response data and the 'idPatient' field exist.
                if (response.data && response.data.idPatient) { // Check for 'idPatient' field
                    patientId = response.data.idPatient; // Assign the correct ID
                    console.log(`Patient found with ID: ${patientId}`);
                } else {
                    // This else block might be redundant if 404 is always thrown when not found,
                    // but kept as a safeguard in case the API returns 200 with empty/invalid data.
                    console.log("Patient not found in this cabinet (search success, no data).");
                    setActionMessage(t('manageAppointments.addForm.patientNotFound')); // Use actionMessage
                    setIsLoading(false);
                    return; // Stop execution if patient not found
                 }
            } catch (searchError) {
                 // Handle cases where the search endpoint might return 404 Not Found specifically
                 if (searchError.response && searchError.response.status === 404) {
                    console.log("Patient not found (404).");
                    setActionMessage(t('manageAppointments.addForm.patientNotFound')); // Use actionMessage
                 } else {
                    // Handle other potential errors during search (network, server error, etc.)
                    console.error("Error searching for patient:", searchError);
                    const searchErrorMessage = searchError.response?.data?.message || searchError.message;
                    setActionMessage(t('manageAppointments.addForm.patientSearchError', { error: searchErrorMessage })); // Use actionMessage
                 }
                setIsLoading(false);
                return; // Stop execution on any search error
            }


            // 2. If patient exists (patientId is not null), create the appointment
            // This block is only reached if the patient search was successful and returned a patientId
            const appointmentData = {
                // Assuming the backend expects the patient object with 'id' field for relationship mapping
                patient: { id: patientId }, // Keep using 'id' here unless backend endpoint expects 'idPatient'
                apptDateTime: apptDateTime, // Use apptDateTime
                apptType: apptType,
                // apptState is set to 'accepté' by the backend endpoint addAppointmentByStaff
            };

            console.log("Creating appointment with data:", appointmentData);
            const createAppointmentRelativeUrl = `/api/cabinets/${cabinetId}/rendezvous`; // Use relative path
            await apiClient.post(createAppointmentRelativeUrl, appointmentData); // Use apiClient

            setActionMessage(t('manageAppointments.addForm.addSuccess')); // Use actionMessage

            // Clear the form immediately
            setNewAppointment({
                firstName: '',
                lastName: '',
                apptDateTime: '', // Reset apptDateTime to empty
                apptType: 'Nouvelle consultation', // Reset internal state value
            });

            // Keep the form visible for a few seconds, then close and restore filters
            setTimeout(() => {
                setShowAddForm(false); // Hide the form
                setFilterState(preFormFilterState); // Restore original filter state
                setSelectedDate(preFormSelectedDate); // Restore original date
                // fetchAppointments will be triggered by the state changes via useEffect
            }, 3000); // 3-second delay (adjust as needed)

        } catch (error) {
            // This catch block now primarily handles errors from the POST request (appointment creation)
            console.error("Error adding appointment:", error);
            const addErrorMessage = error.response?.data?.message || error.message;
            // Always set actionMessage for creation errors
            setActionMessage(t('manageAppointments.addForm.addError', { error: addErrorMessage })); // Use actionMessage
        } finally {
            setIsLoading(false); // End loading state regardless of success or failure
        }
    };


    // Add a check for cabinetId before rendering the main content
    // Add a check for cabinetId before rendering the main content
    if (!cabinetId) {
        return (
            <div className="manage-appointments-container">
                <h2>{t('manageAppointments.title')}</h2>
                <p className="error-message">{t('manageAppointments.error.missingCabinetIdMessage')}</p>
            </div>
        );
    }

    // Helper function to check role from the roles array
    const hasRole = (roleToCheck) => {
        // Ensure userRole is an array before checking
        return Array.isArray(userRole) && userRole.includes(roleToCheck);
    };

    const isDoctor = hasRole('ROLE_DOCTOR'); // Check if 'ROLE_DOCTOR' is in the roles array
    const showActionColumn = isDoctor || filterState === 'en attente';


    return (
         // Apply theme to main container
        <div className={`manage-appointments-container ${theme}`}>
            <h2>{t('manageAppointments.title')}</h2>

            {/* Filters without search bar */}
            <div className="filters">
                <div className="filter-group radio-group">
                    <label>
                        <input
                            type="radio"
                            name="apptStateFilter"
                            value="en attente"
                            checked={filterState === 'en attente'}
                            onChange={(e) => setFilterState(e.target.value)}
                        />
                        {t('manageAppointments.filter.pending')}
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="apptStateFilter"
                            value="accepté"
                            checked={filterState === 'accepté'}
                            onChange={(e) => setFilterState(e.target.value)}
                        />
                        {t('manageAppointments.filter.accepted')}
                    </label>
                </div>
                <div className="filter-group">
                    <label htmlFor="dateFilter">{t('manageAppointments.filter.dateLabel')}</label>
                    <input
                        type="date"
                        id="dateFilter"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="form-control"
                    />
                </div>
                 {/* Search bar moved out */}
            </div>

            {/* Search Bar Container */}
            <div className="search-bar-container">
                <div className="search-bar">
                    <label htmlFor="searchFilter">{t('manageAppointments.filter.searchLabel')}</label>
                    <input
                        type="text"
                        id="searchFilter"
                        placeholder={t('manageAppointments.filter.searchPlaceholder')}
                        className="form-control"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Add Appointment Button Container */}
            <div className="add-appointment-button-container">
                 <button
                     onClick={() => {
                         if (!showAddForm) { // Only store state when opening the form
                             setPreFormFilterState(filterState);
                             setPreFormSelectedDate(selectedDate);
                         }
                         setShowAddForm(!showAddForm);
                     }}
                      className="btn btn-add-appointment" // Removed btn-primary
                  >
                      {showAddForm ? t('manageAppointments.buttons.cancelAdd') : t('manageAppointments.buttons.addAppointment')}
                  </button>
            </div>


            {actionMessage && <p className={`action-message ${actionMessage.includes('Error') || actionMessage.includes('Failed') || actionMessage.includes('Erreur') || actionMessage.includes('Échec') || actionMessage.includes('❌') || actionMessage.includes('⚠️') ? 'error-message' : 'success-message'}`}>{actionMessage}</p>}
            {error && <p className="error-message">{error}</p>}

            {isLoading ? (
                <p>{t('manageAppointments.loading')}</p>
            ) : (
                <>
                    {/* Conditionally render Add Appointment Form */}
                    {showAddForm && (
                         // Apply theme to form container
                        <div className={`add-appointment-form-container card ${theme}`}>
                             <div className="card-body">
                                <h3 className="card-title">{t('manageAppointments.addForm.title')}</h3>
                                <form onSubmit={handleAddAppointmentSubmit} className="add-appointment-form">
                                    <div className="form-row">
                                        <div className="form-group col-md-6">
                                            <label htmlFor="firstName">{t('manageAppointments.addForm.firstNameLabel')}</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                id="firstName"
                                                name="firstName"
                                                value={newAppointment.firstName}
                                                onChange={handleFormChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group col-md-6">
                                            <label htmlFor="lastName">{t('manageAppointments.addForm.lastNameLabel')}</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                id="lastName"
                                                name="lastName"
                                                value={newAppointment.lastName}
                                                onChange={handleFormChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group col-md-6">
                                            <label htmlFor="apptDateTime">{t('manageAppointments.addForm.dateTimeLabel')}</label> {/* Updated label */}
                                            <input
                                                type="datetime-local" /* Updated type */
                                                className="form-control"
                                                id="apptDateTime" /* Updated id */
                                                name="apptDateTime" /* Updated name */
                                                value={newAppointment.apptDateTime} /* Updated value */
                                                onChange={handleFormChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group col-md-6">
                                            <label htmlFor="apptType">{t('manageAppointments.addForm.typeLabel')}</label>
                                            <select
                                                className="form-control"
                                                id="apptType"
                                                name="apptType"
                                                value={newAppointment.apptType}
                                                onChange={handleFormChange}
                                                required
                                            >
                                                {/* Keep internal value, translate the display text */}
                                                <option value="Nouvelle consultation">{t('manageAppointments.addForm.typeOptions.newConsultation')}</option>
                                                <option value="Séance de contrôle">{t('manageAppointments.addForm.typeOptions.followUp')}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-success" disabled={isLoading}>
                                        {isLoading ? t('manageAppointments.addForm.submitting') : t('manageAppointments.addForm.submitButton')}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    <table className="appointments-table">
                        <thead>
                            <tr>
                                <th>{t('manageAppointments.table.header.patient')}</th>
                                <th>{t('manageAppointments.table.header.date')}</th>
                                <th>{t('manageAppointments.table.header.type')}</th>
                                <th>{t('manageAppointments.table.header.status')}</th>
                                {/* Conditionally render Action header */}
                                {showActionColumn && <th>{t('manageAppointments.table.header.action')}</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAppointments.length > 0 ? (
                                filteredAppointments.map((appt) => (
                                    <tr key={appt.idAppointment}>
                                        {/* Adjust according to your Patient object structure */}
                                        <td>{appt.patient?.firstName || t('common.notAvailable')} {appt.patient?.lastName || ''}</td>
                                        {/* Use new formatter and correct field name, pass 't' */}
                                        <td>{formatLocalDateTime(appt.apptDateTime, t)}</td>
                                        {/* Translate apptType and apptState for display */}
                                        <td>{t(`manageAppointments.appointmentType.${appt.apptType?.toLowerCase().replace(/ /g, '')}`, appt.apptType)}</td>
                                        <td>{t(`manageAppointments.appointmentState.${appt.apptState?.toLowerCase().replace(/ /g, '')}`, appt.apptState)}</td>
                                        {/* Conditionally render Action cell */}
                                        {showActionColumn && (
                                            <td>
                                                {filterState === 'en attente' && (
                                                    <>
                                                        <button onClick={() => handleAccept(appt.idAppointment)} className="btn btn-success btn-sm">{t('manageAppointments.buttons.accept')}</button>
                                                        {/* Updated button to open modal */}
                                                        <button onClick={() => openRefuseModal(appt.idAppointment)} className="btn btn-danger btn-sm">{t('manageAppointments.buttons.refusePropose')}</button>
                                                    </>
                                                )}
                                                {/* Check if Doctor and filter is 'accepté' */}
                                                {filterState === 'accepté' && isDoctor && (
                                                     <button onClick={() => handleMarkAsDone(appt.idAppointment)} className="btn btn-info btn-sm">{t('manageAppointments.buttons.startConsultation')}</button>
                                                )}
                                                {/* Assistant sees nothing in this cell when filter is 'accepté' */}
                                                {filterState === 'accepté' && !isDoctor && (
                                                     <span></span> // Empty span for non-doctors when accepted
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    {/* Adjust colspan based on whether Action column is visible */}
                                    <td colSpan={showActionColumn ? 5 : 4}>
                                        {searchTerm ? t('manageAppointments.table.noResultsSearch') : t('manageAppointments.table.noResultsCriteria')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Refusal Modal */}
                    {showRefuseModal && (
                         // Apply theme to modal backdrop and content
                        <div className={`modal-backdrop ${theme}`}>
                            <div className="modal-dialog">
                                <div className={`modal-content ${theme}`}>
                                    <div className="modal-header">
                                        <h5 className="modal-title">{t('manageAppointments.modal.refuse.title')}</h5>
                                        <button type="button" className="close" onClick={closeRefuseModal}>
                                            <span>&times;</span>
                                        </button>
                                    </div>
                                    <div className="modal-body">
                                        <p>{t('manageAppointments.modal.refuse.appointmentIdLabel', { refusalTargetId })}</p>
                                        <div className="form-group">
                                            <label htmlFor="proposedDateTime">{t('manageAppointments.modal.refuse.newDateTimeLabel')}</label>
                                            <input
                                                type="datetime-local"
                                                id="proposedDateTime"
                                                value={proposedDateTime}
                                                onChange={(e) => setProposedDateTime(e.target.value)}
                                                required
                                                className="form-control"
                                            />
                                        </div>
                                        {/* Display action message inside modal if needed */}
                                        {actionMessage && <p className={actionMessage.includes('Error') || actionMessage.includes('Failed') || actionMessage.includes('Erreur') || actionMessage.includes('Échec') || actionMessage.includes('❌') || actionMessage.includes('⚠️') ? 'error-message' : 'success-message'}>{actionMessage}</p>}
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={closeRefuseModal}>{t('common.cancel')}</button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleRefuseSubmit}
                                            disabled={isLoading || !proposedDateTime} // Disable if loading or no date selected
                                        >
                                            {isLoading ? t('manageAppointments.modal.refuse.sending') : t('manageAppointments.modal.refuse.confirmButton')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* End Refusal Modal */}
                </>
            )}
        </div>
    );
};

export default ManageAppointments;
