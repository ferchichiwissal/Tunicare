import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import { useNavigate } from "react-router-dom";
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
    alert("Session expired or logged out. Redirecting to login.");
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
      alert("You don't have permission to access this page.");
      performLogout();
    }
  }, [performLogout]); // Added performLogout dependency

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "password") {
      if (value && !checkPasswordStrength(value)) {
        setPasswordStrength("Weak");
      } else if (value && checkPasswordStrength(value)) {
        setPasswordStrength("Strong");
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

    if (!formData.first_name) newErrors.first_name = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (formData.email && !/^[^\s@]+@(gmail\.com|yahoo\.com)$/.test(formData.email)) {
        newErrors.email = "Email must be a valid @gmail.com or @yahoo.com address";
    }
    if (!formData.birthDate) newErrors.birthDate = "Birth date is required";
    if (formData.tel && !/^\d+$/.test(formData.tel)) {
        newErrors.tel = "Phone number must contain only digits";
    }
    if (!formData.gendre) newErrors.gendre = "Gender is required";
    // Password validation only if password is not empty
    if (formData.password && !checkPasswordStrength(formData.password)) {
      newErrors.password = "Password must contain at least 8 characters, including uppercase, lowercase, a number, and a special character (@, #, $, %, ^, &, +, =, or !)";
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!formData.password && formData.confirmPassword) {
        newErrors.confirmPassword = "Confirm password should be empty if password is empty";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const token = getToken();
    if (!token) {
      alert("Session invalid. Please log in again.");
      performLogout();
      return;
    }

    // --- Step 1: Check User Existence (only for Doctor/Assistant adding a patient) ---
    if (userRole === "DOCTOR_OR_ASSISTANT") {
      setIsCheckingExistence(true);
      setErrors({});
      if (!loggedInUserCabinetId) {
          setErrors({ general: "Could not determine your cabinet affiliation. Please log in again." });
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
    }

    // --- Step 2: Proceed with Adding User ---
    setIsSubmitting(true);
    let apiUrl;
    if (userRole === "ADMIN") {
      apiUrl = "http://localhost:6952/Users/addadmin";
    } else if (userRole === "DOCTOR_OR_ASSISTANT") {
      apiUrl = "http://localhost:6952/Users/add";
    } else {
      alert("Invalid user role. Cannot proceed.");
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
        ? "User added successfully with admin privileges!"
        : "Patient added successfully!";
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
          alert("Permission denied or session expired.");
          performLogout();
        } else {
          const backendMessage = error.response.data?.message ||
                               "An error occurred. Please check the data and try again.";
          setErrors({ general: backendMessage });
        }
      } else {
        setErrors({ general: "Network error or server unavailable. Please try again later." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Use registration-form class for consistency if styles are shared, or create AddForm specific styles
    <div className="registration-form">
      <h2 className="form-title">
        {userRole === "ADMIN" ? "Add New User" : "Add New Patient"}
      </h2>
      {errors.general && <div className="alert alert-danger">{errors.general}</div>}

      <form onSubmit={handleSubmit} className="needs-validation" noValidate>
          {/* Row 1: First Name, Last Name */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="add-first-name" className="form-label required">First Name</label>
              <input
                type="text"
                id="add-first-name"
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
              <label htmlFor="add-last-name" className="form-label required">Last Name</label>
              <input
                type="text"
                id="add-last-name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
                className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                required
              />
              <div className="invalid-feedback">{errors.lastName}</div>
            </div>
          </div>

          {/* Row 2: Email, Birth Date */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="add-email" className="form-label">Email</label>
              <input
                type="email"
                id="add-email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email (optional)"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              />
              <div className="invalid-feedback">{errors.email}</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="add-birthDate" className="form-label required">Birth Date</label>
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
              <label htmlFor="add-tel" className="form-label">Telephone</label>
              <input
                type="text"
                id="add-tel"
                name="tel"
                value={formData.tel}
                onChange={handleChange}
                placeholder="Enter phone number (optional)"
                className={`form-control ${errors.tel ? 'is-invalid' : ''}`}
              />
              <div className="invalid-feedback">{errors.tel}</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="add-address" className="form-label">Address</label>
              <input
                type="text"
                id="add-address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter address (optional)"
                className={`form-control ${errors.address ? 'is-invalid' : ''}`}
              />
            </div>
          </div>

          {/* Row 4: Gender, Photo */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="add-gender" className="form-label required">Gender</label>
              <select
                id="add-gender"
                name="gendre"
                value={formData.gendre}
                onChange={handleChange}
                className={`form-select ${errors.gendre ? 'is-invalid' : ''}`}
                required
              >
                <option value="">Select Gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <div className="invalid-feedback">{errors.gendre}</div>
            </div>
            <div className="col-md-6">
              <label htmlFor="add-photo" className="form-label">Profile Photo (Optional)</label>
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
              <label htmlFor="add-password" className="form-label">Password</label>
              <input
                type="password"
                id="add-password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password (optional)"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              />
              <div className="invalid-feedback">{errors.password}</div>
              {passwordStrength && (
                <div className={`form-text password-strength ${passwordStrength.toLowerCase()}`}>
                  Password Strength: {passwordStrength}
                </div>
              )}
            </div>
            <div className="col-md-6">
              <label htmlFor="add-confirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                id="add-confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password (if entered)"
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
                  {isCheckingExistence ? "Checking..." : (isSubmitting ? "Processing..." : "Submit")}
                </button>
             </div>
          </div>
      </form>
    </div>
  );
}

export default AddForm; // Export AddForm
