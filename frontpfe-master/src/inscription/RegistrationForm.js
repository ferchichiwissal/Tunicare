import React, { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import ReCAPTCHA from "react-google-recaptcha";
import './registration.css'; // Keep custom styles for now

const checkPasswordStrength = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!])[\w@#$%^&+=!]{8,}$/;
  return passwordRegex.test(password);
};

function RegistrationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cabinetIdParam = searchParams.get("cabinetId");
  const cabinetId = cabinetIdParam && !isNaN(cabinetIdParam) ? Number(cabinetIdParam) : null;
  const recaptchaRef = useRef(null);

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

    if (!cabinetId) {
      newErrors.cabinet = "Invalid registration link. Please use a valid registration URL provided by your clinic.";
    }
    if (!formData.first_name) newErrors.first_name = "First name is required";
    if (!formData.last_name) newErrors.last_name = "Last name is required";
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email must be a valid email address";
    }
    if (!formData.birthDate) newErrors.birthDate = "Birth date is required";
    if (formData.tel && !/^\d+$/.test(formData.tel)) {
        newErrors.tel = "Phone number must contain only digits";
    }
    if (!formData.gendre) newErrors.gendre = "Gender is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!captchaVerified) newErrors.captcha = "Please complete the reCAPTCHA";

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
        <h2>Registration Error</h2>
        <p className="error-message">{errors.cabinet}</p>
        <p>Please contact your clinic administrator for assistance.</p>
      </div>
    );
  }

  return (
    <div className="wholeSection">
      <div className="registration-form-container">
        <h2>Patient Registration</h2> {/* Added Title */}
        {errors.general && (
          <div className="alert alert-danger">{errors.general}</div> // Use Bootstrap alert
        )}

        {!isVerifying ? (
          <form onSubmit={handleSubmit} className="needs-validation" noValidate>
              {/* Row 1: First Name, Last Name */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label htmlFor="reg-first-name" className="form-label required">First Name</label>
                  <input
                    type="text"
                    id="reg-first-name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                    required
                  />
                   <div className="invalid-feedback">{errors.first_name}</div>
                </div>
                <div className="col-md-6">
                  <label htmlFor="reg-last-name" className="form-label required">Last Name</label>
                  <input
                    type="text"
                    id="reg-last-name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                    required
                  />
                   <div className="invalid-feedback">{errors.last_name}</div>
                </div>
              </div>

              {/* Row 2: Email, Birth Date */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label htmlFor="reg-email" className="form-label required">Email</label>
                  <input
                    type="email"
                    id="reg-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    required
                  />
                  <div className="invalid-feedback">{errors.email}</div>
                </div>
                <div className="col-md-6">
                  <label htmlFor="reg-birthDate" className="form-label required">Birth Date</label>
                  <input
                    type="date"
                    id="reg-birthDate"
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
                  <label htmlFor="reg-tel" className="form-label">Telephone</label>
                  <input
                    type="text"
                    id="reg-tel"
                    name="tel"
                    value={formData.tel}
                    onChange={handleChange}
                    placeholder="Enter phone number (optional)"
                    className={`form-control ${errors.tel ? 'is-invalid' : ''}`}
                  />
                  <div className="invalid-feedback">{errors.tel}</div>
                </div>
                <div className="col-md-6">
                  <label htmlFor="reg-address" className="form-label">Address</label>
                  <input
                    type="text"
                    id="reg-address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter address (optional)"
                    className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                  />
                   {/* No feedback needed for optional field */}
                </div>
              </div>

              {/* Row 4: Photo and Gender (Combined & Moved) */}
              <div className="row g-3 mb-3">
                 <div className="col-md-6">
                   <label htmlFor="reg-photo" className="form-label">Profile Photo (Optional)</label>
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
                  <label htmlFor="reg-gender" className="form-label required">Gender</label>
                  <select
                    id="reg-gender"
                    name="gendre"
                    value={formData.gendre}
                    onChange={handleChange}
                    className={`form-select ${errors.gendre ? 'is-invalid' : ''}`}
                    required
                  ><br></br>
                    <option value="">Select Gender...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="invalid-feedback">{errors.gendre}</div>
                </div>
              </div>

              {/* Row 6: Password, Confirm Password */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label htmlFor="reg-password" className="form-label required">Password</label>
                  <input
                    type="password"
                    id="reg-password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    required
                  />
                  <div className="invalid-feedback">{errors.password}</div>
                  {passwordStrength && (
                    <div className={`form-text password-strength-indicator ${passwordStrength.toLowerCase()}`}>
                      Password Strength: {passwordStrength}
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  <label htmlFor="reg-confirmPassword" className="form-label required">Confirm Password</label>
                  <input
                    type="password"
                    id="reg-confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                    required
                  />
                  <div className="invalid-feedback">{errors.confirmPassword}</div>
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
                    {errors.captcha && <div className="text-danger mt-1" style={{fontSize: '0.875em'}}>{errors.captcha}</div>}
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
                      {isCheckingExistence ? "Checking..." : (isSubmitting ? "Processing..." : "Register")}
                    </button>
                 </div>
              </div>
          </form>
        ) : (
          <div className="verification-container">
            <h3>Email Verification</h3>
            <p>We've sent a verification code to {formData.email}. Please check your inbox.</p>
            <div className="verification-input-group">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="form-control verification-input" // Use form-control
              />
              <button
                onClick={handleVerificationSubmit}
                className="btn btn-success verify-button" // Use Bootstrap button
              >
                Verify Account
              </button>
            </div>
            {errors.verification && (
              <div className="verification-error alert alert-danger mt-3"> {/* Use Bootstrap alert */}
                {errors.verification}
                <button
                  className="btn btn-link resend-link" // Style as link
                  onClick={() => setIsVerifying(false)}
                >
                  Try again
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
