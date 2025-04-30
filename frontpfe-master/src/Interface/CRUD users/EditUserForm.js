import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Import useTranslation
import { jwtDecode } from "jwt-decode";
import { getToken, clearUserData, isTokenExpired } from "../../utils/auth"; // Import auth utils
import './EditUserForm.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const EditUserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(); // Get translation function

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "", // Keep email, might be display-only or backend handles changes
    address: "",
    birthDate: "",
    tel: "",
    // Excluded non-editable fields: role, isActive, password
  });

  const [initialData, setInitialData] = useState({}); // Store initial data for comparison
  const [errors, setErrors] = useState({}); // Use object for field-specific and submit errors
  const [loading, setLoading] = useState(true); // Start loading true for initial fetch
  const [isSubmitting, setIsSubmitting] = useState(false); // For update submission

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
    };
  }, [performLogout]);

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
        };
        setFormData(userData);
        setInitialData(userData); // Store initial data

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
  }, [id, performLogout]); // Add performLogout dependency

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

     // If no fields changed, inform the user and don't submit
    if (Object.keys(fieldsToUpdate).length === 0) {
        alert(t('editUserForm.alerts.noChanges'));
        return;
    }

    // Email is now updatable, so the delete line is removed.

    setIsSubmitting(true);
    setErrors({}); // Clear previous submit errors

    try {
      await axios.put(`http://localhost:6952/Users/update/${id}`, fieldsToUpdate, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, // Ensure correct content type
      });
      alert(t('editUserForm.alerts.updateSuccess'));
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
                <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                {isSubmitting ? t('editUserForm.buttons.updating') : t('editUserForm.buttons.updateUser')}
                </button>
            </div>
        </div>
      </form>
    </div>
  );
};

export default EditUserForm;
