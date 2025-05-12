import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Import useTranslation
import { jwtDecode } from "jwt-decode";
// Import storeUserData and getUserData as well
import { getToken, clearUserData, isTokenExpired, storeUserData, getUserData } from "../../utils/auth";
import { useAuth } from "../../context/AuthContext"; // Import useAuth
import './EditUserForm.css'; // Import the CSS file
// Default avatar path will be handled directly in the src attribute

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const EditUserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(); // Get translation function
  const { refreshUser } = useAuth(); // Get refreshUser function from context

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "", // Keep email, might be display-only or backend handles changes
    address: "",
    birthDate: "",
    tel: "",
    gender: "", // Added gender to formData
    // Excluded non-editable fields: role, isActive, password
    photoProfil: null, // Add state for profile picture data (initially null)
  });

  const [initialData, setInitialData] = useState({}); // Store initial data for comparison
  const [errors, setErrors] = useState({}); // Use object for field-specific and submit errors
  const [loading, setLoading] = useState(true); // Start loading true for initial fetch
  const [isSubmitting, setIsSubmitting] = useState(false); // For update submission
  const [selectedFile, setSelectedFile] = useState(null); // State for the selected image file
  const [previewUrl, setPreviewUrl] = useState(null); // State for the image preview URL
  const [isUploading, setIsUploading] = useState(false); // State for picture upload status
  const [uploadError, setUploadError] = useState(null); // State for picture upload error
  const [uploadSuccess, setUploadSuccess] = useState(null); // State for picture upload success message

  // --- Logout Function ---
  const performLogout = useCallback(() => {
    clearUserData();
    alert(t('editUserForm.alerts.sessionExpired'));
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
      const decodedToken = jwtDecode(token);
      const expiryTime = decodedToken.exp * 1000;
      const currentTime = Date.now();
      const timeToExpire = expiryTime - currentTime;
      if (timeToExpire > 0) {
        expiryTimer = setTimeout(performLogout, timeToExpire);
      } else {
        performLogout();
        return;
      }
    } catch (error) {
      console.error("Erreur lors du décodage du token :", error);
      performLogout();
      return;
    }
    let inactivityTimer;
    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(performLogout, INACTIVITY_TIMEOUT);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      clearTimeout(expiryTimer);
      clearTimeout(inactivityTimer);
      events.forEach((event) => window.removeEventListener(event, resetInactivityTimer));
      // Revoke preview URL on component unmount
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [performLogout, previewUrl]); // Add previewUrl dependency

  // --- Fetch User Data ---
  useEffect(() => {
    if (!id) {
        setErrors({ fetch: t('editUserForm.errors.fetch.missingId') });
        setLoading(false);
        return;
    };

    const fetchUserData = async () => {
      setLoading(true);
      setErrors({}); // Clear previous errors
      try {
        const token = getToken();
        if (!token) throw new Error(t('editUserForm.errors.fetch.noToken')); // Although this is internal, good practice

        const response = await axios.get(`http://localhost:6952/Users/allid/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = {
          firstName: response.data.firstName || "",
          lastName: response.data.lastName || "",
          email: response.data.email || "", // Include email
          address: response.data.address || "",
          birthDate: response.data.birthDate ? response.data.birthDate.split("T")[0] : "",
          tel: response.data.tel || "",
          gender: response.data.gender || "", // Fetch and store gender
          photoProfil: response.data.photoProfil, // Store photo data (assuming it's base64 or null)
        };
        setFormData(userData);
        setInitialData(userData); // Store initial data
        // Clear previous preview if fetching new data
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setSelectedFile(null);
        }

      } catch (error) {
        console.error("Error fetching user data:", error);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            setErrors({ fetch: t('editUserForm.errors.fetch.permissionDenied') });
            performLogout(); // Logout on auth error
        } else if (error.response && error.response.status === 404) {
             setErrors({ fetch: t('editUserForm.errors.fetch.notFound', { id }) });
        } else {
            setErrors({ fetch: t('editUserForm.errors.fetch.generic') });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, performLogout]); // Add performLogout dependency, disable exhaustive-deps for previewUrl reset logic

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
     // Clear specific field error on change
     if (errors[name]) {
        setErrors(prevErrors => ({ ...prevErrors, [name]: undefined }));
    }
    // Clear general submit error on any change
    if (errors.submit) {
        setErrors(prevErrors => ({ ...prevErrors, submit: undefined }));
    }
  }, [errors]); // Depend on errors to clear them

  // --- Handle File Selection ---
  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      // Basic client-side validation
      if (!file.type.startsWith("image/")) {
        setUploadError(t('editUserForm.errors.upload.invalidType'));
        setSelectedFile(null);
        setPreviewUrl(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setUploadError(t('editUserForm.errors.upload.sizeLimit'));
        setSelectedFile(null);
        setPreviewUrl(null);
        return;
      }

      setSelectedFile(file);
      setUploadError(null); // Clear previous errors
      setUploadSuccess(null); // Clear previous success message

      // Create and set preview URL
      const newPreviewUrl = URL.createObjectURL(file);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl); // Clean up old preview URL
      }
      setPreviewUrl(newPreviewUrl);
    } else {
      // No file selected or selection cancelled
      setSelectedFile(null);
       if (previewUrl) {
         URL.revokeObjectURL(previewUrl);
       }
      setPreviewUrl(null);
      setUploadError(null);
    }
  }, [previewUrl, t]); // Add previewUrl and t to dependencies

  // --- Form Validation ---
   const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = t('editUserForm.errors.validation.firstNameRequired');
    if (!formData.lastName) newErrors.lastName = t('editUserForm.errors.validation.lastNameRequired');
    // Basic email format check (assuming email is not editable, but good practice)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = t('editUserForm.errors.validation.emailInvalid');
    }
     if (!formData.birthDate) newErrors.birthDate = t('editUserForm.errors.validation.birthDateRequired');
     // Phone validation: only if filled, must be digits
    if (formData.tel && !/^\d+$/.test(formData.tel)) {
        newErrors.tel = t('editUserForm.errors.validation.phoneDigitsOnly');
    }
    setErrors(newErrors); // Use setErrors
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return; // Validate before submitting

    const token = getToken();
    if (!token) {
        setErrors({ submit: t('editUserForm.errors.submit.authRequired') });
        performLogout();
        return;
    }

    // Prepare only changed fields to send
    const fieldsToUpdate = {};
    Object.keys(formData).forEach((key) => {
      // Include field if it has changed from initial state
      if (formData[key] !== initialData[key]) {
        // Special handling for potentially empty optional fields that were initially null/empty
        if ( (key === 'tel' || key === 'address') && formData[key] === '' && (initialData[key] === null || initialData[key] === '')) {
           // Don't send empty string if it was already null/empty
        } else {
           fieldsToUpdate[key] = formData[key];
        }
      }
    });

     // If no fields changed and no new file selected, inform the user and don't submit
    if (Object.keys(fieldsToUpdate).length === 0 && !selectedFile) {
        alert(t('editUserForm.alerts.noChanges'));
        return;
    }

    // Email is now updatable, so the delete line is removed.

    setIsSubmitting(true);
    setErrors({}); // Clear previous submit errors

    const submissionFormData = new FormData();

    // Append text fields that have changed
    Object.keys(fieldsToUpdate).forEach(key => {
        // Ensure photoProfil (which is now just for display from initial fetch) isn't sent as a text field
        if (key !== 'photoProfil') {
            submissionFormData.append(key, fieldsToUpdate[key]);
        }
    });

    // Append the new profile picture if selected
    if (selectedFile) {
        submissionFormData.append('photoProfilFile', selectedFile); // Use a distinct name like 'photoProfilFile'
    }

    try {
      // The backend endpoint /Users/update/{id} needs to be able to handle multipart/form-data
      await axios.put(`http://localhost:6952/Users/update/${id}`, submissionFormData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data', // Changed Content-Type
        },
      });
      alert(t('editUserForm.alerts.updateSuccess'));

      // --- Begin: Update local user data ---
      try {
        const updatedUserResponse = await axios.get(`http://localhost:6952/Users/allid/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const updatedUser = updatedUserResponse.data;

        // Get existing auth data to preserve tokens and roles
        const existingAuthData = getUserData(); // From utils/auth.js

        // Prepare data for storeUserData
        const newAuthData = {
          accessToken: existingAuthData.accessToken,
          refreshToken: existingAuthData.refreshToken,
          roles: existingAuthData.roles,
          user: updatedUser, // The newly fetched user object
        };

        // Determine the 'remember' preference
        const rememberPreference = localStorage.getItem('rememberPreference') === 'true' || sessionStorage.getItem('rememberPreference') === 'true';
        storeUserData(newAuthData, rememberPreference); // From utils/auth.js
        refreshUser(); // Explicitly refresh the context state

        // Optionally, if using AuthContext, update it here
        // authContext.login(newAuthData, rememberPreference); // Example if you have a login method in context

        // Update the form's own state if needed, though navigation often makes this redundant
        setFormData(prev => ({
            ...prev,
            photoProfil: updatedUser.photoProfil, // Update photo in form if displayed directly
            // Update other fields if they are derived or need refresh
        }));
        setInitialData(updatedUser); // Update initial data to prevent "no changes" on immediate re-edit


      } catch (fetchError) {
        console.error("Error fetching updated user data after update:", fetchError);
        // Not a fatal error for the update itself, but log it.
        // User might see stale data in other parts of the app until next login/refresh.
      }
      // --- End: Update local user data ---


      // Clear selection and preview after successful combined upload
      setSelectedFile(null);
      if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setUploadSuccess(null); // Clear any previous upload-specific success
      setUploadError(null); // Clear any previous upload-specific error

      navigate("/dashboard"); // Or navigate back to user list/profile
    } catch (error) {
      console.error("Error updating user:", error);
       if (error.response) {
            if (error.response.status === 401 || error.response.status === 403) {
                setErrors({ submit: t('editUserForm.errors.submit.permissionDenied') });
                performLogout();
            } else if (error.response.status === 404) {
                setErrors({ submit: t('editUserForm.errors.submit.notFound', { id }) });
            } else {
                 // Keep backend message if available, otherwise use generic key
                 setErrors({ submit: error.response.data?.message || t('editUserForm.errors.submit.generic') });
            }
       } else {
            setErrors({ submit: t('editUserForm.errors.submit.networkError') });
       }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handle Picture Upload --- (This function is no longer needed as a separate action)
  // const handlePictureUpload = async () => { ... };

  if (loading && !Object.keys(initialData).length) { // Show loading only on initial fetch
    return <div className="text-center p-4">{t('editUserForm.loading')}</div>;
  }

  if (errors.fetch) {
    return <div className="alert alert-danger m-4">{errors.fetch}</div>;
  }

  return (
    <div className="edit-user-container container mt-4"> {/* Added Bootstrap container class */}
      <h2>{t('editUserForm.title', { id })}</h2>
      {errors.submit && <div className="alert alert-danger">{errors.submit}</div>}

      <form onSubmit={handleSubmit} noValidate>
         {/* Profile Picture Section */}
         <div className="row mb-4 align-items-center">
            <div className="col-md-3 text-center">
                <label className="form-label">{t('editUserForm.labels.profilePicture')}</label>
                <img
                    // Display preview if available, otherwise current photo (base64), otherwise default
                    src={(() => {
                        console.log("Checking avatar source:"); // Log start
                        console.log("formData.photoProfil:", formData.photoProfil); // Log photoProfil
                        console.log("formData.gender:", formData.gender); // Log gender
                        console.log("previewUrl:", previewUrl); // Log previewUrl

                        // Define avatar paths using relative paths from the root
                        const femaleAvatar = '/images/avatar  femme.jpg';
                        const maleAvatar = '/images/avatar  homme.jpg';

                        // Determine default avatar based on gender, defaulting to male
                        let defaultAvatar = maleAvatar;
                        if (formData.gender) {
                            const genderLower = formData.gender.toLowerCase();
                            if (genderLower === 'femme' || genderLower === 'female') {
                                defaultAvatar = femaleAvatar;
                            }
                        }
                        console.log("Selected defaultAvatar:", defaultAvatar); // Log selected default

                        // Return the appropriate source URL
                        const finalSrc = previewUrl || (formData.photoProfil ? `data:image/jpeg;base64,${formData.photoProfil}` : defaultAvatar);
                        console.log("Final image src:", finalSrc); // Log final src
                        return finalSrc;
                    })()}
                    alt={t('editUserForm.labels.profilePicture')}
                    className="img-thumbnail rounded-circle mb-2 current-profile-pic" // Added class
                    style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                />
            </div>
            <div className="col-md-9">
                 <label htmlFor="edit-photoProfil" className="form-label">{t('editUserForm.labels.changePicture')}</label>
                <input
                    type="file"
                    id="edit-photoProfil"
                    name="photoProfil"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="form-control mb-2"
                    disabled={isSubmitting} // Disable if main form is submitting
                />
                 {uploadError && <div className="alert alert-danger mt-2 p-2">{uploadError}</div>}
                 {/* uploadSuccess message is now part of the main form's success */}
            </div>
        </div>
        <hr /> {/* Separator */}

        {/* Row 1: First Name, Last Name */}
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label htmlFor="edit-firstName" className="form-label required">{t('editUserForm.labels.firstName')}</label>
            <input
              type="text"
              id="edit-firstName"
               name="firstName"
               value={formData.firstName}
               onChange={handleInputChange}
               className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
               required
             />
            <div className="invalid-feedback">{errors.firstName}</div>
          </div>
          <div className="col-md-6">
            <label htmlFor="edit-lastName" className="form-label required">{t('editUserForm.labels.lastName')}</label>
            <input
              type="text"
              id="edit-lastName"
               name="lastName"
               value={formData.lastName}
               onChange={handleInputChange}
               className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
               required
             />
            <div className="invalid-feedback">{errors.lastName}</div>
          </div>
        </div>

        {/* Row 2: Email (Display Only), Birth Date */}
         <div className="row g-3 mb-3">
            <div className="col-md-6">
                <label htmlFor="edit-email" className="form-label">{t('editUserForm.labels.email')}</label>
                <input
                    type="email"
                    id="edit-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange} // Add onChange handler
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`} // Add validation class
                />
                <div className="invalid-feedback">{errors.email}</div> {/* Add validation feedback */}
            </div>
            <div className="col-md-6">
                <label htmlFor="edit-birthDate" className="form-label required">{t('editUserForm.labels.birthDate')}</label>
                <input
                    type="date"
                    id="edit-birthDate"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className={`form-control ${errors.birthDate ? 'is-invalid' : ''}`}
                    required
                />
                <div className="invalid-feedback">{errors.birthDate}</div>
            </div>
        </div>

        {/* Row 3: Telephone, Address */}
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label htmlFor="edit-tel" className="form-label">{t('editUserForm.labels.telephone')}</label>
            <input
              type="text"
              id="edit-tel"
               name="tel"
               value={formData.tel}
               onChange={handleInputChange}
               className={`form-control ${errors.tel ? 'is-invalid' : ''}`}
             />
             <div className="invalid-feedback">{errors.tel}</div>
          </div>
          <div className="col-md-6">
            <label htmlFor="edit-address" className="form-label">{t('editUserForm.labels.address')}</label>
            <input
              type="text"
              id="edit-address"
               name="address"
               value={formData.address}
               onChange={handleInputChange}
               className={`form-control ${errors.address ? 'is-invalid' : ''}`}
             />
             {/* No feedback needed for optional field */}
          </div>
        </div>

        {/* Row 4: Submit Button */}
        <div className="row g-3">
            <div className="col-12 text-center">
                 {/* Keep the main update button */}
                <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting || isUploading}>
                {isSubmitting ? t('editUserForm.buttons.updating') : t('editUserForm.buttons.updateUser')}
                </button>
            </div>
        </div>
      </form>
    </div>
  );
};

export default EditUserForm;
