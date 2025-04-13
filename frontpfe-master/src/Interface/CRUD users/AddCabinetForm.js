import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getToken, clearUserData, isTokenExpired } from '../../utils/auth';
import './AddCabinetForm.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const AddCabinetForm = () => {
    const [cabinetData, setCabinetData] = useState({
        name: '',
        address: '',
        fax: '',
        tel: '',
        taxNumber: ''
    });
    // const [error, setError] = useState(''); // Keep general error for now if needed, or remove
    const [errors, setErrors] = useState({}); // Use object for field-specific errors
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert("Session expired or logged out. Redirecting to login.");
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCabinetData(prevState => ({
            ...prevState,
            [name]: value
        }));
         // Clear specific field error on change
        if (errors[name]) {
            setErrors(prevErrors => ({ ...prevErrors, [name]: undefined }));
        }
        // Clear general submit error on any change
        if (errors.submit) {
            setErrors(prevErrors => ({ ...prevErrors, submit: undefined }));
        }
    };

     // --- Form Validation ---
    const validateForm = () => {
        const newErrors = {};
        if (!cabinetData.name) newErrors.name = "Cabinet name is required.";
        if (!cabinetData.address) newErrors.address = "Cabinet address is required.";
        // Optional: Add validation for tel/fax/taxNumber format if needed
        if (cabinetData.tel && !/^\+?\d[\d\s-]*$/.test(cabinetData.tel)) {
             newErrors.tel = "Invalid phone number format.";
        }
         if (cabinetData.fax && !/^\+?\d[\d\s-]*$/.test(cabinetData.fax)) {
             newErrors.fax = "Invalid fax number format.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        // setError(''); // Clear previous general errors if using that state
        setErrors({}); // Clear previous field errors
        if (!validateForm()) {
            return; // Stop submission if validation fails
        }

        setLoading(true);
        const token = getToken();
        if (!token) {
            setErrors({ submit: "Authentication required." }); // Use setErrors with submit key
            setLoading(false);
            performLogout();
            return;
        }

        try {
            const response = await axios.post('http://localhost:6952/cabinets', cabinetData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 201) {
                alert("Cabinet added successfully!");
                setCabinetData({ name: '', address: '', fax: '', tel: '', taxNumber: '' }); // Reset form
                setErrors({}); // Clear errors on success
            } else {
                // This case might not be reached if backend throws errors for non-201 success
                throw new Error(`Unexpected server response: ${response.status}`);
            }
        } catch (err) {
            console.error("Error adding cabinet:", err);
            let errorMsg = "An error occurred while adding the cabinet.";
            if (err.response) {
                if (err.response.status === 409) {
                    errorMsg = err.response.data?.message || "A cabinet with this name/address might already exist.";
                    setErrors({ submit: errorMsg }); // Set specific submit error
                } else if (err.response.status === 401 || err.response.status === 403) {
                    errorMsg = "Permission denied. Only administrators can add cabinets.";
                    setErrors({ submit: errorMsg });
                    performLogout(); // Log out on auth errors
                } else {
                    errorMsg = `Server error (${err.response.status}): ${err.response.data?.message || err.response.statusText}`;
                     setErrors({ submit: errorMsg });
                }
            } else if (err.request) {
                errorMsg = 'No response from server. Check your connection.';
                 setErrors({ submit: errorMsg });
            } else {
                 setErrors({ submit: errorMsg }); // Generic error
            }
            // Set submit error instead of using alert directly
            setErrors({ submit: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        // Use Bootstrap container and classes
        <div className="add-cabinet-container container mt-4">
            <h2>Add New Cabinet</h2>
            {errors.submit && <div className="alert alert-danger">{errors.submit}</div>} {/* Display submit error */}
            <form onSubmit={handleSubmit} noValidate>
                {/* Row 1: Name, Address */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="cabinet-name" className="form-label required">Cabinet Name</label>
                        <input
                            type="text"
                            id="cabinet-name"
                            name="name"
                            value={cabinetData.name}
                            onChange={handleChange}
                            placeholder="Enter cabinet name"
                            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                            required
                        />
                         <div className="invalid-feedback">{errors.name}</div>
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="cabinet-address" className="form-label required">Address</label>
                        <input
                            type="text"
                            id="cabinet-address"
                            name="address"
                            value={cabinetData.address}
                            onChange={handleChange}
                            placeholder="Enter cabinet address"
                            className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                            required
                        />
                         <div className="invalid-feedback">{errors.address}</div>
                    </div>
                </div>

                 {/* Row 2: Telephone, Fax */}
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label htmlFor="cabinet-tel" className="form-label">Telephone</label>
                        <input
                            type="text"
                            id="cabinet-tel"
                            name="tel"
                            value={cabinetData.tel}
                            onChange={handleChange}
                            placeholder="Enter phone number (optional)"
                             className={`form-control ${errors.tel ? 'is-invalid' : ''}`}
                        />
                         <div className="invalid-feedback">{errors.tel}</div>
                    </div>
                     <div className="col-md-6">
                        <label htmlFor="cabinet-fax" className="form-label">Fax</label>
                        <input
                            type="text"
                            id="cabinet-fax"
                            name="fax"
                            value={cabinetData.fax}
                            onChange={handleChange}
                            placeholder="Enter fax number (optional)"
                             className={`form-control ${errors.fax ? 'is-invalid' : ''}`}
                        />
                         <div className="invalid-feedback">{errors.fax}</div>
                    </div>
                </div>

                 {/* Row 3: Tax Number */}
                 <div className="row g-3 mb-3">
                    <div className="col-md-6"> {/* Or col-12 if it should span full width */}
                        <label htmlFor="cabinet-taxNumber" className="form-label">Tax Number</label>
                        <input
                            type="text"
                            id="cabinet-taxNumber"
                            name="taxNumber"
                            value={cabinetData.taxNumber}
                            onChange={handleChange}
                            placeholder="Enter tax number (optional)"
                            className={`form-control ${errors.taxNumber ? 'is-invalid' : ''}`}
                        />
                         {/* No feedback needed for optional field unless format validation added */}
                    </div>
                 </div>

                 {/* Row 4: Submit Button */}
                 <div className="row g-3">
                    <div className="col-12 text-center">
                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Cabinet'}
                        </button>
                    </div>
                 </div>
            </form>
        </div>
    );
};

export default AddCabinetForm;
