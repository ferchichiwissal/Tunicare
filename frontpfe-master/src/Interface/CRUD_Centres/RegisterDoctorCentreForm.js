import React, { useState, useEffect, useRef, useContext } from 'react';
import apiClient from '../../utils/apiClient'; // Use the shared apiClient
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReCAPTCHA from "react-google-recaptcha";
import ThemeContext from "../../utils/ThemeContext"; // Import ThemeContext
import LanguageSelector from "../../component/LanguageSelector"; // Import LanguageSelector
import './RegisterDoctorCentreForm.css'; // Keep custom styles if needed, but rely on Bootstrap mainly

// Password strength checker (same as in RegistrationForm)
const checkPasswordStrength = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!])[\w@#$%^&+=!]{8,}$/;
  return passwordRegex.test(password);
};

const RegisterDoctorCentreForm = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation(); // Keep location if needed elsewhere, but useSearchParams for ID
    const [searchParams] = useSearchParams();
    const centreIdParam = searchParams.get("centreId");
    const centreId = centreIdParam && !isNaN(centreIdParam) ? Number(centreIdParam) : null;
    const recaptchaRef = useRef(null);
    const { theme, toggleTheme } = useContext(ThemeContext); // Get theme context

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        birthDate: '',
        tel: '',
        address: '',
        gender: '', // Use 'gender' consistently
        speciality: '', // Specific field for DoctorCentreDexamen
        // photoProfil: null // Handle file upload if needed later
    });

    const [errors, setErrors] = useState({});
    const [passwordStrength, setPasswordStrength] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCheckingExistence, setIsCheckingExistence] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [captchaVerified, setCaptchaVerified] = useState(false);

    // Effect to check for centreId on load (keep this)
    useEffect(() => {
        if (!centreId) {
            setErrors({ general: t('registration.invalidLinkMessage') }); // Use general error for missing ID
        }
    }, [centreId, t]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));

        if (name === "password") {
          setPasswordStrength(checkPasswordStrength(value) ? "Strong" : "Weak");
        }
        // Clear specific error when user types
        if (errors[name]) {
            setErrors(prevErrors => ({ ...prevErrors, [name]: null }));
        }
        if (name === 'password' || name === 'confirmPassword') {
             setErrors(prevErrors => ({ ...prevErrors, confirmPassword: null }));
        }
    };

    // Add handleFileChange if photo upload is implemented later
    // const handleFileChange = (e) => {
    //     setFormData({ ...formData, photoProfil: e.target.files[0] });
    // };

    const handleCaptcha = (value) => {
        setCaptchaVerified(!!value);
        if (errors.captcha) {
             setErrors(prevErrors => ({ ...prevErrors, captcha: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!centreId) {
          newErrors.general = t('registration.invalidLinkMessage');
        }
        if (!formData.firstName) newErrors.firstName = t('validation.firstNameRequired');
        if (!formData.lastName) newErrors.lastName = t('validation.lastNameRequired');
        if (!formData.email) {
          newErrors.email = t('validation.emailRequired');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = t('validation.emailInvalid');
        }
        if (!formData.birthDate) newErrors.birthDate = t('validation.birthDateRequired');
        if (formData.tel && !/^\d+$/.test(formData.tel)) {
            newErrors.tel = t('validation.phoneDigitsOnly');
        }
        if (!formData.gender) newErrors.gender = t('validation.genderRequired');
        if (!formData.speciality) newErrors.speciality = t('validation.specialityRequired'); // Add speciality validation
        if (!formData.password) {
             newErrors.password = t('validation.passwordRequired');
        } else if (!checkPasswordStrength(formData.password)) {
             newErrors.password = t('validation.passwordWeak'); // Add weak password message key
        }
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t('validation.passwordsDoNotMatch');
        if (!captchaVerified) newErrors.captcha = t('validation.captchaRequired');

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = recaptchaRef.current.getValue();
        // Ensure captcha is verified client-side before proceeding
        setCaptchaVerified(!!token);

        if (validateForm()) {
            setIsCheckingExistence(true);
            setErrors({}); // Clear previous errors

            try {
                // Use apiClient for consistency
                const checkResponse = await apiClient.get("/api/doctor-centre-examen/checkExists", {
                  params: {
                    email: formData.email,
                    centreId: centreId // Pass centreId for the check
                  }
                });
                if (checkResponse.data === true) {
                   setErrors({ general: t('validation.doctorExistsInCentre') }); // Use specific error key
                   setIsCheckingExistence(false);
                   recaptchaRef.current.reset(); // Reset captcha
                   setCaptchaVerified(false);
                   return;
                }
              } catch (error) {
                 // Only fail if it's not a 404 (meaning check endpoint exists but failed)
                 if (error.response && error.response.status !== 404) {
                    setErrors({ general: t('error.existenceCheckFailed') }); // Use error key
                    console.error("Existence check error:", error);
                    setIsCheckingExistence(false);
                    recaptchaRef.current.reset(); // Reset captcha
                    setCaptchaVerified(false);
                    return;
                 }
                 // Ignore 404 or network errors for existence check, proceed with registration attempt
                 console.warn("Existence check endpoint might be missing or failed, proceeding with registration attempt:", error);
              } finally {
                setIsCheckingExistence(false);
              }

            // --- Proceed with sending verification code ---
            setIsSubmitting(true);
            try {
                const formDataToSend = new FormData();
                // Append necessary fields for the backend /register/{centreId} endpoint
                formDataToSend.append("firstName", formData.firstName);
                formDataToSend.append("lastName", formData.lastName);
                formDataToSend.append("email", formData.email);
                formDataToSend.append("birthDate", formData.birthDate);
                formDataToSend.append("password", formData.password); // Send raw password
                formDataToSend.append("tel", formData.tel);
                formDataToSend.append("address", formData.address);
                formDataToSend.append("gender", formData.gender);
                formDataToSend.append("speciality", formData.speciality);
                // Append photo if handled:
                // if (formData.photoProfil) {
                //   formDataToSend.append("photoProfil", formData.photoProfil);
                // }
                formDataToSend.append("g-recaptcha-response", token);
                // centreId is in the URL path, not form data

                const response = await apiClient.post(
                  `/api/doctor-centre-examen/register/${centreId}`, // Use correct endpoint
                  formDataToSend,
                  { headers: { "Content-Type": "multipart/form-data" } } // Ensure correct content type
                );

                // Check response message for success indication
                if (response.data?.message === "Verification code sent to email.") {
                  setIsVerifying(true); // Move to verification step
                } else {
                  // Handle unexpected success response
                  setErrors({ general: response.data?.message || t('error.registrationFailed') });
                  recaptchaRef.current.reset();
                  setCaptchaVerified(false);
                }
            } catch (error) {
                const errorMsg = error.response?.data?.message || t('error.registrationFailed');
                if (error.response?.status === 409) { // Conflict (e.g., duplicate during registration attempt)
                    setErrors({ general: errorMsg });
                } else {
                    setErrors({ general: errorMsg });
                }
                console.error("Registration submission error:", error);
                recaptchaRef.current.reset(); // Reset captcha on error
                setCaptchaVerified(false);
            } finally {
                setIsSubmitting(false);
            }
        } else {
             // If validation fails, reset captcha if it was verified
             if (captchaVerified) {
                 recaptchaRef.current.reset();
                 setCaptchaVerified(false);
             }
        }
    };

    const handleVerificationSubmit = async () => {
        setIsSubmitting(true); // Indicate processing
        setErrors({}); // Clear previous verification errors
        try {
            // Use apiClient
            const response = await apiClient.post(
              `/api/doctor-centre-examen/verify-email?email=${encodeURIComponent(formData.email)}&code=${verificationCode}`
            );
            // Assuming backend returns 200 OK on success
            if (response.status === 200 && response.data?.message?.includes("Email verified successfully")) {
              navigate("/confirmation"); // Redirect on successful verification
            } else {
              // Handle unexpected success response format
              setErrors({ verification: response.data?.message || t('error.verificationFailed') });
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || t('error.verificationFailed');
             if (error.response?.status === 409) { // Conflict during verification
                 setErrors({ verification: errorMsg });
             } else {
                 setErrors({ verification: errorMsg });
             }
            console.error("Verification error:", error);
        } finally {
             setIsSubmitting(false);
        }
    };

    // Display error if centreId is missing from the start
    if (errors.general === t('registration.invalidLinkMessage')) {
        return (
          <div className="registration-error-container"> {/* Use a container class */}
            <h2>{t('registration.errorTitle')}</h2>
            <p className="error-message">{errors.general}</p>
            <p>{t('registration.contactAdminMessage')}</p>
          </div>
        );
    }

    return (
        <div className="wholeSection"> {/* Use consistent outer container */}
            <div className="registration-form-container"> {/* Use consistent form container */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2>{t('register_exam_centre_doctor')}</h2> {/* Use specific title key */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <LanguageSelector />
                        <button
                          type="button"
                          onClick={toggleTheme}
                          className="btn btn-outline-secondary"
                          style={{ padding: "5px 10px", borderRadius: "5px" }}
                          aria-label="Toggle theme"
                        >
                          {theme === 'light' ? <i className="fa fa-moon-o" aria-hidden="true"></i> : <i className="fa fa-sun-o" aria-hidden="true"></i>}
                        </button>
                    </div>
                </div>
                {errors.general && (
                  <div className="alert alert-danger">{errors.general}</div>
                )}

                {!isVerifying ? (
                    <form onSubmit={handleSubmit} className="needs-validation" noValidate>
                        {/* Row 1: First Name, Last Name */}
                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <label htmlFor="reg-firstName" className="form-label required">{t('registration.firstNameLabel')}</label>
                                <input type="text" id="reg-firstName" name="firstName" value={formData.firstName} onChange={handleChange} className={`form-control ${errors.firstName ? 'is-invalid' : ''}`} required />
                                <div className="invalid-feedback">{errors.firstName}</div>
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="reg-lastName" className="form-label required">{t('registration.lastNameLabel')}</label>
                                <input type="text" id="reg-lastName" name="lastName" value={formData.lastName} onChange={handleChange} className={`form-control ${errors.lastName ? 'is-invalid' : ''}`} required />
                                <div className="invalid-feedback">{errors.lastName}</div>
                            </div>
                        </div>

                        {/* Row 2: Email, Birth Date */}
                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <label htmlFor="reg-email" className="form-label required">{t('registration.emailLabel')}</label>
                                <input type="email" id="reg-email" name="email" value={formData.email} onChange={handleChange} className={`form-control ${errors.email ? 'is-invalid' : ''}`} required />
                                <div className="invalid-feedback">{errors.email}</div>
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="reg-birthDate" className="form-label required">{t('registration.birthDateLabel')}</label>
                                <input type="date" id="reg-birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} className={`form-control ${errors.birthDate ? 'is-invalid' : ''}`} required />
                                <div className="invalid-feedback">{errors.birthDate}</div>
                            </div>
                        </div>

                        {/* Row 3: Telephone, Address */}
                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <label htmlFor="reg-tel" className="form-label">{t('registration.telephoneLabel')}</label>
                                <input type="text" id="reg-tel" name="tel" value={formData.tel} onChange={handleChange} className={`form-control ${errors.tel ? 'is-invalid' : ''}`} />
                                <div className="invalid-feedback">{errors.tel}</div>
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="reg-address" className="form-label">{t('registration.addressLabel')}</label>
                                <input type="text" id="reg-address" name="address" value={formData.address} onChange={handleChange} className={`form-control ${errors.address ? 'is-invalid' : ''}`} />
                                {/* No feedback needed for optional field */}
                            </div>
                        </div>

                        {/* Row 4: Gender, Speciality */}
                        <div className="row g-3 mb-3">
                             <div className="col-md-6">
                                <label htmlFor="reg-gender" className="form-label required">{t('registration.genderLabel')}</label>
                                <select id="reg-gender" name="gender" value={formData.gender} onChange={handleChange} className={`form-select ${errors.gender ? 'is-invalid' : ''}`} required>
                                    <option value="">{t('registration.selectGender')}</option>
                                    <option value="Male">{t('registration.genderMale')}</option>
                                    <option value="Female">{t('registration.genderFemale')}</option>
                                    {/* <option value="Other">{t('registration.genderOther')}</option> */}
                                </select>
                                <div className="invalid-feedback">{errors.gender}</div>
                            </div>
                            <div className="col-md-6">
                                <label htmlFor="reg-speciality" className="form-label required">{t('registration.specialityLabel')}</label> {/* Add translation key */}
                                <input type="text" id="reg-speciality" name="speciality" value={formData.speciality} onChange={handleChange} className={`form-control ${errors.speciality ? 'is-invalid' : ''}`} required />
                                <div className="invalid-feedback">{errors.speciality}</div>
                            </div>
                        </div>

                        {/* Row 5: Password, Confirm Password */}
                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <label htmlFor="reg-password" className="form-label required">{t('registration.passwordLabel')}</label>
                                <input type="password" id="reg-password" name="password" value={formData.password} onChange={handleChange} className={`form-control ${errors.password ? 'is-invalid' : ''}`} required />
                                <div className="invalid-feedback">{errors.password}</div>
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
                                <input type="password" id="reg-confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`} required />
                                <div className="invalid-feedback">{errors.confirmPassword}</div>
                            </div>
                        </div>

                        {/* Row 6: ReCAPTCHA */}
                        <div className="row g-3 mb-3 justify-content-center">
                           <div className="col-auto">
                              <ReCAPTCHA
                                ref={recaptchaRef}
                                sitekey="6Lcjq9kqAAAAACubtDN_aCeAZkDR7rgT7VZB82C_" // Replace with your actual site key
                                onChange={handleCaptcha}
                              />
                              {errors.captcha && <div className="text-danger mt-1" style={{fontSize: '0.875em'}}>{errors.captcha}</div>}
                           </div>
                        </div>

                        {/* Row 7: Submit Button */}
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


export default RegisterDoctorCentreForm;
