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
  useEffect(() => {
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
      // ASSUMPTION: This endpoint returns patients with their registrations array included
      apiUrl = "http://localhost:6952/Users/admin/patientsWithRegistrations"; // Corrected endpoint path for Admin
      console.log("Fetching patients with registrations for ADMIN from:", apiUrl);
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
        // Ensure data is an array and filter for patients
        const patientData = Array.isArray(response.data) ? response.data.filter(user => user.role === 'PATIENT') : [];
        // Make sure registrations is an array, default to empty if missing
        const patientsWithRegs = patientData.map(p => ({ ...p, registrations: Array.isArray(p.registrations) ? p.registrations : [] }));
        setUsers(patientsWithRegs);
        console.log(`Patients loaded from ${apiUrl}:`, patientsWithRegs);
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
  }, [performLogout]); // Use performLogout dependency

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
    <div className="changerole-container"> {/* Added container class */}
      <h1>{t('changeRole.title')}</h1>
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
            <th>{t('changeRole.tableHeaders.transfer')}</th>
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
                  {isAdmin && user.registrations && (
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
                          <select
                            id={`cabinet-select-${user.id}`}
                            defaultValue=""
                            onChange={(e) => handleTargetCabinetChange(user.id, e.target.value)}
                            disabled={loading}
                            style={{ marginRight: '10px' }}
                          >
                            <option value="" disabled>{t('changeRole.cabinetOptions.select')}</option>
                            {user.registrations.map(reg => (
                              <option key={reg.cabinetId} value={reg.cabinetId}>
                                {reg.cabinetName || t('changeRole.cabinetOptions.cabinetId', { id: reg.cabinetId })}
                              </option>
                            ))}
                          </select>
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
