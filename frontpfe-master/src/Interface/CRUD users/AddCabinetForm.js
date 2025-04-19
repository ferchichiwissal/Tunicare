import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { getToken, clearUserData, isTokenExpired } from '../../utils/auth';
import './AddCabinetForm.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const AddCabinetForm = () => {
    const { t } = useTranslation(); // Initialize translation function
    const [cabinetData, setCabinetData] = useState({
        name: '',
        address: '',
        fax: '',
        tel: '',
        taxNumber: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('addCabinet.alerts.authRequired')); // Use a generic auth required message
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCabinetData(prevState => ({
            ...prevState,
            [name]: value
        }));
         // Clear specific field error on change
        if (errors[name]) {
            setErrors(prevErrors => ({ ...prevErrors, [name]: undefined }));
        }
        // Clear general submit error on any change
        if (errors.submit) {
            setErrors(prevErrors => ({ ...prevErrors, submit: undefined }));
        }
    };

     // --- Form Validation ---
    const validateForm = () => {
        const newErrors = {};
        if (!cabinetData.name) newErrors.name = t('addCabinet.validation.nameRequired');
        if (!cabinetData.address) newErrors.address = t('addCabinet.validation.addressRequired');
        // Optional: Add validation for tel/fax/taxNumber format if needed
        if (cabinetData.tel && !/^\+?\d[\d\s-]*$/.test(cabinetData.tel)) {
             newErrors.tel = t('addCabinet.validation.invalidPhone');
        }
         if (cabinetData.fax && !/^\+?\d[\d\s-]*$/.test(cabinetData.fax)) {
             newErrors.fax = t('addCabinet.validation.invalidFax');
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        // setError(''); // Clear previous general errors if using that state
        setErrors({}); // Clear previous field errors
        if (!validateForm()) {
            return; // Stop submission if validation fails
        }

        setLoading(true);
        const token = getToken();
        if (!token) {
            setErrors({ submit: t('addCabinet.alerts.authRequired') });
            setLoading(false);
            performLogout();
            return;
        }

        try {
            const response = await axios.post('http://localhost:6952/cabinets', cabinetData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 201) {
                alert(t('addCabinet.alerts.success'));
                setCabinetData({ name: '', address: '', fax: '', tel: '', taxNumber: '' }); // Reset form
                setErrors({}); // Clear errors on success
            } else {
                // This case might not be reached if backend throws errors for non-201 success
                throw new Error(`Unexpected server response: ${response.status}`);
            }
        } catch (err) {
            console.error("Error adding cabinet:", err);
            let errorMsg = t('addCabinet.alerts.genericError');
            if (err.response) {
                if (err.response.status === 409) {
                    errorMsg = err.response.data?.message || t('addCabinet.alerts.conflict');
                    setErrors({ submit: errorMsg }); // Set specific submit error
                } else if (err.response.status === 401 || err.response.status === 403) {
                    errorMsg = t('addCabinet.alerts.permissionDenied');
                    setErrors({ submit: errorMsg });
                    performLogout(); // Log out on auth errors
                } else {
                    errorMsg = `${t('addCabinet.alerts.serverError')} (${err.response.status}): ${err.response.data?.message || err.response.statusText}`;
                     setErrors({ submit: errorMsg });
                }
            } else if (err.request) {
                errorMsg = t('addCabinet.alerts.noResponse');
                 setErrors({ submit: errorMsg });
            } else {
                 setErrors({ submit: errorMsg }); // Generic error
            }
            // Set submit error instead of using alert directly
            setErrors({ submit: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        // Use Bootstrap container and classes
        <div className="add-cabinet-container container mt-4">
            <h2>{t('addCabinet.title')}</h2>
            {errors.submit && <div className="alert alert-danger">{errors.submit}</div>} {/* Display submit error */}
            <form onSubmit={handleSubmit} noValidate>
                {/* Row 1: Name, Address */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="cabinet-name" className="form-label required">{t('addCabinet.labels.name')}</label>
                        <input
                            type="text"
                            id="cabinet-name"
                             name="name"
                             value={cabinetData.name}
                             onChange={handleChange}
                             className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                             required
                         />
                         <div className="invalid-feedback">{errors.name}</div>
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="cabinet-address" className="form-label required">{t('addCabinet.labels.address')}</label>
                        <input
                            type="text"
                            id="cabinet-address"
                             name="address"
                             value={cabinetData.address}
                             onChange={handleChange}
                             className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                             required
                         />
                         <div className="invalid-feedback">{errors.address}</div>
                    </div>
                </div>

                 {/* Row 2: Telephone, Fax */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="cabinet-tel" className="form-label">{t('addCabinet.labels.telephone')}</label>
                        <input
                            type="text"
                            id="cabinet-tel"
                             name="tel"
                             value={cabinetData.tel}
                             onChange={handleChange}
                              className={`form-control ${errors.tel ? 'is-invalid' : ''}`}
                         />
                         <div className="invalid-feedback">{errors.tel}</div>
                    </div>
                     <div className="col-md-6">
                        <label htmlFor="cabinet-fax" className="form-label">{t('addCabinet.labels.fax')}</label>
                        <input
                            type="text"
                            id="cabinet-fax"
                             name="fax"
                             value={cabinetData.fax}
                             onChange={handleChange}
                              className={`form-control ${errors.fax ? 'is-invalid' : ''}`}
                         />
                         <div className="invalid-feedback">{errors.fax}</div>
                    </div>
                </div>

                 {/* Row 3: Tax Number */}
                 <div className="row g-3 mb-3">
                    <div className="col-md-6"> {/* Or col-12 if it should span full width */}
                        <label htmlFor="cabinet-taxNumber" className="form-label">{t('addCabinet.labels.taxNumber')}</label>
                        <input
                            type="text"
                            id="cabinet-taxNumber"
                             name="taxNumber"
                             value={cabinetData.taxNumber}
                             onChange={handleChange}
                             className={`form-control ${errors.taxNumber ? 'is-invalid' : ''}`}
                         />
                         {/* No feedback needed for optional field unless format validation added */}
                    </div>
                 </div>

                 {/* Row 4: Submit Button */}
                 <div className="row g-3">
                    <div className="col-12 text-center">
                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                            {loading ? t('addCabinet.buttons.adding') : t('addCabinet.buttons.addCabinet')}
                        </button>
                    </div>
                 </div>
            </form>
        </div>
    );
};

export default AddCabinetForm;
