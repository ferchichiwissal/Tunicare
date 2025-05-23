import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import apiClient from '../../utils/apiClient'; // Import the shared apiClient
import { useNavigate, useParams } from 'react-router-dom';
import './EditCentreDexamenForm.css'; // Import the CSS file
import { useTranslation } from 'react-i18next';
import { clearUserData, getToken, isTokenExpired } from '../../utils/auth'; // Import auth utils

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const EditCentreDexamenForm = () => { // Renamed from EditCabinetForm for clarity if this is for a centre doctor
    const { t } = useTranslation();
    const { id } = useParams(); // User ID of the doctor
    const [formData, setFormData] = useState({
        nom: "",
        adresse: "",
        tel: "",
        // Ajoutez d'autres champs si nécessaire pour un centre d'examen
    });
    const [initialData, setInitialData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(''); // For general fetch/submit errors
    const [errors, setErrors] = useState({}); // For field-specific validation errors
    const [success, setSuccess] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('editCentreForm.alerts.sessionExpired', 'Session expired. Please log in again.')); // Add translation key
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


    // --- Fetch Centre Data ---
    useEffect(() => {
        const fetchCentreData = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await apiClient.get(`/api/centres-examen/${id}`); // API endpoint for centre details
                const centreData = {
                    nom: response.data.name || "",
                    adresse: response.data.adress || "",
                    tel: response.data.tel || "",
                    // Ajoutez d'autres champs si nécessaire
                };
                setFormData(centreData);
                setInitialData(centreData);

                // Pas de gestion de photo de profil pour un centre d'examen ici
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setSelectedFile(null);
                }

            } catch (err) {
                console.error("Error fetching centre data:", err);
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    setError(t('editCentreForm.errors.fetch.permissionDenied')); // Nouvelle traduction
                } else if (err.response && err.response.status === 404) {
                    setError(t('editCentreForm.errors.fetch.notFound', { id })); // Nouvelle traduction
                } else {
                    setError(t('editCentreForm.errors.fetch.generic')); // Nouvelle traduction
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCentreData();
        } else {
            setError(t('editCentreForm.errors.fetch.missingId')); // Nouvelle traduction
            setLoading(false);
        }

        return () => { // Cleanup preview URL on unmount (still relevant if photoProfil was ever used)
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, t]); // previewUrl removed from deps

    // --- Handle Input Change ---
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData((prevFormData) => ({
            ...prevFormData,
            [name]: value,
        }));
        if (errors[name]) { // Clear specific field error
            setErrors(prevErrors => ({ ...prevErrors, [name]: undefined }));
        }
        if (error) setError(''); // Clear general submit error
    }, [errors, error]);

    // --- Handle File Selection ---
    const handleFileChange = useCallback((event) => {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                setUploadError(t('editUserForm.errors.upload.invalidType'));
                setSelectedFile(null); setPreviewUrl(null); return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setUploadError(t('editUserForm.errors.upload.sizeLimit'));
                setSelectedFile(null); setPreviewUrl(null); return;
            }
            setSelectedFile(file);
            setUploadError(null);
            const newPreviewUrl = URL.createObjectURL(file);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(newPreviewUrl);
        } else {
            setSelectedFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setUploadError(null);
        }
    }, [previewUrl, t]);

    // --- Form Validation ---
    const validateForm = () => {
        const newErrors = {};
        if (!formData.nom) newErrors.nom = t('editCentreForm.errors.validation.nomRequired'); // Nouvelle traduction
        // Ajoutez d'autres validations si nécessaire (tel, adresse)
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // --- Handle Form Submission ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setError('');
        setSuccess('');
        setIsSubmitting(true);

        // Prepare data with backend expected field names
        const dataToSend = {
            name: formData.nom,
            adress: formData.adresse,
            tel: formData.tel,
            // Include other fields if they exist in formData and map them correctly
        };

        try {

            // API endpoint for updating centre details
            // Send the mapped data object
            await apiClient.put(`/api/centres-examen/${id}`, dataToSend); // Sending mapped data
            setSuccess(t('editCentreForm.alerts.updateSuccess')); // Nouvelle traduction

            // Navigate after success
            setTimeout(() => {
                navigate('/manage-centres'); // Naviguer vers la liste des centres
            }, 2000);
        } catch (err) {
            console.error("Error updating centre:", err);
            if (err.response) {
                if (err.response.status === 401 || err.response.status === 403) {
                    setError(t('editCentreForm.errors.submit.permissionDenied')); // Nouvelle traduction
                } else if (err.response.status === 404) {
                    setError(t('editCentreForm.errors.submit.notFound', { id })); // Nouvelle traduction
                } else {
                    setError(err.response.data?.message || t('editCentreForm.errors.submit.generic')); // Nouvelle traduction
                }
            } else {
                setError(t('editCentreForm.errors.submit.networkError')); // Nouvelle traduction
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <p className="loading-message">{t('loading')}</p>;

    return (
        // Class name can be 'edit-user-container' or a new specific one like 'edit-doctor-centre-container'
        <div className="edit-user-container container mt-4">
            <h2>{t('editCentreForm.title')}</h2> {/* Nouvelle traduction */}
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit} noValidate>
                {/* Centre Information Fields */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="nom" className="form-label required">{t('editCentreForm.labels.nom')}</label>
                        <input type="text" id="nom" name="nom" value={formData.nom} onChange={handleInputChange}
                               className={`form-control ${errors.nom ? 'is-invalid' : ''}`} required disabled={isSubmitting} />
                        <div className="invalid-feedback">{errors.nom}</div>
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="tel" className="form-label">{t('editCentreForm.labels.telephone')}</label>
                        <input type="text" id="tel" name="tel" value={formData.tel} onChange={handleInputChange}
                               className={`form-control ${errors.tel ? 'is-invalid' : ''}`} disabled={isSubmitting} />
                        <div className="invalid-feedback">{errors.tel}</div>
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="adresse" className="form-label">{t('editCentreForm.labels.address')}</label>
                        <input type="text" id="adresse" name="adresse" value={formData.adresse} onChange={handleInputChange}
                               className="form-control" disabled={isSubmitting} />
                    </div>
                </div>

                {/* Ajoutez d'autres champs spécifiques au centre d'examen ici si nécessaire */}


                <div className="row g-3">
                    <div className="col-12 text-center">
                        <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                            {isSubmitting ? t('editCentreForm.buttons.updating') : t('editCentreForm.buttons.updateCentre')}
                        </button>
                        <button type="button" className="btn btn-secondary ms-2 btn-lg" onClick={() => navigate('/manage-centres')} disabled={isSubmitting}>
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default EditCentreDexamenForm;
