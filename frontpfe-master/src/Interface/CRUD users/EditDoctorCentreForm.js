import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getToken, clearUserData, isTokenExpired, getUserData } from '../../utils/auth'; // Import getUserData
// Assuming similar styling needs, import a relevant CSS file or create a new one
import './EditDoctorCentreForm.css'; // Import the specific CSS

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const EditDoctorCentreForm = () => {
    const { id } = useParams(); // Get the doctor ID from the URL
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [doctorData, setDoctorData] = useState({
        firstName: '',
        lastName: '',
        birthDate: '', // Store as YYYY-MM-DD string
        tel: '',
        address: '',
        // gender: '', // Removed gender
        speciality: ''
        // Add other relevant fields if needed, but avoid sensitive ones like email, password, role
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('editDoctorCentreForm.alerts.sessionExpired')); // Add translation
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


    // --- Fetch Doctor Data ---
    useEffect(() => {
        // Token check is now handled in the dedicated effect above
        const token = getToken(); // Still need token for the request
        if (!token) {
             // Should have been caught by the other effect, but double-check
             performLogout();
             return;
        }

        setLoading(true);
        // Fetch the specific doctor centre data using the ID
        // NOTE: We need an endpoint to get a SINGLE DoctorCentreDexamen by ID.
        // Assuming GET /api/doctor-centre-examen/{id} exists (or needs to be added)
        // For now, we'll fetch the list and filter, but a direct fetch is better.
        // Let's assume a direct fetch endpoint for now:
        const fetchUrl = `http://localhost:6952/api/doctor-centre-examen/${id}`; // Needs backend endpoint

        axios.get(fetchUrl, { headers: { Authorization: `Bearer ${token}` } })
            .then(response => {
                const data = response.data;
                // Format birthDate for the input field (YYYY-MM-DD)
                const formattedBirthDate = data.birthDate ? data.birthDate.split('T')[0] : '';
                setDoctorData({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    birthDate: formattedBirthDate,
                    tel: data.tel || '',
                    address: data.address || '',
                    // gender: data.gender || '', // Removed gender
                    speciality: data.speciality || ''
                });
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching doctor centre data:", err);
                let errorMsg = t('editDoctorCentreForm.errors.fetchFailed');
                if (err.response) {
                    // Server responded with a status code outside 2xx range
                    console.error("Error response data:", err.response.data);
                    console.error("Error response status:", err.response.status);
                    console.error("Error response headers:", err.response.headers);
                    errorMsg += ` (Status: ${err.response.status})`;
                    if (err.response.status === 401 || err.response.status === 403) {
                        performLogout(); // Logout on auth errors
                    }
                } else if (err.request) {
                    // Request was made but no response received
                    console.error("Error request:", err.request);
                    errorMsg += " - No response from server.";
                } else {
                    // Something else happened in setting up the request
                    console.error('Error message:', err.message);
                    errorMsg += ` - ${err.message}`;
                }
                setError(errorMsg);
                setLoading(false);
            });

    }, [id, performLogout, t]); // Include dependencies

    // --- Handle Input Change ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setDoctorData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    // --- Handle Form Submit ---
    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const token = getToken();

        if (!token || isTokenExpired(token)) {
            performLogout();
            return;
        }

        // Prepare data for PUT request (only include fields being updated)
        const updateData = { ...doctorData };
        // Ensure birthDate is in the correct format if provided, otherwise null/undefined
        updateData.birthDate = updateData.birthDate || null;

        const updateUrl = `http://localhost:6952/api/doctor-centre-examen/${id}`;

        axios.put(updateUrl, updateData, { headers: { Authorization: `Bearer ${token}` } })
            .then(() => {
                alert(t('editDoctorCentreForm.alerts.updateSuccess')); // Add translation
                setLoading(false);
                // Conditional redirect based on role
                const { user } = getUserData(); // Get current user data
                if (user && user.role === 'DOCTOR_CENTRE_EXAMEN') {
                    navigate('/dashboard'); // Redirect doctor centre to dashboard
                } else {
                    navigate('/users'); // Redirect admin (or others) to user list
                }
            })
            .catch(err => {
                console.error("Error updating doctor centre:", err);
                setError(t('editDoctorCentreForm.errors.updateFailed') + (err.response?.data?.message ? `: ${err.response.data.message}` : '')); // Add translation
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    performLogout();
                }
                setLoading(false);
            });
    };

    return (
        <div className="edit-user-container container mt-4"> {/* Use container class from CSS */}
            <h2>{t('editDoctorCentreForm.title')}</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            {loading && !doctorData.firstName && <p>{t('editDoctorCentreForm.loading')}</p>} {/* Show loading only initially */}
  
            <form onSubmit={handleSubmit} noValidate>
                {/* Row 1: First Name, Last Name */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="firstName" className="form-label required">{t('editDoctorCentreForm.labels.firstName')}</label>
                        <input
                            type="text"
                            className="form-control" // Add 'is-invalid' based on validation state if needed
                            id="firstName"
                            name="firstName"
                            value={doctorData.firstName}
                            onChange={handleChange}
                            required
                        />
                        {/* Add invalid-feedback div if implementing validation */}
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="lastName" className="form-label required">{t('editDoctorCentreForm.labels.lastName')}</label>
                        <input
                            type="text"
                            className="form-control" // Add 'is-invalid' based on validation state if needed
                            id="lastName"
                            name="lastName"
                            value={doctorData.lastName}
                            onChange={handleChange}
                            required
                        />
                        {/* Add invalid-feedback div if implementing validation */}
                    </div>
                </div>
  
                {/* Row 2: Birth Date, Telephone */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="birthDate" className="form-label">{t('editDoctorCentreForm.labels.birthDate')}</label>
                        <input
                            type="date"
                            className="form-control" // Add 'is-invalid' based on validation state if needed
                            id="birthDate"
                            name="birthDate"
                            value={doctorData.birthDate}
                            onChange={handleChange}
                        />
                        {/* Add invalid-feedback div if implementing validation */}
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="tel" className="form-label">{t('editDoctorCentreForm.labels.tel')}</label>
                        <input
                            type="tel"
                            className="form-control" // Add 'is-invalid' based on validation state if needed
                            id="tel"
                            name="tel"
                            value={doctorData.tel}
                            onChange={handleChange}
                        />
                        {/* Add invalid-feedback div if implementing validation */}
                    </div>
                </div>
  
                {/* Row 3: Address, Speciality */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="address" className="form-label">{t('editDoctorCentreForm.labels.address')}</label>
                        <input
                            type="text"
                            className="form-control" // Add 'is-invalid' based on validation state if needed
                            id="address"
                            name="address"
                            value={doctorData.address}
                            onChange={handleChange}
                        />
                        {/* Add invalid-feedback div if implementing validation */}
                    </div>
                     <div className="col-md-6">
                        <label htmlFor="speciality" className="form-label">{t('editDoctorCentreForm.labels.speciality')}</label>
                        <input
                            type="text"
                            className="form-control" // Add 'is-invalid' based on validation state if needed
                            id="speciality"
                            name="speciality"
                            value={doctorData.speciality}
                            onChange={handleChange}
                        />
                        {/* Add invalid-feedback div if implementing validation */}
                    </div>
                </div>
  
                {/* Row 4: Submit/Cancel Buttons */}
                <div className="row g-3">
                    <div className="col-12 text-center">
                        <button type="submit" className="btn btn-primary btn-lg me-2" disabled={loading}>
                            {loading ? t('editDoctorCentreForm.buttons.updating') : t('editDoctorCentreForm.buttons.update')}
                        </button>
                        <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/users-management')} disabled={loading}>
                            {t('editDoctorCentreForm.buttons.cancel')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default EditDoctorCentreForm;
