import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { getToken, clearUserData, isTokenExpired, getUserData } from "../../utils/auth";
import ThemeContext from "../../utils/ThemeContext";
import './Tovalidate.css'; // Reuse the same CSS for consistent styling

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const CentreDoctorActivation = () => { // Renamed component
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const [doctors, setDoctors] = useState([]);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserDetails, setCurrentUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [centreId, setCentreId] = useState(null); // State to hold the centre ID

  // --- Logout Function ---
  const performLogout = useCallback(() => {
    clearUserData();
    alert(t('activation.alerts.sessionExpired'));
    navigate("/sign-in");
  }, [navigate, t]);

  // --- Token Expiry Check ---
  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      performLogout();
    } else {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = decodedToken.exp * 1000;
        const currentTime = Date.now();
        const timeToExpire = expiryTime - currentTime;
        if (timeToExpire > 0) {
          const expiryTimer = setTimeout(performLogout, timeToExpire);
          return () => clearTimeout(expiryTimer);
        } else {
          performLogout();
        }
      } catch (error) {
        console.error("Error decoding token for expiry check:", error);
        performLogout();
      }
    }
  }, [performLogout]);

  // --- Inactivity Logout Logic ---
  useEffect(() => {
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.log("Inactivity timeout reached.");
        setSessionExpired(true);
        performLogout();
      }, INACTIVITY_TIMEOUT);
    };
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    activityEvents.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [performLogout]);

  // --- Get Current User Details and Centre ID ---
  useEffect(() => {
    const details = getUserData();
    setCurrentUserDetails(details);
    console.log("Current User Details (CentreDoctorActivation):", details);

    // Check if user is ADMIN_CENTRE_EXAMEN and has a centreId
    // Check if user has a centreId (ProtectedLayout already ensures the correct role)
    // Corrected check to look for centreId directly in details object
    if (details?.centreId) {
        setCentreId(details.centreId);
        console.log("User has Centre ID:", details.centreId);
    } else {
        // This case should ideally not be reached if ProtectedLayout is configured correctly,
        // but as a fallback, redirect if no centreId is found for the ADMIN_CENTRE_EXAMEN.
        console.error("ADMIN_CENTRE_EXAMEN user details missing centre ID.");
        alert(t('activation.alerts.missingCentreInfo')); // Add a new translation key for this specific error
        navigate("/dashboard");
    }
  }, [navigate, t]);

  // --- Fetch Doctors by Centre ID Function ---
  const fetchDoctorsByCentre = useCallback(async (currentCentreId) => {
    if (sessionExpired || !currentCentreId) {
        console.log("Fetch skipped: sessionExpired or currentCentreId missing.");
        return;
    }

    setLoading(true);
    const token = getToken();

    if (!token) {
      console.log("Token missing, cannot fetch doctors.");
      setLoading(false);
      performLogout();
      return;
    }

    // Ensure currentUserDetails is loaded before proceeding
    if (!currentUserDetails) {
        console.log("currentUserDetails not loaded yet, skipping fetchDoctorsByCentre.");
        setLoading(false);
        return;
    }

    // Use the backend endpoint to get doctors by centre ID
    const apiUrl = `http://localhost:6952/api/doctor-centre-examen/centre/${currentCentreId}`;
    console.log(`Fetching doctors for Centre ID: ${currentCentreId} by ADMIN_CENTRE_EXAMEN`);

    try {
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`[fetchDoctorsByCentre Activation] Raw data from ${apiUrl}:`, response.data);

      // Filter for inactive doctors on the frontend for now
      const inactiveDoctors = response.data.filter(d => !d.active);

      // Add displayStatus - for inactive list, it should always be false
      const doctorsWithStatus = inactiveDoctors.map(d => ({
          ...d,
          displayStatus: d.active // Should be false for this list
      }));
      setDoctors(doctorsWithStatus);
    } catch (error) {
      console.error(`Error loading doctors for centre ${currentCentreId} (CentreDoctorActivation):`, error);
      const message = error.response?.data?.message || t('activation.alerts.fetchFailed.generic');
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        alert(t('activation.alerts.fetchFailed.authWithMessage', { message }));
        performLogout();
      } else {
        alert(t('activation.alerts.fetchFailed.genericWithMessage', { message }));
      }
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [sessionExpired, performLogout, t, currentUserDetails]); // Added currentUserDetails to dependencies

  // --- Initial Load Doctors when centreId is available ---
   useEffect(() => {
    if (centreId) {
        fetchDoctorsByCentre(centreId);
    }
  }, [centreId, fetchDoctorsByCentre]);


  // --- Delete Doctor Registration (Cancel Request) ---
  const handleDeleteDoctor = (doctorIdToDelete) => {
    console.log("[handleDeleteDoctor CentreDoctorActivation] Clicked. Target Doctor ID:", doctorIdToDelete);
    // Simplified permission check - rely on backend and ProtectedLayout
    if (!centreId) {
        alert(t('activation.alerts.deleteFailed.missingCentreInfo')); // Add new translation key
        return;
    }
    const token = getToken();
    if (!token) {
      alert(t('activation.alerts.sessionInvalid'));
      performLogout();
      return;
    }

    // Use the backend endpoint for deleting doctor by centre and user ID
    const deleteUrl = `http://localhost:6952/api/doctor-centre-examen/centre/${centreId}/doctor/${doctorIdToDelete}`;
    const confirmationMessage = t('activation.confirmations.deleteDoctor', { doctorId: doctorIdToDelete });

    if (window.confirm(confirmationMessage)) {
      setLoading(true);
      axios
        .delete(deleteUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(() => {
          alert(t('activation.alerts.deleteSuccess'));
          setDoctors((prevDoctors) => prevDoctors.filter((doc) => doc.id !== doctorIdToDelete));
        })
        .catch((error) => {
          console.error("Error deleting doctor:", error);
          const message = error.response?.data?.message || t('activation.alerts.deleteFailed.generic');
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
             alert(t('activation.alerts.deleteFailed.authWithMessage', { message }));
             performLogout();
          } else if (error.response && error.response.status === 404) {
             alert(t('activation.alerts.deleteFailed.notFoundWithMessage', { message }));
             // Optionally refetch if not found error occurs, maybe doctor was already deleted
             fetchDoctorsByCentre(centreId); // Refresh list
          } else {
             alert(t('activation.alerts.deleteFailed.genericWithMessage', { message }));
          }
        })
        .finally(() => {
            setLoading(false);
        });
    }
  };

  // --- Toggle Doctor Status (Activate/Deactivate) ---
  const handleToggleStatus = (doctorToToggle) => {
    console.log("[handleToggleStatus CentreDoctorActivation] Clicked. Target Doctor:", doctorToToggle);

    // Simplified permission check - rely on backend and ProtectedLayout
    if (!centreId) {
        alert(t('activation.alerts.toggleFailed.missingCentreInfo')); // Add new translation key
        return;
    }
    const token = getToken();
    if (!token) {
      alert(t('activation.alerts.sessionInvalid'));
      performLogout();
      return;
    }

    const targetDoctorId = doctorToToggle.id;
    // Use the backend endpoint for toggling status
    const toggleUrl = `http://localhost:6952/api/doctor-centre-examen/${targetDoctorId}/toggle-status`;
    // Confirmation message depends on the *intended* action (activating an inactive doctor)
    const confirmationMessage = t('activation.confirmations.activateDoctor', { doctorId: targetDoctorId });

    if (window.confirm(confirmationMessage)) {
      setLoading(true);
      axios
        .put(toggleUrl, null, { // PUT request with null body
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          const newStatus = response.data?.newStatus; // Expecting { message, doctorId, newStatus }
          alert(t('activation.alerts.toggleSuccess', { status: newStatus ? t('activation.status.active') : t('activation.status.inactive') }));
          console.log("Toggle status response:", response.data);
          // Since this page only shows inactive doctors, activating one means removing it from the list
          if (newStatus === true) {
              setDoctors((prevDoctors) => prevDoctors.filter((doc) => doc.id !== targetDoctorId));
          } else {
              // If somehow toggling resulted in inactive (shouldn't happen from this page), refresh list
              fetchDoctorsByCentre(centreId); // Refresh list
          }
        })
        .catch((error) => {
          console.error(`Error toggling doctor status:`, error);
          const message = error.response?.data?.message || t('activation.alerts.toggleFailed.generic');
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            alert(t('activation.alerts.toggleFailed.authWithMessage', { message }));
            performLogout();
          } else if (error.response && error.response.status === 404) {
            alert(t('activation.alerts.toggleFailed.notFoundWithMessage', { message }));
            fetchDoctorsByCentre(centreId); // Refresh list if doctor not found
          } else {
            alert(t('activation.alerts.toggleFailed.genericWithMessage', { message }));
          }
        })
        .finally(() => {
            setLoading(false);
        });
    }
  };


  // Filter doctors based on search term (first name, last name)
  const filteredDoctors = doctors.filter((doctor) => {
    const searchTermLower = searchTerm.toLowerCase();
    const docFirstName = doctor.firstName ? doctor.firstName.toLowerCase() : "";
    const docLastName = doctor.lastName ? doctor.lastName.toLowerCase() : "";
    const fullName = `${docFirstName} ${docLastName}`;
    const emailLower = doctor.email ? doctor.email.toLowerCase() : "";
    return fullName.includes(searchTermLower) || emailLower.includes(searchTermLower);
  });

  // Render the doctor table
  return (
    // Apply theme class to the container div
    <div className={`container mt-4 ${theme}`}>
      <h2>{t('activation.title')}</h2> {/* Reuse translation key */}
      <input
        type="text"
        placeholder={t('activation.searchPlaceholder')}
        value={searchTerm}
         onChange={(e) => setSearchTerm(e.target.value)}
         className="form-control mb-4" // Use Bootstrap class
       />
       {loading && <div className="text-center"><div className="spinner-border" role="status"><span className="visually-hidden">{t('activation.loading')}</span></div></div>}
       {/* Add Bootstrap responsive table wrapper */}
       <div className="table-responsive">
         {/* Apply theme class to the table */}
         <table className={`table table-striped table-hover custom-table ${theme === 'dark' ? 'table-dark' : ''}`}>
        <thead>
          <tr>
            <th>{t('activation.tableHeaders.firstName')}</th>
            <th>{t('activation.tableHeaders.lastName')}</th>
            <th>{t('activation.tableHeaders.email')}</th>
            <th>{t('activation.tableHeaders.speciality')}</th>
            <th>{t('activation.tableHeaders.centre')}</th> {/* Added Centre Name */}
            <th>{t('activation.tableHeaders.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {!loading && filteredDoctors.length === 0 ? (
            <tr>
              <td colSpan="6">{t('activation.noDoctorsFound')}</td>
            </tr>
          ) : (
            filteredDoctors.map((doctor) => (
              <tr key={doctor.id}>
                <td>{doctor.firstName}</td>
                <td>{doctor.lastName}</td>
                <td>{doctor.email}</td>
                <td>{doctor.speciality}</td>
                {/* Assuming doctor object has centreDexamen.name */}
                <td>{doctor.centreDexamen?.name || t('activation.unknownCentre')}</td>
                <td>
                  {/* Use Bootstrap button classes */}
                  <button
                    onClick={() => handleToggleStatus(doctor)}
                    className="btn btn-sm btn-success me-1"
                    disabled={loading}
                    title={t('activation.buttons.activateTooltip')} // Add tooltip
                  >
                    {t('activation.buttons.activate')}
                  </button>
                  <button
                    onClick={() => handleDeleteDoctor(doctor.id)}
                    className="btn btn-sm btn-danger"
                    disabled={loading}
                    title={t('activation.buttons.cancelTooltip')} // Add tooltip
                  >
                    {t('activation.buttons.cancel')}
                  </button>
                </td>
              </tr>
            ))
          )}
         </tbody>
       </table>
       </div> {/* Close table-responsive wrapper */}
     </div>
  );
};

export default CentreDoctorActivation; // Export renamed component
