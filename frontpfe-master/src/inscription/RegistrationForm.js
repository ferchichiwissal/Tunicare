import React, { useState, useRef, useContext } from "react";
import { useTranslation } from "react-i18next"; // Import useTranslation
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import ReCAPTCHA from "react-google-recaptcha";
import './registration.css'; // Keep custom styles for now
import ThemeContext from "../utils/ThemeContext"; // Import ThemeContext
import LanguageSelector from "../component/LanguageSelector"; // Import LanguageSelector
const checkPasswordStrength = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!])[\w@#$%^&+=!]{8,}$/;
  return passwordRegex.test(password);
};

function RegistrationForm() {
  const { t } = useTranslation(); // Initialize translation function
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cabinetIdParam = searchParams.get("cabinetId");
  const cabinetId = cabinetIdParam && !isNaN(cabinetIdParam) ? Number(cabinetIdParam) : null;
  const recaptchaRef = useRef(null);
  const { theme, toggleTheme } = useContext(ThemeContext); // Get theme context

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    birthDate: "",
    password: "",
    confirmPassword: "",
    tel: "",
    address: "",
    photoProfil: null,
    gendre: "",
  });

  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingExistence, setIsCheckingExistence] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value) ? "Strong" : "Weak");
    }
  };

   const handleFileChange = (e) => {
    setFormData({ ...formData, photoProfil: e.target.files[0] });
  };

  const handleCaptcha = (value) => {
    setCaptchaVerified(!!value);
  };

  const validateForm = () => {
    const newErrors = {};

    // TODO: Translate validation messages
    if (!cabinetId) {
      newErrors.cabinet = t('registration.invalidLinkMessage'); // Use key for invalid link
    }
    if (!formData.first_name) newErrors.first_name = t('validation.firstNameRequired'); // Example key
    if (!formData.last_name) newErrors.last_name = t('validation.lastNameRequired'); // Example key
    if (!formData.email) {
      newErrors.email = t('validation.emailRequired'); // Example key
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.emailInvalid'); // Example key
    }
    if (!formData.birthDate) newErrors.birthDate = t('validation.birthDateRequired'); // Example key
    if (formData.tel && !/^\d+$/.test(formData.tel)) {
        newErrors.tel = t('validation.phoneDigitsOnly'); // Example key
    }
    if (!formData.gendre) newErrors.gendre = t('validation.genderRequired'); // Example key
    if (!formData.password) newErrors.password = t('validation.passwordRequired'); // Example key
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t('validation.passwordsDoNotMatch'); // Example key
    if (!captchaVerified) newErrors.captcha = t('validation.captchaRequired'); // Example key

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = recaptchaRef.current.getValue();
    if (!token) {
      setErrors({ captcha: "Please complete the reCAPTCHA" });
      return;
    }

    if (validateForm()) {
      setIsCheckingExistence(true);
      setErrors({});

      try {
        const checkResponse = await axios.get("http://localhost:6952/Users/checkUserExists", {
          params: {
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            cabinetId: cabinetId
          }
        });
        if (checkResponse.data === true) {
           setErrors({ general: "A user with this email, first name, and last name already exists in this cabinet." });
           setIsCheckingExistence(false);
           return;
        }
      } catch (error) {
         if (error.response && error.response.status !== 404) {
            setErrors({ general: "Could not verify user existence. Please try again." });
            console.error("Existence check error:", error);
            setIsCheckingExistence(false);
            return;
         }
      } finally {
        setIsCheckingExistence(false);
      }

      setIsSubmitting(true);
      try {
        const formDataToSend = new FormData();
        Object.keys(formData).forEach(key => {
          if (key !== 'photoProfil' && key !== 'confirmPassword') { // Exclude confirmPassword
            formDataToSend.append(key, formData[key]);
          }
        });
        if (formData.photoProfil) {
          formDataToSend.append("photoProfil", formData.photoProfil);
        }
        formDataToSend.append("g-recaptcha-response", token);
        formDataToSend.append("cabinetId", cabinetId.toString());

        const response = await axios.post(
          "http://localhost:6952/Users/addInactive",
          formDataToSend,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        if (response.data === "Verification code sent to email.") {
          setIsVerifying(true);
        }
      } catch (error) {
        if (error.response?.data) {
           if (error.response.status === 409) {
               setErrors({ general: error.response.data || "A user with this email, first name, and last name already exists in this cabinet." });
           } else {
               setErrors({ general: error.response.data });
           }
        } else {
          setErrors({ general: "An error occurred during registration. Please try again." });
        }
        console.error("Registration submission error:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleVerificationSubmit = async () => {
    try {
      const response = await axios.post(
        `http://localhost:6952/Users/verifyEmail?email=${encodeURIComponent(formData.email)}&code=${verificationCode}`
      );
      if (response.status === 200) {
        navigate("/confirmation");
      } else {
        setErrors({ verification: response.data || "Invalid verification code or verification failed. Please try again." });
      }
    } catch (error) {
        if (error.response && error.response.status === 409) {
             setErrors({ verification: error.response.data || "A user with this email and name already exists in this cabinet." });
        } else if (error.response && error.response.data) {
            setErrors({ verification: error.response.data });
        } else {
            setErrors({ verification: "Verification failed. Please try again or request a new code." });
        }
        console.error("Verification error:", error);
    }
  };

  if (errors.cabinet) {
    return (
      <div className="registration-error-container">
        <h2>{t('registration.errorTitle')}</h2>
        <p className="error-message">{errors.cabinet}</p> {/* Already using translated key */}
        <p>{t('registration.contactAdminMessage')}</p>
      </div>
    );
  }

  return (
    <div className="wholeSection">
      <div className="registration-form-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>{t('registration.title')}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}> {/* Container for buttons */}
            {/* Language Selector */}
            <LanguageSelector />
            {/* Theme Toggle Button */}
            <button
              type="button" // Prevent form submission
              onClick={toggleTheme}
              className="btn btn-outline-secondary" // Use Bootstrap classes for basic styling
              style={{ padding: "5px 10px", borderRadius: "5px" }}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <i className="fa fa-moon-o" aria-hidden="true"></i> // Moon icon for dark mode
              ) : (
                <i className="fa fa-sun-o" aria-hidden="true"></i> // Sun icon for light mode
              )}
            </button>
          </div>
        </div>
        {errors.general && (
          <div className="alert alert-danger">{errors.general}</div> // Use Bootstrap alert
        )}

        {!isVerifying ? (
          <form onSubmit={handleSubmit} className="needs-validation" noValidate>
              {/* Row 1: First Name, Last Name */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label htmlFor="reg-first-name" className="form-label required">{t('registration.firstNameLabel')}</label>
                  <input
                    type="text"
                    id="reg-first-name"
                    name="first_name"
                    value={formData.first_name}
                     onChange={handleChange}
                     className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                     required
                   />
                   <div className="invalid-feedback">{errors.first_name}</div> {/* TODO: Translate dynamic error */}
                </div>
                <div className="col-md-6">
                  <label htmlFor="reg-last-name" className="form-label required">{t('registration.lastNameLabel')}</label>
                  <input
                    type="text"
                    id="reg-last-name"
                    name="last_name"
                    value={formData.last_name}
                     onChange={handleChange}
                     className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                     required
                   />
                   <div className="invalid-feedback">{errors.last_name}</div> {/* TODO: Translate dynamic error */}
                </div>
              </div>

              {/* Row 2: Email, Birth Date */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label htmlFor="reg-email" className="form-label required">{t('registration.emailLabel')}</label>
                  <input
                    type="email"
                    id="reg-email"
                    name="email"
                    value={formData.email}
                     onChange={handleChange}
                     className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                     required
                   />
                  <div className="invalid-feedback">{errors.email}</div> {/* TODO: Translate dynamic error */}
                </div>
                <div className="col-md-6">
                  <label htmlFor="reg-birthDate" className="form-label required">{t('registration.birthDateLabel')}</label>
                  <input
                    type="date"
                    id="reg-birthDate"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className={`form-control ${errors.birthDate ? 'is-invalid' : ''}`}
                    required
                  />
                  <div className="invalid-feedback">{errors.birthDate}</div> {/* TODO: Translate dynamic error */}
                </div>
              </div>

              {/* Row 3: Telephone, Address */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label htmlFor="reg-tel" className="form-label">{t('registration.telephoneLabel')}</label>
                  <input
                    type="text"
                    id="reg-tel"
                    name="tel"
                    value={formData.tel}
                     onChange={handleChange}
                     className={`form-control ${errors.tel ? 'is-invalid' : ''}`}
                   />
                  <div className="invalid-feedback">{errors.tel}</div> {/* TODO: Translate dynamic error */}
                </div>
                <div className="col-md-6">
                  <label htmlFor="reg-address" className="form-label">{t('registration.addressLabel')}</label>
                  <input
                    type="text"
                    id="reg-address"
                    name="address"
                    value={formData.address}
                     onChange={handleChange}
                     className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                   />
                   {/* No feedback needed for optional field */}
                </div>
              </div>

              {/* Row 4: Photo and Gender (Combined & Moved) */}
              <div className="row g-3 mb-3">
                 <div className="col-md-6">
                   <label htmlFor="reg-photo" className="form-label">{t('registration.photoLabel')}</label>
                   <input
                     type="file"
                     id="reg-photo"
                     name="photoProfil"
                     onChange={handleFileChange} // Use dedicated file handler
                     className={`form-control ${errors.photoProfil ? 'is-invalid' : ''}`}
                     accept="image/*"
                   />
                 </div>
                 <div className="col-md-6">
                  <label htmlFor="reg-gender" className="form-label required">{t('registration.genderLabel')}</label>
                  <select
                    id="reg-gender"
                    name="gendre"
                    value={formData.gendre}
                    onChange={handleChange}
                    className={`form-select ${errors.gendre ? 'is-invalid' : ''}`}
                    required
                  ><br></br>
                    <option value="">{t('registration.selectGender')}</option>
                    <option value="Male">{t('registration.genderMale')}</option>
                    <option value="Female">{t('registration.genderFemale')}</option>
                    <option value="Other">{t('registration.genderOther')}</option>
                  </select>
                  <div className="invalid-feedback">{errors.gendre}</div> {/* TODO: Translate dynamic error */}
                </div>
              </div>

              {/* Row 6: Password, Confirm Password */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label htmlFor="reg-password" className="form-label required">{t('registration.passwordLabel')}</label>
                  <input
                    type="password"
                    id="reg-password"
                    name="password"
                    value={formData.password}
                     onChange={handleChange}
                     className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                     required
                   />
                  <div className="invalid-feedback">{errors.password}</div> {/* TODO: Translate dynamic error */}
                  {passwordStrength && (
                    <div className={`form-text password-strength-indicator ${passwordStrength.toLowerCase()}`}>
                      {t('registration.passwordStrengthLabel', {
                        strength: t(passwordStrength === 'Strong' ? 'registration.passwordStrengthStrong' : 'registration.passwordStrengthWeak')
                      })}
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  <label htmlFor="reg-confirmPassword" className="form-label required">{t('registration.confirmPasswordLabel')}</label>
                  <input
                    type="password"
                    id="reg-confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                     onChange={handleChange}
                     className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                     required
                   />
                  <div className="invalid-feedback">{errors.confirmPassword}</div> {/* TODO: Translate dynamic error */}
                </div>
              </div>

              {/* Row 7: ReCAPTCHA */}
              <div className="row g-3 mb-3 justify-content-center">
                 <div className="col-auto">
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey="6Lcjq9kqAAAAACubtDN_aCeAZkDR7rgT7VZB82C_" // Replace with your actual site key
                      onChange={handleCaptcha}
                    />
                    {errors.captcha && <div className="text-danger mt-1" style={{fontSize: '0.875em'}}>{errors.captcha}</div>} {/* TODO: Translate dynamic error */}
                 </div>
              </div>

              {/* Row 8: Submit Button */}
              <div className="row g-3">
                 <div className="col-12 text-center">
                    <button
                      type="submit"
                      disabled={isCheckingExistence || isSubmitting || !captchaVerified}
                      className={`btn btn-primary btn-lg ${(isSubmitting || isCheckingExistence) ? "disabled" : ""}`}
                    >
                      {isCheckingExistence ? t('registration.checkingButton') : (isSubmitting ? t('registration.processingButton') : t('registration.registerButton'))}
                    </button>
                 </div>
              </div>
          </form>
        ) : (
          <div className="verification-container">
            <h3>{t('registration.emailVerificationTitle')}</h3>
            <p>{t('registration.emailVerificationMessage', { email: formData.email })}</p>
            <div className="verification-input-group">
              <input
                type="text"
                value={verificationCode}
                 onChange={(e) => setVerificationCode(e.target.value)}
                 className="form-control verification-input" // Use form-control
               />
              <button
                onClick={handleVerificationSubmit}
                className="btn btn-success verify-button" // Use Bootstrap button
              >
                {t('registration.verifyButton')}
              </button>
            </div>
            {errors.verification && (
              <div className="verification-error alert alert-danger mt-3"> {/* Use Bootstrap alert */}
                {errors.verification} {/* TODO: Translate dynamic error */}
                <button
                  className="btn btn-link resend-link" // Style as link
                  onClick={() => setIsVerifying(false)}
                >
                  {t('registration.tryAgainButton')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RegistrationForm;
