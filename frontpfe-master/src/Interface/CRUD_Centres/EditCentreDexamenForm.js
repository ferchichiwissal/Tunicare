import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import apiClient from '../../utils/apiClient'; // Import the shared apiClient
import { useNavigate, useParams } from 'react-router-dom';
import './EditCentreDexamenForm.css'; // Import the CSS file
import { useTranslation } from 'react-i18next';

const EditCentreDexamenForm = () => { // Renamed from EditCabinetForm for clarity if this is for a centre doctor
    const { t } = useTranslation();
    const { id } = useParams(); // User ID of the doctor
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        birthDate: "",
        tel: "",
        address: "",
        speciality: "", // Added speciality
        photoProfil: null,
        gender: "",
        email: "", // Assuming email might be needed or part of user data
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

    // --- Fetch User (Doctor) Data ---
    useEffect(() => {
        const fetchDoctorData = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await apiClient.get(`/Users/allid/${id}`); // API endpoint for user details
                const doctorData = {
                    firstName: response.data.firstName || "",
                    lastName: response.data.lastName || "",
                    email: response.data.email || "",
                    address: response.data.address || "",
                    birthDate: response.data.birthDate ? response.data.birthDate.split("T")[0] : "",
                    tel: response.data.tel || "",
                    gender: response.data.gender || "",
                    photoProfil: response.data.photoProfil, // Base64 string or null
                    speciality: response.data.speciality || "", // Assuming speciality is part of user data
                };
                setFormData(doctorData);
                setInitialData(doctorData);

                if (previewUrl) { // Clean up old preview URL if any
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setSelectedFile(null);
                }
            } catch (err) {
                console.error("Error fetching doctor data:", err);
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    setError(t('editUserForm.errors.fetch.permissionDenied')); // Reusing translation
                } else if (err.response && err.response.status === 404) {
                    setError(t('editUserForm.errors.fetch.notFound', { id })); // Reusing translation
                } else {
                    setError(t('editUserForm.errors.fetch.generic')); // Reusing translation
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDoctorData();
        } else {
            setError(t('editUserForm.errors.fetch.missingId')); // Reusing translation
            setLoading(false);
        }

        return () => { // Cleanup preview URL on unmount
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

    // --- Form Validation (Example) ---
    const validateForm = () => {
        const newErrors = {};
        if (!formData.firstName) newErrors.firstName = t('editUserForm.errors.validation.firstNameRequired');
        if (!formData.lastName) newErrors.lastName = t('editUserForm.errors.validation.lastNameRequired');
        // Add other validations as needed (e.g., birthDate, speciality)
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

        const submissionFormData = new FormData();
        let hasChanges = false;

        // Append changed text fields
        Object.keys(formData).forEach((key) => {
            if (key !== 'photoProfil' && formData[key] !== initialData[key]) {
                submissionFormData.append(key, formData[key] === null ? '' : formData[key]);
                hasChanges = true;
            }
        });

        if (selectedFile) {
            submissionFormData.append('photoProfilFile', selectedFile);
            hasChanges = true;
        }

        if (!hasChanges) {
            alert(t('editUserForm.alerts.noChanges'));
            setIsSubmitting(false);
            return;
        }

        try {
            // Using the same update endpoint as EditUserForm.js
            await apiClient.put(`/Users/update/${id}`, submissionFormData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSuccess(t('editUserForm.alerts.updateSuccess')); // Reusing translation
            setSelectedFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setUploadError(null);
            // Fetch data again to reflect changes if staying on page, or navigate
            // For now, let's assume navigation after success
            setTimeout(() => {
                navigate('/manage-centres'); // Or appropriate page for doctors/centres
            }, 2000);
        } catch (err) {
            console.error("Error updating doctor:", err);
            if (err.response) {
                if (err.response.status === 401 || err.response.status === 403) {
                    setError(t('editUserForm.errors.submit.permissionDenied'));
                } else if (err.response.status === 404) {
                    setError(t('editUserForm.errors.submit.notFound', { id }));
                } else {
                    setError(err.response.data?.message || t('editUserForm.errors.submit.generic'));
                }
            } else {
                setError(t('editUserForm.errors.submit.networkError'));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <p className="loading-message">{t('loading')}...</p>;

    return (
        // Class name can be 'edit-user-container' or a new specific one like 'edit-doctor-centre-container'
        <div className="edit-user-container container mt-4">
            <h2>{t('editDoctorCentreForm.title', { id })}</h2> {/* Create new translation key */}
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit} noValidate>
                {/* Profile Picture Section */}
                <div className="row mb-4 align-items-center">
                    <div className="col-md-3 text-center">
                        <label className="form-label">{t('editUserForm.labels.profilePicture')}</label>
                        <img
                            src={(() => {
                                console.log("EditCentreDexamenForm - Checking avatar source:");
                                console.log("EditCentreDexamenForm - formData.photoProfil:", formData.photoProfil);
                                console.log("EditCentreDexamenForm - formData.gender:", formData.gender);
                                console.log("EditCentreDexamenForm - previewUrl:", previewUrl);

                                const femaleAvatar = '/images/avatar  femme.jpg';
                                const maleAvatar = '/images/avatar  homme.jpg';
                                let defaultAvatar = maleAvatar;
                                if (formData.gender) {
                                    const genderLower = formData.gender.toLowerCase();
                                    if (genderLower === 'femme' || genderLower === 'female') {
                                        defaultAvatar = femaleAvatar;
                                    }
                                }
                                console.log("EditCentreDexamenForm - Selected defaultAvatar:", defaultAvatar);
                                const finalSrc = previewUrl || (formData.photoProfil ? `data:image/jpeg;base64,${formData.photoProfil}` : defaultAvatar);
                                console.log("EditCentreDexamenForm - Final image src:", finalSrc);
                                return finalSrc;
                            })()}
                            alt={t('editUserForm.labels.profilePicture')}
                            className="img-thumbnail rounded-circle mb-2 current-profile-pic"
                            style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                        />
                    </div>
                    <div className="col-md-9">
                        <label htmlFor="edit-photoProfil" className="form-label">{t('editUserForm.labels.changePicture')}</label>
                        <input
                            type="file"
                            id="edit-photoProfil"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="form-control mb-2"
                            disabled={isSubmitting}
                        />
                        {uploadError && <div className="alert alert-danger mt-2 p-2">{uploadError}</div>}
                    </div>
                </div>
                <hr />

                {/* Doctor Information Fields based on screenshot */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="firstName" className="form-label required">{t('editUserForm.labels.firstName')}</label>
                        <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange}
                               className={`form-control ${errors.firstName ? 'is-invalid' : ''}`} required disabled={isSubmitting} />
                        <div className="invalid-feedback">{errors.firstName}</div>
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="lastName" className="form-label required">{t('editUserForm.labels.lastName')}</label>
                        <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange}
                               className={`form-control ${errors.lastName ? 'is-invalid' : ''}`} required disabled={isSubmitting} />
                        <div className="invalid-feedback">{errors.lastName}</div>
                    </div>
                </div>

                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="birthDate" className="form-label required">{t('editUserForm.labels.birthDate')}</label>
                        <input type="date" id="birthDate" name="birthDate" value={formData.birthDate} onChange={handleInputChange}
                               className={`form-control ${errors.birthDate ? 'is-invalid' : ''}`} required disabled={isSubmitting} />
                        <div className="invalid-feedback">{errors.birthDate}</div>
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="tel" className="form-label">{t('editUserForm.labels.telephone')}</label>
                        <input type="text" id="tel" name="tel" value={formData.tel} onChange={handleInputChange}
                               className={`form-control ${errors.tel ? 'is-invalid' : ''}`} disabled={isSubmitting} />
                        <div className="invalid-feedback">{errors.tel}</div>
                    </div>
                </div>

                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="address" className="form-label">{t('editUserForm.labels.address')}</label>
                        <input type="text" id="address" name="address" value={formData.address} onChange={handleInputChange}
                               className="form-control" disabled={isSubmitting} />
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="speciality" className="form-label">{t('editDoctorCentreForm.labels.speciality')}</label> {/* New translation key */}
                        <input type="text" id="speciality" name="speciality" value={formData.speciality} onChange={handleInputChange}
                               className="form-control" disabled={isSubmitting} />
                    </div>
                </div>
                 {/* Hidden or display-only email if needed */}
                 {/* <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="email" className="form-label">{t('editUserForm.labels.email')}</label>
                        <input type="email" id="email" name="email" value={formData.email}
                               className="form-control" disabled />
                    </div>
                </div> */}


                <div className="row g-3">
                    <div className="col-12 text-center">
                        <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                            {isSubmitting ? t('editUserForm.buttons.updating') : t('editDoctorCentreForm.buttons.updateDoctor')} {/* New translation key */}
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
