import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { getToken, clearUserData, isTokenExpired } from '../../utils/auth'; // Assuming auth utils are relevant
import './EditCabinetForm.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const EditCabinetForm = () => {
    const { t, i18n, ready } = useTranslation(); // Get i18n instance and ready flag
    const { id } = useParams(); // Get cabinet ID from URL parameter
    const navigate = useNavigate();
    const [cabinetData, setCabinetData] = useState({
        name: '',
        address: '',
        tel: '',
        fax: '',
        taxNumber: ''
    });
    const [initialData, setInitialData] = useState({}); // Store initial data
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({}); // Use object for errors
    const [isSubmitting, setIsSubmitting] = useState(false);

     // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('editCabinet.alerts.authRequiredFetch')); // Use a generic auth required message
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


    useEffect(() => {
        const fetchCabinet = async () => {
            setLoading(true);
            setErrors({}); // Clear previous errors
            const token = getToken();
            if (!token) {
                setErrors({ fetch: t('editCabinet.alerts.authRequiredFetch') });
                setLoading(false);
                performLogout();
                return;
            }

            try {
                const response = await axios.get(`http://localhost:6952/cabinets/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const fetchedData = {
                    name: response.data.name || '',
                    address: response.data.address || '',
                    tel: response.data.tel || '',
                    fax: response.data.fax || '',
                    taxNumber: response.data.taxNumber || ''
                };
                setCabinetData(fetchedData);
                setInitialData(fetchedData); // Store initial data
            } catch (err) {
                console.error("Error fetching cabinet:", err);
                 if (err.response) {
                    if (err.response.status === 404) {
                        setErrors({ fetch: t('editCabinet.alerts.notFound', { id }) });
                    } else if (err.response.status === 401 || err.response.status === 403) {
                        setErrors({ fetch: t('editCabinet.alerts.permissionDeniedView') });
                        performLogout();
                    } else {
                        setErrors({ fetch: t('editCabinet.alerts.fetchError', { message: err.response.data?.message || err.response.statusText }) });
                    }
                } else {
                    setErrors({ fetch: t('editCabinet.alerts.networkError') });
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCabinet();
        } else {
            setErrors({ fetch: t('editCabinet.alerts.missingId') });
            setLoading(false);
        }
    }, [id, performLogout]); // Add performLogout dependency

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
        if (!cabinetData.name) newErrors.name = t('editCabinet.validation.nameRequired');
        if (!cabinetData.address) newErrors.address = t('editCabinet.validation.addressRequired');
        if (cabinetData.tel && !/^\+?\d[\d\s-]*$/.test(cabinetData.tel)) {
             newErrors.tel = t('editCabinet.validation.invalidPhone');
        }
         if (cabinetData.fax && !/^\+?\d[\d\s-]*$/.test(cabinetData.fax)) {
             newErrors.fax = t('editCabinet.validation.invalidFax');
        }
        setErrors(newErrors); // Set errors based on current validation
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return; // Validate before submit

        const token = getToken();
        if (!token) {
            setErrors({ submit: t('editCabinet.alerts.authRequiredModify') });
            performLogout();
            return;
        }

        // Prepare only changed fields
        const updatePayload = {};
         Object.keys(cabinetData).forEach((key) => {
            if (cabinetData[key] !== initialData[key]) {
                 // Handle empty optional fields correctly
                if ((key === 'tel' || key === 'fax' || key === 'taxNumber') && cabinetData[key] === '' && (initialData[key] === null || initialData[key] === '')) {
                    // Don't send if it was empty and remains empty
                } else {
                    updatePayload[key] = cabinetData[key];
                }
            }
        });

        if (Object.keys(updatePayload).length === 0) {
            alert(t('editCabinet.alerts.noChanges'));
            return;
        }

        setIsSubmitting(true);
        setErrors({}); // Clear previous submit errors

        try {
            const response = await axios.put(`http://localhost:6952/cabinets/${id}`, updatePayload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200) {
                alert(t('editCabinet.alerts.success'));
                navigate('/manage-cabinets'); // Navigate back after successful update
            } else {
                throw new Error(`Unexpected server response: ${response.status}`);
            }
        } catch (err) {
            console.error("Error updating cabinet:", err);
            let errorMsg = t('editCabinet.alerts.updateError');
            if (err.response) {
                 if (err.response.status === 401 || err.response.status === 403) {
                    errorMsg = t('editCabinet.alerts.permissionDeniedModify');
                    performLogout();
                } else if (err.response.status === 404) {
                    errorMsg = t('editCabinet.alerts.notFoundMaybeDeleted');
                } else if (err.response.status === 409) {
                    errorMsg = err.response.data?.message || t('editCabinet.alerts.conflict');
                } else if (err.response.status === 400) {
                     errorMsg = t('editCabinet.alerts.validationError', { message: err.response.data || 'Invalid data.' });
                } else {
                    errorMsg = `${t('editCabinet.alerts.serverError')} (${err.response.status}): ${err.response.data?.message || err.response.statusText}`;
                }
            } else if (err.request) {
                errorMsg = t('editCabinet.alerts.networkError');
            }
            setErrors({ submit: errorMsg }); // Set submit error
        } finally {
            setIsSubmitting(false);
        }
    };

    // Debug logs moved below

    // Show loading message if translations aren't ready OR if fetching data
    if (!ready || (loading && !Object.keys(initialData).length)) {
        // Use a generic loading message if t function isn't ready yet
        return <div className="text-center p-4">{ready ? t('editCabinet.loadingMessage') : 'Loading...'}</div>;
    }

    if (errors.fetch) {
         return <div className="alert alert-danger m-4">{errors.fetch}</div>;
    }

    // Removed debug logs

    return (
        // Use Bootstrap container and classes
        <div className="edit-cabinet-container container mt-4">
            {/* Removed debug log */}
            <h2>{t('editCabinet.title', { id })}</h2>
            {errors.submit && <div className="alert alert-danger">{errors.submit}</div>}
            <form onSubmit={handleSubmit} noValidate>
                 {/* Row 1: Name, Address */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="cabinet-name" className="form-label required">{t('editCabinet.labels.name')}</label>
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
                        <label htmlFor="cabinet-address" className="form-label required">{t('editCabinet.labels.address')}</label>
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
                        <label htmlFor="cabinet-tel" className="form-label">{t('editCabinet.labels.telephone')}</label>
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
                        <label htmlFor="cabinet-fax" className="form-label">{t('editCabinet.labels.fax')}</label>
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
                    <div className="col-md-6">
                        <label htmlFor="cabinet-taxNumber" className="form-label">{t('editCabinet.labels.taxNumber')}</label>
                        <input
                            type="text"
                            id="cabinet-taxNumber"
                             name="taxNumber"
                             value={cabinetData.taxNumber}
                             onChange={handleChange}
                             className={`form-control ${errors.taxNumber ? 'is-invalid' : ''}`}
                         />
                         {/* No feedback needed for optional field */}
                    </div>
                 </div>

                 {/* Row 4: Buttons */}
                 <div className="row g-3">
                    <div className="col-12 d-flex justify-content-center gap-3"> {/* Center buttons with gap */}
                        <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                            {isSubmitting ? t('editCabinet.buttons.saving') : t('editCabinet.buttons.saveChanges')}
                        </button>
                        <button type="button" onClick={() => navigate('/manage-cabinets')} className="btn btn-secondary btn-lg" disabled={isSubmitting}>
                            {t('editCabinet.buttons.cancel')}
                        </button>
                    </div>
                 </div>
            </form>
        </div>
    );
};

export default EditCabinetForm;
