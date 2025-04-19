import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Import useTranslation
import axios from "axios";
import { getToken, getRoles, clearUserData, isTokenExpired, getUserData } from "../../utils/auth";
import './AddForm.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes (consistent)

const checkPasswordStrength = (password) => {
  // Password is optional here, only check if provided
  if (!password) return true; // Treat empty as valid for optional field
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!])[\w@#$%^&+=!]{8,}$/;
  return passwordRegex.test(password);
};

function AddForm() { // Renamed component for clarity
  const navigate = useNavigate();
  const { t } = useTranslation(); // Get translation function
  const [formData, setFormData] = useState({
    first_name: "",
    lastName: "",
    email: "",
    birthDate: "",
    password: "",
    confirmPassword: "",
    tel: "",
    address: "",
    photoProfil: null, // Keep null for file input
    gendre: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingExistence, setIsCheckingExistence] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [loggedInUserCabinetId, setLoggedInUserCabinetId] = useState(null);

  // --- Logout Function ---
  const performLogout = useCallback(() => {
    clearUserData();
    alert(t('addForm.alerts.sessionExpired'));
    navigate("/sign-in");
  }, [navigate]);

  // --- Token Expiry & Inactivity Checks (Combined for brevity) ---
   useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      performLogout();
      return; // Exit early if no valid token
    }

    // Set up expiry timer
    let expiryTimer;
    try {
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      if (decodedToken.cabinetId) {
          setLoggedInUserCabinetId(decodedToken.cabinetId);
      }
      const expiryTime = decodedToken.exp * 1000;
      const currentTime = Date.now();
      const timeToExpire = expiryTime - currentTime;
      if (timeToExpire > 0) {
        expiryTimer = setTimeout(performLogout, timeToExpire);
      } else {
        performLogout();
        return; // Exit if already expired
      }
    } catch (err) {
      console.error("Error decoding token for expiry check:", err);
      performLogout();
      return; // Exit on error
    }

    // Set up inactivity timer
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(performLogout, INACTIVITY_TIMEOUT);
    };
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    activityEvents.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer(); // Initial setup

    // Cleanup function
    return () => {
      clearTimeout(expiryTimer); // Clear expiry timer
      clearTimeout(inactivityTimer); // Clear inactivity timer
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [performLogout]); // Rerun if performLogout changes (due to navigate dependency)


  // Check user role on component mount
  useEffect(() => {
    const roles = getRoles();
    const isAdmin = roles.includes("ROLE_ADMIN");
    const isDoctorOrAssistant = roles.includes("ROLE_DOCTOR") || roles.includes("ROLE_ASSISTANT");

    if (isAdmin) {
      setUserRole("ADMIN");
    } else if (isDoctorOrAssistant) {
      setUserRole("DOCTOR_OR_ASSISTANT");
    } else {
      alert(t('addForm.alerts.permissionDeniedAccess'));
      performLogout();
    }
  }, [performLogout]); // Added performLogout dependency

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "password") {
      if (value && !checkPasswordStrength(value)) {
        setPasswordStrength(t('addForm.passwordStrength.weak'));
      } else if (value && checkPasswordStrength(value)) {
        setPasswordStrength(t('addForm.passwordStrength.strong'));
      } else {
        setPasswordStrength(""); // Clear strength if password empty
      }
    }
  };

   const handleFileChange = (e) => {
    setFormData({ ...formData, photoProfil: e.target.files[0] });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name) newErrors.first_name = t('addForm.errors.validation.firstNameRequired');
    if (!formData.lastName) newErrors.lastName = t('addForm.errors.validation.lastNameRequired');
    if (formData.email && !/^[^\s@]+@(gmail\.com|yahoo\.com)$/.test(formData.email)) {
        newErrors.email = t('addForm.errors.validation.emailInvalidDomain');
    }
    if (!formData.birthDate) newErrors.birthDate = t('addForm.errors.validation.birthDateRequired');
    if (formData.tel && !/^\d+$/.test(formData.tel)) {
        newErrors.tel = t('addForm.errors.validation.phoneDigitsOnly');
    }
    if (!formData.gendre) newErrors.gendre = t('addForm.errors.validation.genderRequired');
    // Password validation only if password is not empty
    if (formData.password && !checkPasswordStrength(formData.password)) {
      newErrors.password = t('addForm.errors.validation.passwordStrength');
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('addForm.errors.validation.passwordsMismatch');
    }
    if (!formData.password && formData.confirmPassword) {
        newErrors.confirmPassword = t('addForm.errors.validation.confirmPasswordNotEmpty');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const token = getToken();
    if (!token) {
      alert(t('addForm.alerts.sessionInvalid'));
      performLogout();
      return;
    }

    // --- Step 1: Check User Existence (only for Doctor/Assistant adding a patient) ---
    if (userRole === "DOCTOR_OR_ASSISTANT") {
      setIsCheckingExistence(true);
      setErrors({});
      if (!loggedInUserCabinetId) {
          setErrors({ general: t('addForm.errors.existenceCheck.noCabinet') });
          setIsCheckingExistence(false);
          performLogout();
          return;
      }
      try {
        const checkResponse = await axios.get("http://localhost:6952/Users/checkUserExists", {
          params: {
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.lastName,
            cabinetId: loggedInUserCabinetId
          },
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (checkResponse.data === true) {
          setErrors({ general: t('addForm.errors.existenceCheck.userExists') });
          setIsCheckingExistence(false);
          return;
        }
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          setErrors({ general: t('addForm.errors.existenceCheck.generic') });
          console.error("Existence check error:", error);
          setIsCheckingExistence(false);
          return;
        }
      } finally {
        setIsCheckingExistence(false);
      }
    }

    // --- Step 2: Proceed with Adding User ---
    setIsSubmitting(true);
    let apiUrl;
    if (userRole === "ADMIN") {
      apiUrl = "http://localhost:6952/Users/addadmin";
    } else if (userRole === "DOCTOR_OR_ASSISTANT") {
      apiUrl = "http://localhost:6952/Users/add";
    } else {
      alert(t('addForm.alerts.invalidRole'));
      setIsSubmitting(false);
      return;
    }

    const formDataToSend = new FormData();
     Object.keys(formData).forEach(key => {
        if (key !== 'photoProfil' && key !== 'confirmPassword') { // Exclude confirmPassword
            formDataToSend.append(key, formData[key]);
        }
    });
    if (formData.photoProfil) {
      formDataToSend.append("photoProfil", formData.photoProfil);
    }

    try {
      const response = await axios.post(apiUrl, formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        },
      });

      const successMessage = userRole === "ADMIN"
        ? t('addForm.alerts.adminAddSuccess')
        : t('addForm.alerts.patientAddSuccess');
      alert(successMessage);

      setFormData({
        first_name: "", lastName: "", email: "", birthDate: "",
        password: "", confirmPassword: "", tel: "", address: "",
        photoProfil: null, gendre: ""
      });
      setPasswordStrength("");
      setErrors({});
      navigate('/dashboard'); // Redirect after success

    } catch (error) {
      console.error("Error adding user:", error);
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          alert(t('addForm.alerts.permissionDeniedSubmit'));
          performLogout();
        } else {
          const backendMessage = error.response.data?.message ||
                               t('addForm.errors.submit.generic');
          setErrors({ general: backendMessage });
        }
      } else {
        setErrors({ general: t('addForm.errors.submit.networkError') });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Use registration-form class for consistency if styles are shared, or create AddForm specific styles
    <div className="add-form-container"> {/* Changed class name */}
      <h2 className="form-title">
        {userRole === "ADMIN" ? t('addForm.title.admin') : t('addForm.title.patient')}
      </h2>
      {errors.general && <div className="alert alert-danger">{errors.general}</div>}

      <form onSubmit={handleSubmit} className="needs-validation" noValidate>
          {/* Row 1: First Name, Last Name */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="add-first-name" className="form-label required">{t('addForm.labels.firstName')}</label>
              <input
                type="text"
                id="add-first-name"
                name="first_name"
                 value={formData.first_name}
                 onChange={handleChange}
                 className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                 required
               />
              <div className="invalid-feedback">{errors.first_name}</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="add-last-name" className="form-label required">{t('addForm.labels.lastName')}</label>
              <input
                type="text"
                id="add-last-name"
                name="lastName"
                 value={formData.lastName}
                 onChange={handleChange}
                 className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                 required
               />
              <div className="invalid-feedback">{errors.lastName}</div>
            </div>
          </div>

          {/* Row 2: Email, Birth Date */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="add-email" className="form-label">{t('addForm.labels.email')}</label>
              <input
                type="email"
                id="add-email"
                name="email"
                 value={formData.email}
                 onChange={handleChange}
                 className={`form-control ${errors.email ? 'is-invalid' : ''}`}
               />
              <div className="invalid-feedback">{errors.email}</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="add-birthDate" className="form-label required">{t('addForm.labels.birthDate')}</label>
              <input
                type="date"
                id="add-birthDate"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className={`form-control ${errors.birthDate ? 'is-invalid' : ''}`}
                required
              />
              <div className="invalid-feedback">{errors.birthDate}</div>
            </div>
          </div>

          {/* Row 3: Telephone, Address */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="add-tel" className="form-label">{t('addForm.labels.telephone')}</label>
              <input
                type="text"
                id="add-tel"
                name="tel"
                 value={formData.tel}
                 onChange={handleChange}
                 className={`form-control ${errors.tel ? 'is-invalid' : ''}`}
               />
              <div className="invalid-feedback">{errors.tel}</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="add-address" className="form-label">{t('addForm.labels.address')}</label>
              <input
                type="text"
                id="add-address"
                name="address"
                 value={formData.address}
                 onChange={handleChange}
                 className={`form-control ${errors.address ? 'is-invalid' : ''}`}
               />
            </div>
          </div>

          {/* Row 4: Gender, Photo */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="add-gender" className="form-label required">{t('addForm.labels.gender')}</label>
              <select
                id="add-gender"
                name="gendre"
                value={formData.gendre}
                onChange={handleChange}
                className={`form-select ${errors.gendre ? 'is-invalid' : ''}`}
                required
              >
                <option value="">{t('addForm.genderOptions.select')}</option>
                <option value="Male">{t('addForm.genderOptions.male')}</option>
                <option value="Female">{t('addForm.genderOptions.female')}</option>
                <option value="Other">{t('addForm.genderOptions.other')}</option>
              </select>
              <div className="invalid-feedback">{errors.gendre}</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="add-photo" className="form-label">{t('addForm.labels.photo')}</label>
              <input
                type="file"
                id="add-photo"
                name="photoProfil"
                onChange={handleFileChange}
                className={`form-control ${errors.photoProfil ? 'is-invalid' : ''}`}
                accept="image/*"
              />
            </div>
          </div>

          {/* Row 5: Password, Confirm Password */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="add-password" className="form-label">{t('addForm.labels.password')}</label>
              <input
                type="password"
                id="add-password"
                name="password"
                 value={formData.password}
                 onChange={handleChange}
                 className={`form-control ${errors.password ? 'is-invalid' : ''}`}
               />
              <div className="invalid-feedback">{errors.password}</div>
              {passwordStrength && (
                <div className={`form-text password-strength ${passwordStrength.toLowerCase()}`}>
                  {t('addForm.passwordStrength.label')}: {passwordStrength}
                </div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="add-confirmPassword" className="form-label">{t('addForm.labels.confirmPassword')}</label>
              <input
                type="password"
                id="add-confirmPassword"
                name="confirmPassword"
                 value={formData.confirmPassword}
                 onChange={handleChange}
                 className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                 // Required only if password has value
                 required={!!formData.password}
              />
              <div className="invalid-feedback">{errors.confirmPassword}</div>
            </div>
          </div>

          {/* Row 6: Submit Button */}
          <div className="row g-3">
             <div className="col-12 text-center">
                <button
                  type="submit"
                  disabled={isCheckingExistence || isSubmitting}
                  className={`btn btn-primary btn-lg ${(isSubmitting || isCheckingExistence) ? "disabled" : ""}`}
                >
                  {isCheckingExistence ? t('addForm.buttons.checking') : (isSubmitting ? t('addForm.buttons.processing') : t('addForm.buttons.submit'))}
                </button>
             </div>
          </div>
      </form>
    </div>
  );
}

export default AddForm; // Export AddForm
