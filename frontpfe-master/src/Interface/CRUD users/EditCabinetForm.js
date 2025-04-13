import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { getToken, clearUserData, isTokenExpired } from '../../utils/auth'; // Assuming auth utils are relevant
import './EditCabinetForm.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const EditCabinetForm = () => {
    const { id } = useParams(); // Get cabinet ID from URL parameter
    const navigate = useNavigate();
    const [cabinetData, setCabinetData] = useState({
        name: '',
        address: '',
        tel: '',
        fax: '',
        taxNumber: ''
    });
    const [initialData, setInitialData] = useState({}); // Store initial data
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({}); // Use object for errors
    const [isSubmitting, setIsSubmitting] = useState(false);

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


    useEffect(() => {
        const fetchCabinet = async () => {
            setLoading(true);
            setErrors({}); // Clear previous errors
            const token = getToken();
            if (!token) {
                setErrors({ fetch: "Authentication required." });
                setLoading(false);
                performLogout();
                return;
            }

            try {
                const response = await axios.get(`http://localhost:6952/cabinets/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const fetchedData = {
                    name: response.data.name || '',
                    address: response.data.address || '',
                    tel: response.data.tel || '',
                    fax: response.data.fax || '',
                    taxNumber: response.data.taxNumber || ''
                };
                setCabinetData(fetchedData);
                setInitialData(fetchedData); // Store initial data
            } catch (err) {
                console.error("Error fetching cabinet:", err);
                 if (err.response) {
                    if (err.response.status === 404) {
                        setErrors({ fetch: `Cabinet with ID ${id} not found.` });
                    } else if (err.response.status === 401 || err.response.status === 403) {
                        setErrors({ fetch: "Permission denied to view this cabinet." });
                        performLogout();
                    } else {
                        setErrors({ fetch: `Error fetching cabinet: ${err.response.data?.message || err.response.statusText}` });
                    }
                } else {
                    setErrors({ fetch: 'Network error or server unavailable.' });
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCabinet();
        } else {
            setErrors({ fetch: "Cabinet ID is missing." });
            setLoading(false);
        }
    }, [id, performLogout]); // Add performLogout dependency

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
        if (cabinetData.tel && !/^\+?\d[\d\s-]*$/.test(cabinetData.tel)) {
             newErrors.tel = "Invalid phone number format.";
        }
         if (cabinetData.fax && !/^\+?\d[\d\s-]*$/.test(cabinetData.fax)) {
             newErrors.fax = "Invalid fax number format.";
        }
        setErrors(newErrors); // Set errors based on current validation
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return; // Validate before submit

        const token = getToken();
        if (!token) {
            setErrors({ submit: "Authentication required to modify." });
            performLogout();
            return;
        }

        // Prepare only changed fields
        const updatePayload = {};
         Object.keys(cabinetData).forEach((key) => {
            if (cabinetData[key] !== initialData[key]) {
                 // Handle empty optional fields correctly
                if ((key === 'tel' || key === 'fax' || key === 'taxNumber') && cabinetData[key] === '' && (initialData[key] === null || initialData[key] === '')) {
                    // Don't send if it was empty and remains empty
                } else {
                    updatePayload[key] = cabinetData[key];
                }
            }
        });

        if (Object.keys(updatePayload).length === 0) {
            alert("No changes detected.");
            return;
        }

        setIsSubmitting(true);
        setErrors({}); // Clear previous submit errors

        try {
            const response = await axios.put(`http://localhost:6952/cabinets/${id}`, updatePayload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200) {
                alert("Cabinet updated successfully!");
                navigate('/manage-cabinets'); // Navigate back after successful update
            } else {
                throw new Error(`Unexpected server response: ${response.status}`);
            }
        } catch (err) {
            console.error("Error updating cabinet:", err);
            let errorMsg = "An error occurred while updating the cabinet.";
            if (err.response) {
                 if (err.response.status === 401 || err.response.status === 403) {
                    errorMsg = "Permission denied to modify this cabinet.";
                    performLogout();
                } else if (err.response.status === 404) {
                    errorMsg = "Cabinet not found (maybe deleted?).";
                } else if (err.response.status === 409) {
                    errorMsg = err.response.data?.message || "Conflict: Another cabinet with this name/address might exist.";
                } else if (err.response.status === 400) {
                     errorMsg = `Validation Error: ${err.response.data || 'Invalid data.'}`;
                } else {
                    errorMsg = `Server error (${err.response.status}): ${err.response.data?.message || err.response.statusText}`;
                }
            } else if (err.request) {
                errorMsg = 'No response from server. Check connection.';
            }
            setErrors({ submit: errorMsg }); // Set submit error
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading && !Object.keys(initialData).length) {
        return <div className="text-center p-4">Loading cabinet information...</div>;
    }

    if (errors.fetch) {
         return <div className="alert alert-danger m-4">{errors.fetch}</div>;
    }

    return (
        // Use Bootstrap container and classes
        <div className="edit-cabinet-container container mt-4">
            <h2>Edit Cabinet (ID: {id})</h2>
            {errors.submit && <div className="alert alert-danger">{errors.submit}</div>}
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
                    <div className="col-md-6">
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
                         {/* No feedback needed for optional field */}
                    </div>
                 </div>

                 {/* Row 4: Buttons */}
                 <div className="row g-3">
                    <div className="col-12 d-flex justify-content-center gap-3"> {/* Center buttons with gap */}
                        <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={() => navigate('/manage-cabinets')} className="btn btn-secondary btn-lg" disabled={isSubmitting}>
                            Cancel
                        </button>
                    </div>
                 </div>
            </form>
        </div>
    );
};

export default EditCabinetForm;
