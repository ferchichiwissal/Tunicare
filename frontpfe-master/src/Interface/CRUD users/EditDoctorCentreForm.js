import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getToken, clearUserData, isTokenExpired, getUserData, storeUserData } from '../../utils/auth'; // Import getUserData and storeUserData
import { useAuth } from "../../context/AuthContext"; // Import useAuth
// Default avatar path will be handled directly in the src attribute
// Assuming similar styling needs, import a relevant CSS file or create a new one
import './EditDoctorCentreForm.css'; // Import the specific CSS

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const EditDoctorCentreForm = () => {
    const { id } = useParams(); // Get the doctor ID from the URL
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { refreshUser } = useAuth(); // Get refreshUser function from context
    const [doctorData, setDoctorData] = useState({ // Renamed from formData for clarity if needed, but keeping doctorData as per original file structure
        firstName: '',
        lastName: '',
        birthDate: '', // Store as YYYY-MM-DD string
        tel: '',
        address: '',
        gender: '', // Added gender back
        speciality: '',
        photoProfil: null, // Add state for profile picture data
        email: '' // Added email as it's usually part of user data
    });
    const [initialData, setInitialData] = useState({}); // Added initialData for comparison
    const [loading, setLoading] = useState(true); // Set initial loading to true
    const [error, setError] = useState(''); // General form error
    const [errors, setErrors] = useState({}); // Added state for field-specific errors
    const [success, setSuccess] = useState(''); // Added state for success messages
    const [selectedFile, setSelectedFile] = useState(null); // State for the selected image file
    const [previewUrl, setPreviewUrl] = useState(null); // State for the image preview URL
    const [uploadError, setUploadError] = useState(null); // State for picture upload error
    // const [isUploading, setIsUploading] = useState(false); // Not currently used, can use 'loading' state
    const [uploadSuccess, setUploadSuccess] = useState(null); // State for picture upload success

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
            // Revoke preview URL on component unmount
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [performLogout, previewUrl]); // Add previewUrl dependency


    // --- Fetch User (Doctor) Data ---
     useEffect(() => {
        const token = getToken();
        // Token check is handled by the other effect, but re-check here before fetch
        if (!token || isTokenExpired(token)) {
            performLogout();
            return;
        }

        const fetchDoctorData = async () => {
            setLoading(true);
            setError('');
            try {
                // Using the correct user endpoint
                const response = await axios.get(`http://localhost:6952/Users/allid/${id}`, {
                     headers: { Authorization: `Bearer ${token}` },
                });
                const data = response.data;
                const fetchedData = {
                    firstName: data.firstName || "",
                    lastName: data.lastName || "",
                    email: data.email || "",
                    address: data.address || "",
                    birthDate: data.birthDate ? data.birthDate.split("T")[0] : "",
                    tel: data.tel || "",
                    gender: data.gender || "", // Fetching gender
                    photoProfil: data.photoProfil, // Base64 string or null
                    speciality: data.speciality || "", // Assuming speciality is part of user data
                };
                setDoctorData(fetchedData);
                setInitialData(fetchedData); // Store initial data for comparison

                if (previewUrl) { // Clean up old preview URL if any
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setSelectedFile(null);
                }
            } catch (err) {
                console.error("Error fetching doctor data:", err);
                 let errorMsg = t('editDoctorCentreForm.errors.fetchFailed'); // Use specific key or reuse generic
                 if (err.response) {
                    errorMsg += ` (Status: ${err.response.status})`;
                    if (err.response.status === 401 || err.response.status === 403) {
                        performLogout(); // Logout on auth errors
                        return; // Stop execution after logout
                    } else if (err.response.status === 404) {
                         errorMsg = t('editUserForm.errors.fetch.notFound', { id }); // Reuse generic key
                    }
                } else if (err.request) {
                    errorMsg += " - No response from server.";
                } else {
                    errorMsg += ` - ${err.message}`;
                }
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDoctorData();
        } else {
            setError(t('editUserForm.errors.fetch.missingId')); // Reuse generic key
            setLoading(false);
        }

        // Cleanup preview URL on unmount - Moved from token check effect
        // return () => {
        //     if (previewUrl) {
        //         URL.revokeObjectURL(previewUrl);
        //     }
        // };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, performLogout, t]); // Dependencies for fetching data

    // --- Handle Input Change --- (Using useCallback)
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setDoctorData(prevData => ({
            ...prevData,
            [name]: value
        }));
         // Clear general error on input change
        if (error) setError('');
        // Optionally clear field-specific errors if using validation state
    }, [error]); // Depend on error to clear it

    // --- Handle File Selection ---
    const handleFileChange = useCallback((event) => {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                setUploadError(t('editDoctorCentreForm.errors.upload.invalidType'));
                setSelectedFile(null);
                setPreviewUrl(null);
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setUploadError(t('editDoctorCentreForm.errors.upload.sizeLimit'));
                setSelectedFile(null);
                setPreviewUrl(null);
                return;
            }
            setSelectedFile(file);
            setUploadError(null);
            setUploadSuccess(null);
            const newPreviewUrl = URL.createObjectURL(file);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(newPreviewUrl);
        } else {
            setSelectedFile(null);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(null);
            setUploadError(null);
        }
    }, [previewUrl, t]);

    // --- Handle Form Submission --- (Using async/await and correct endpoint)
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Optional: Add validation logic here if needed (e.g., validateForm())

        setLoading(true); // Use setLoading instead of isSubmitting if preferred
        setError('');
        setSuccess(''); // Clear previous success message
        const token = getToken();

        if (!token || isTokenExpired(token)) {
            performLogout();
            return;
        }

        const submissionFormData = new FormData();
        let hasChanges = false;

        // Append changed text fields by comparing with initialData
        Object.keys(doctorData).forEach((key) => {
             // Exclude photoProfil from direct comparison/append
            if (key !== 'photoProfil' && doctorData[key] !== initialData[key]) {
                 // Handle null values appropriately, send empty string for null dates if required by backend
                submissionFormData.append(key, doctorData[key] === null ? '' : doctorData[key]);
                hasChanges = true;
            }
        });


        // Append the new profile picture if selected
        if (selectedFile) {
            submissionFormData.append('photoProfilFile', selectedFile); // Use a distinct name
            hasChanges = true; // Selecting a file is considered a change
        }

        // If no fields changed and no new file selected, inform the user
        if (!hasChanges) {
             alert(t('editUserForm.alerts.noChanges')); // Reusing translation key
             setLoading(false);
             return;
        }

        // Using the correct user update endpoint
        const updateUrl = `http://localhost:6952/Users/update/${id}`;

        try {
            await axios.put(updateUrl, submissionFormData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                }
            });

            alert(t('editDoctorCentreForm.alerts.updateSuccess')); // Use specific key or reuse
            
            // --- Begin: Update local user data ---
            try {
                const updatedUserResponse = await axios.get(`http://localhost:6952/Users/allid/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const updatedUser = updatedUserResponse.data;

                const existingAuthData = getUserData(); // From utils/auth.js

                const newAuthData = {
                    accessToken: existingAuthData.accessToken,
                    refreshToken: existingAuthData.refreshToken,
                    roles: existingAuthData.roles,
                    user: updatedUser,
                };

                const rememberPreference = localStorage.getItem('rememberPreference') === 'true' || sessionStorage.getItem('rememberPreference') === 'true';
                storeUserData(newAuthData, rememberPreference); // From utils/auth.js
                refreshUser(); // Explicitly refresh the context state

                // Update the form's own state
                setDoctorData(prev => ({
                    ...prev,
                    photoProfil: updatedUser.photoProfil,
                    // Update other fields if necessary
                }));
                setInitialData(updatedUser);


            } catch (fetchError) {
                console.error("Error fetching updated user data after update:", fetchError);
            }
            // --- End: Update local user data ---

            setLoading(false);
            setSelectedFile(null);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(null);
            setUploadError(null); // Clear upload error on success
            setUploadSuccess(true); // Indicate success for file upload part if any

            // Navigate after successful update and data refresh
             const { user } = getUserData(); // Re-fetch user data to get the role for navigation
             if (user && user.role === 'DOCTOR_CENTRE_EXAMEN') {
                 navigate('/dashboard');
             } else {
                 navigate('/users'); // Or '/manage-centres' or other relevant page
             }

        } catch (err) {
            console.error("Error updating doctor:", err);
            let errorMsg = t('editDoctorCentreForm.errors.updateFailed'); // Use specific key or reuse
            if (err.response) {
                 errorMsg += ` (Status: ${err.response.status})`;
                 if (err.response.status === 401 || err.response.status === 403) {
                     performLogout();
                     return; // Stop execution after logout
                 } else {
                     errorMsg = err.response.data?.message || errorMsg; // Use backend message if available
                 }
            } else if (err.request) {
                errorMsg += " - No response from server.";
            } else {
                errorMsg += ` - ${err.message}`;
            }
            setError(errorMsg);
            setLoading(false);
        }
    };

    // --- Handle Picture Upload --- (This function is no longer needed as a separate action)
    // const handlePictureUpload = async () => { ... };

    return (
        <div className="edit-user-container container mt-4"> {/* Use container class from CSS */}
            <h2>{t('editDoctorCentreForm.title')}</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            {loading && !doctorData.firstName && <p>{t('editDoctorCentreForm.loading')}</p>} {/* Show loading only initially */}
  
            <form onSubmit={handleSubmit} noValidate>
                 {/* Profile Picture Section */}
                 <div className="row mb-4 align-items-center">
                    <div className="col-md-3 text-center">
                        <label className="form-label">{t('editUserForm.labels.profilePicture')}</label> {/* Reusing translation */}
                        <img
                            src={(() => {
                                // Added console logs for debugging
                                console.log("EditDoctorCentreForm - Checking avatar source:");
                                console.log("EditDoctorCentreForm - doctorData.photoProfil:", doctorData.photoProfil);
                                console.log("EditDoctorCentreForm - doctorData.gender:", doctorData.gender);
                                console.log("EditDoctorCentreForm - previewUrl:", previewUrl);

                                // Using relative paths and correct double spaces
                                const femaleAvatar = '/images/avatar  femme.jpg';
                                const maleAvatar = '/images/avatar  homme.jpg';
                                let defaultAvatar = maleAvatar; // Default to male

                                // Check gender to select female avatar if applicable
                                if (doctorData.gender) {
                                    const genderLower = doctorData.gender.toLowerCase();
                                    if (genderLower === 'femme' || genderLower === 'female') {
                                        defaultAvatar = femaleAvatar;
                                    }
                                }
                                console.log("EditDoctorCentreForm - Selected defaultAvatar:", defaultAvatar);

                                // Return preview, existing photo (base64), or default avatar
                                const finalSrc = previewUrl || (doctorData.photoProfil ? `data:image/jpeg;base64,${doctorData.photoProfil}` : defaultAvatar);
                                console.log("EditDoctorCentreForm - Final image src:", finalSrc);
                                return finalSrc;
                            })()}
                            alt={t('editUserForm.labels.profilePicture')}
                            className="img-thumbnail rounded-circle mb-2 current-profile-pic" // Reusing class
                            style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                        />
                    </div>
                    <div className="col-md-9">
                        <label htmlFor="edit-photoProfil" className="form-label">{t('editUserForm.labels.changePicture')}</label> {/* Reusing translation */}
                        <input
                            type="file"
                            id="edit-photoProfil"
                            // name="photoProfil" // Name might not be needed if using FormData directly
                            accept="image/*"
                            onChange={handleFileChange}
                            className="form-control mb-2"
                            disabled={loading} // Disable if main form is submitting/loading
                        />
                        {uploadError && <div className="alert alert-danger mt-2 p-2">{uploadError}</div>}
                    </div>
                </div>
                <hr /> {/* Separator */}

                {/* Row 1: First Name, Last Name */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="firstName" className="form-label required">{t('editUserForm.labels.firstName')}</label> {/* Reusing translation */}
                        <input
                            type="text"
                            className={`form-control ${errors.firstName ? 'is-invalid' : ''}`} // Added validation class
                            id="firstName"
                            name="firstName"
                            value={doctorData.firstName}
                            onChange={handleChange}
                            required
                            disabled={loading} // Disable during loading/submit
                        />
                        <div className="invalid-feedback">{errors.firstName}</div> {/* Added feedback div */}
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="lastName" className="form-label required">{t('editUserForm.labels.lastName')}</label> {/* Reusing translation */}
                        <input
                            type="text"
                            className={`form-control ${errors.lastName ? 'is-invalid' : ''}`} // Added validation class
                            id="lastName"
                            name="lastName"
                            value={doctorData.lastName}
                            onChange={handleChange}
                            required
                            disabled={loading} // Disable during loading/submit
                        />
                        <div className="invalid-feedback">{errors.lastName}</div> {/* Added feedback div */}
                    </div>
                </div>
  
                {/* Row 2: Birth Date, Telephone */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="birthDate" className="form-label required">{t('editUserForm.labels.birthDate')}</label> {/* Reusing translation */}
                        <input
                            type="date"
                            className={`form-control ${errors.birthDate ? 'is-invalid' : ''}`} // Added validation class
                            id="birthDate"
                            name="birthDate"
                            value={doctorData.birthDate}
                            onChange={handleChange}
                            required // Assuming birth date is required
                            disabled={loading} // Disable during loading/submit
                        />
                        <div className="invalid-feedback">{errors.birthDate}</div> {/* Added feedback div */}
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="tel" className="form-label">{t('editUserForm.labels.telephone')}</label> {/* Reusing translation */}
                        <input
                            type="tel" // Changed type to tel
                            className={`form-control ${errors.tel ? 'is-invalid' : ''}`} // Added validation class
                            id="tel"
                            name="tel"
                            value={doctorData.tel}
                            onChange={handleChange}
                            disabled={loading} // Disable during loading/submit
                        />
                        <div className="invalid-feedback">{errors.tel}</div> {/* Added feedback div */}
                    </div>
                </div>
  
                {/* Row 3: Address, Speciality */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="address" className="form-label">{t('editUserForm.labels.address')}</label> {/* Reusing translation */}
                        <input
                            type="text"
                            className="form-control" // No validation class needed for optional field?
                            id="address"
                            name="address"
                            value={doctorData.address}
                            onChange={handleChange}
                            disabled={loading} // Disable during loading/submit
                        />
                    </div>
                     <div className="col-md-6">
                        <label htmlFor="speciality" className="form-label">{t('editDoctorCentreForm.labels.speciality')}</label> {/* Assuming this key exists */}
                        <input
                            type="text"
                            className={`form-control ${errors.speciality ? 'is-invalid' : ''}`} // Added validation class
                            id="speciality"
                            name="speciality"
                            value={doctorData.speciality}
                            onChange={handleChange}
                            disabled={loading} // Disable during loading/submit
                        />
                         <div className="invalid-feedback">{errors.speciality}</div> {/* Added feedback div */}
                    </div>
                </div>
  
                {/* Row 4: Submit/Cancel Buttons */}
                <div className="row g-3">
                    <div className="col-12 text-center">
                        <button type="submit" className="btn btn-primary btn-lg me-2" disabled={loading}>
                            {loading ? t('editUserForm.buttons.updating') : t('editDoctorCentreForm.buttons.update')} {/* Use correct key */}
                        </button>
                        <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/users')} disabled={loading}> {/* Navigate back to user list or manage-centres */}
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default EditDoctorCentreForm;
