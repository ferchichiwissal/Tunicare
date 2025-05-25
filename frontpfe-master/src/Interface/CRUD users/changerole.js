 import React, { useEffect, useState,useCallback } from "react";
 import { useNavigate } from "react-router-dom";
 import { useTranslation } from "react-i18next"; // Import useTranslation
import axios from "axios";
import { getToken, getRoles, clearUserData, isTokenExpired, getUserData } from "../../utils/auth"; // Import getUserData
import './changerole.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const UserManagement = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(); // Get translation function
  const [viewMode, setViewMode] = useState('doctors'); // 'doctors' ou 'doctorsCentre'
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userRoles, setUserRoles] = useState([]);
  const [currentUserCabinetId, setCurrentUserCabinetId] = useState(null);
  const [selectedTargetCabinets, setSelectedTargetCabinets] = useState({}); // State for Admin's target cabinet selection
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Logout Function (using useCallback) ---
  const performLogout = useCallback(() => {
    clearUserData();
    alert(t('changeRole.alerts.sessionExpired'));
    navigate("/sign-in");
  }, [navigate]);
  // Removed extra closing brace here

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
      } catch (err) {
        console.error("Error decoding token for expiry check:", err);
        performLogout();
      }
    }
  }, [performLogout]); // Use performLogout dependency

  // --- Inactivity Logout Logic ---
  useEffect(() => {
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(performLogout, INACTIVITY_TIMEOUT);
    };
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    activityEvents.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [performLogout]); // Use performLogout dependency

  // --- Load User Details and Patients Based on Role ---
  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);

    const token = getToken();
    const userData = getUserData(); // Get all user data

    if (!token || !userData || !userData.roles) {
      performLogout();
      return;
    }

    const roles = userData.roles;
    const cabinetId = userData.cabinetId; // Get cabinetId

    setUserRoles(roles); // Store roles
    setCurrentUserCabinetId(cabinetId); // Store cabinet ID
    console.log("User Data Loaded:", userData);

    let apiUrl = "";
    if (roles.includes("ROLE_ADMIN")) {
      if (viewMode === 'doctors') {
        apiUrl = "http://localhost:6952/Users/admin/patientsWithRegistrations";
        console.log("Fetching patients with registrations for ADMIN from:", apiUrl);
      } else {
        apiUrl = "http://localhost:6952/api/doctor-admin/doctors-centre";
        console.log("Fetching doctors centre examen for ADMIN from:", apiUrl);
      }
    } else if (roles.includes("ROLE_DOCTOR") || roles.includes("ROLE_ASSISTANT")) {
      apiUrl = "http://localhost:6952/Users/cabinet/patients"; // This likely returns only patients in the specific cabinet
      console.log("Fetching cabinet patients for DOCTOR/ASSISTANT");
    } else {
      console.error("Unsupported role for viewing patients:", roles);
      setError(t('changeRole.errors.fetch.permissionDeniedView'));
      setLoading(false);
      setUsers([]);
      return;
    }

    axios
      .get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((response) => {
        if (viewMode === 'doctors') {
          // Ensure data is an array and filter for patients
          const patientData = Array.isArray(response.data) ? response.data.filter(user => user.role === 'PATIENT') : [];
          // Make sure registrations is an array, default to empty if missing
          const patientsWithRegs = patientData.map(p => ({ ...p, registrations: Array.isArray(p.registrations) ? p.registrations : [] }));
          setUsers(patientsWithRegs);
          console.log(`Patients loaded from ${apiUrl}:`, patientsWithRegs);
        } else {
          // Pour les doctor_centre_examen
          const doctorsData = Array.isArray(response.data) ? response.data : [];
          setUsers(doctorsData);
          console.log(`Doctors loaded from ${apiUrl}:`, doctorsData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(`Error loading patients from ${apiUrl}:`, err);
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          setError(t('changeRole.errors.fetch.auth'));
          performLogout();
        } else {
          setError(t('changeRole.errors.fetch.generic'));
        }
        setLoading(false);
      });
  }, [performLogout, viewMode, t]); // Dépendances de useCallback

  // Initial data load and mode change reload
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // Use fetchUsers as dependency

  // --- Handle Target Cabinet Selection (Admin) ---
  const handleTargetCabinetChange = (patientUserId, selectedCabinetId) => {
    setSelectedTargetCabinets(prev => ({
      ...prev,
      [patientUserId]: selectedCabinetId ? parseInt(selectedCabinetId, 10) : null, // Store as number or null
    }));
    // Reset role dropdown when cabinet changes
    const roleSelect = document.getElementById(`role-select-${patientUserId}`);
    if (roleSelect) roleSelect.value = "";
  };


  // --- Handle Patient Transfer ---
  // Modified to accept targetCabinetId explicitly
  const handleTransferPatient = (patientUserId, targetRoleString, targetCabinetId) => {
    console.log(`[handleTransferPatient] User: ${patientUserId}, Target Role: ${targetRoleString}, Target Cabinet: ${targetCabinetId}`);

    const userToChange = users.find(u => u.id === patientUserId);
    if (!userToChange || !targetRoleString || !targetCabinetId) {
        console.error("Missing data for transfer:", { patientUserId, targetRoleString, targetCabinetId });
        // Reset selects if they exist
        const cabinetSelect = document.getElementById(`cabinet-select-${patientUserId}`);
        const roleSelect = document.getElementById(`role-select-${patientUserId}`);
        if (cabinetSelect) cabinetSelect.value = "";
        if (roleSelect) roleSelect.value = "";
        setSelectedTargetCabinets(prev => ({ ...prev, [patientUserId]: null })); // Clear selected cabinet state
        return;
    }

    // Basic permission check (should be redundant if UI is correct, but safe)
    if (!userRoles.includes("ROLE_ADMIN") && !userRoles.includes("ROLE_DOCTOR") && !userRoles.includes("ROLE_ASSISTANT")) {
        alert(t('changeRole.alerts.transferFailed.permissionDeniedAction'));
        return;
    }
     // Doctor/Assistant can only transfer to their own cabinet
     if ((userRoles.includes("ROLE_DOCTOR") || userRoles.includes("ROLE_ASSISTANT")) && targetCabinetId !== currentUserCabinetId) {
        alert(t('changeRole.alerts.transferFailed.wrongCabinet'));
        return;
     }


    const confirmationMessage = t('changeRole.confirmations.transfer', { firstName: userToChange.firstName, lastName: userToChange.lastName, userId: patientUserId, role: targetRoleString, cabinetId: targetCabinetId });

    if (window.confirm(confirmationMessage)) {
        setLoading(true);
        const token = getToken();
        if (!token) return performLogout();

        const params = new URLSearchParams();
        params.append('patientUserId', patientUserId);
        params.append('targetCabinetId', targetCabinetId);
        params.append('targetRoleString', targetRoleString);

        axios.post("http://localhost:6952/Users/transferPatient", params, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded' // For @RequestParam
            },
        })
        .then((response) => {
            alert(t('changeRole.alerts.transferSuccess', { role: targetRoleString, newUserId: response.data?.newUser?.id }));
            console.log("Transfer response:", response.data);
            // Refresh list by removing the transferred patient
            setUsers(prevUsers => prevUsers.filter(user => user.id !== patientUserId));
            // Optionally, could call fetchUsers() again if needed
        })
        .catch((error) => {
            console.error(`Error transferring patient to ${targetRoleString}:`, error);
            const defaultMessage = t('changeRole.errors.transfer.generic', { role: targetRoleString });
            let alertMessage = defaultMessage;
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || defaultMessage;
                if (status === 401 || status === 403) {
                    alertMessage = t('changeRole.errors.transfer.authWithMessage', { message });
                    performLogout();
                } else if (status === 404) {
                    alertMessage = t('changeRole.errors.transfer.notFoundWithMessage', { message });
                } else if (status === 400) {
                    alertMessage = t('changeRole.errors.transfer.badRequestWithMessage', { message });
                } else if (status === 409) { // Conflict (e.g., Doctor already exists)
                    alertMessage = t('changeRole.errors.transfer.conflictWithMessage', { message });
                } else {
                    alertMessage = t('changeRole.errors.transfer.otherErrorWithMessage', { status, message });
                }
            }
            alert(alertMessage);
            // Reset selects on error
            const cabinetSelect = document.getElementById(`cabinet-select-${patientUserId}`);
            const roleSelect = document.getElementById(`role-select-${patientUserId}`);
            if (cabinetSelect) cabinetSelect.value = "";
            if (roleSelect) roleSelect.value = "";
            setSelectedTargetCabinets(prev => ({ ...prev, [patientUserId]: null })); // Clear selected cabinet state
        })
        .finally(() => {
            setLoading(false);
        });
    } else {
        // Reset selects if confirmation is cancelled
        const cabinetSelect = document.getElementById(`cabinet-select-${patientUserId}`);
        const roleSelect = document.getElementById(`role-select-${patientUserId}`);
        if (cabinetSelect) cabinetSelect.value = "";
        if (roleSelect) roleSelect.value = "";
        setSelectedTargetCabinets(prev => ({ ...prev, [patientUserId]: null })); // Clear selected cabinet state
    }
  };


    // --- Handle Doctor to Admin Conversion ---
    const handleDoctorToAdminConversion = (doctorId) => {
      if (window.confirm(t('changeRole.confirmations.convertToAdmin'))) {
        setLoading(true);
        const token = getToken();
        if (!token) return performLogout();

        axios.post(`http://localhost:6952/api/doctor-admin/convert-to-admin?doctorId=${doctorId}`, null, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        .then(() => {
          alert(t('changeRole.alerts.conversionSuccess'));
          setUsers(prevUsers => prevUsers.filter(user => user.id !== doctorId));
        })
        .catch((error) => {
          console.error('Erreur lors de la conversion:', error);
          alert(t('changeRole.alerts.conversionError'));
        })
        .finally(() => {
          setLoading(false);
        });
      }
    };

    // --- Filtering Logic ---
  const filteredUsers = users.filter((user) => {
    const searchTermLower = searchTerm.toLowerCase();
    const userFirstName = user.firstName ? user.firstName.toLowerCase() : "";
    const userLastName = user.lastName ? user.lastName.toLowerCase() : "";
    const fullName = `${userFirstName} ${userLastName}`;
    return fullName.includes(searchTermLower);
  });

  if (loading) {
    return <div>{t('changeRole.loading')}</div>;
  }

  if (error) {
    return <div>{t('changeRole.errorPrefix')}: {error}</div>;
  }

  // Determine if current user is Admin or Doctor/Assistant
  const isAdmin = userRoles.includes("ROLE_ADMIN");
  const isDoctorOrAssistant = userRoles.includes("ROLE_DOCTOR") || userRoles.includes("ROLE_ASSISTANT");

  return (
    <div className="changerole-container">
      <h1>{t('changeRole.title')}</h1>
      {isAdmin && (
        <div className="view-mode-selector mb-4">
          <div className="form-check form-check-inline">
            <input
              type="radio"
              id="doctorsMode"
              name="viewMode"
              value="doctors"
              checked={viewMode === 'doctors'}
              onChange={(e) => setViewMode(e.target.value)}
              className="form-check-input"
            />
            <label className="form-check-label" htmlFor="doctorsMode">
              {t('changeRole.viewMode.doctors')}
            </label>
          </div>
          <div className="form-check form-check-inline">
            <input
              type="radio"
              id="doctorsCentreMode"
              name="viewMode"
              value="doctorsCentre"
              checked={viewMode === 'doctorsCentre'}
              onChange={(e) => setViewMode(e.target.value)}
              className="form-check-input"
            />
            <label className="form-check-label" htmlFor="doctorsCentreMode">
              {t('changeRole.viewMode.doctorsCentre')}
            </label>
          </div>
        </div>
      )}
      <input
        type="text"
        placeholder={t('changeRole.searchPlaceholder')}
        value={searchTerm}
         onChange={(e) => setSearchTerm(e.target.value)}
         className="form-control mb-4" // Use Bootstrap class
       />
       {/* Add Bootstrap responsive table wrapper */}
       <div className="table-responsive">
         <table className="table table-striped table-hover custom-table"> {/* Add Bootstrap table classes */}
        <thead>
          <tr>
         
            <th>{t('changeRole.tableHeaders.name')}</th>
            <th>{t('changeRole.tableHeaders.email')}</th>
            <th>{t('changeRole.tableHeaders.role')}</th>
            <th>{viewMode === 'doctors' ? t('changeRole.tableHeaders.transfer') : t('changeRole.tableHeaders.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan="5">{t('changeRole.noUsersFound')}</td>
            </tr>
          ) : (
            filteredUsers.map((user) => (
              <tr key={user.id}>
                
                <td>{user.firstName} {user.lastName}</td>
                <td>{user.email? user.email: t('changeRole.noEmail')}</td>
                <td>{user.role}</td> {/* Should always be PATIENT */}
                <td>
                  {isAdmin && viewMode === 'doctors' && user.registrations && (
                    <>
                      {user.registrations.length === 0 && (
                        <span>{t('changeRole.noRegistrations')}</span>
                      )}
                      {/* Admin View: Single Registration */}
                      {user.registrations.length === 1 && (
                        <button
                          onClick={() => handleTransferPatient(user.id, 'DOCTOR', user.registrations[0].cabinetId)}
                          className="btn btn-sm btn-primary" // Use standard Bootstrap button style or theme class
                          disabled={loading}
                        >
                          {t('changeRole.buttons.changeToDoctor')} {/* New Translation Key */}
                        </button>
                      )}
                      {/* Admin View: Multiple Registrations */}
                      {user.registrations.length > 1 && (
                        <>
                          {/* Sélecteur de cabinet supprimé */}
                          {/* Button replaces the role dropdown */}
                          <button
                            onClick={() => handleTransferPatient(user.id, 'DOCTOR', selectedTargetCabinets[user.id])}
                            className="btn btn-sm btn-primary" // Use standard Bootstrap button style or theme class
                            disabled={loading || !selectedTargetCabinets[user.id]} // Disable if no cabinet selected
                            title={!selectedTargetCabinets[user.id] ? t('changeRole.tooltips.selectCabinetFirst') : ""}
                          >
                            {t('changeRole.buttons.changeToDoctor')} {/* New Translation Key */}
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {isAdmin && viewMode === 'doctorsCentre' && (
                    <button
                      onClick={() => handleDoctorToAdminConversion(user.id)}
                      className="btn btn-sm btn-warning"
                      disabled={loading}
                    >
                      {t('changeRole.buttons.convertToAdmin')}
                    </button>
                  )}
                  {/* Doctor View */}
                  {userRoles.includes("ROLE_DOCTOR") && (
                    <button
                      onClick={() => handleTransferPatient(user.id, 'ASSISTANT', currentUserCabinetId)} // Target role ASSISTANT
                      className="btn btn-sm btn-primary"
                      disabled={loading || !currentUserCabinetId}
                      title={!currentUserCabinetId ? t('changeRole.tooltips.missingCabinetInfo') : ""}
                    >
                      {t('changeRole.buttons.changeToAssistant')} {/* New text key */}
                    </button>
                  )}
                  {/* Assistant View - Now same as Doctor View */}
                  {userRoles.includes("ROLE_ASSISTANT") && (
                    <button
                      onClick={() => handleTransferPatient(user.id, 'ASSISTANT', currentUserCabinetId)} // Target role ASSISTANT
                      className="btn btn-sm btn-primary"
                      disabled={loading || !currentUserCabinetId}
                      title={!currentUserCabinetId ? t('changeRole.tooltips.missingCabinetInfo') : ""}
                    >
                      {t('changeRole.buttons.changeToAssistant')} {/* Use same text key as Doctor */}
                    </button>
                  )}
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

export default UserManagement;
