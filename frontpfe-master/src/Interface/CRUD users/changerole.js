 import React, { useEffect, useState,useCallback } from "react";
 import { useNavigate } from "react-router-dom";

import axios from "axios";
import { getToken, getRoles, clearUserData, isTokenExpired, getUserData } from "../../utils/auth"; // Import getUserData
import './changerole.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const UserManagement = () => {
  const navigate = useNavigate();
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
    alert("Session expired or logged out. Redirecting to login.");
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
      setError("You do not have permission to view patient data.");
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
          setError("Access Denied or Session Expired.");
          performLogout();
        } else {
          setError("Failed to load patient data. Please try again later.");
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
        alert("You do not have permission to perform this action.");
        return;
    }
     // Doctor/Assistant can only transfer to their own cabinet
     if ((userRoles.includes("ROLE_DOCTOR") || userRoles.includes("ROLE_ASSISTANT")) && targetCabinetId !== currentUserCabinetId) {
        alert("You can only transfer patients within your own cabinet.");
        return;
     }


    const confirmationMessage = `Are you sure you want to transfer patient ${userToChange.firstName} ${userToChange.lastName} (ID: ${patientUserId}) to the ${targetRoleString} role in cabinet ID ${targetCabinetId}?`;

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
            alert(`Patient successfully transferred to ${targetRoleString}. New User ID: ${response.data?.newUser?.id}`);
            console.log("Transfer response:", response.data);
            // Refresh list by removing the transferred patient
            setUsers(prevUsers => prevUsers.filter(user => user.id !== patientUserId));
            // Optionally, could call fetchUsers() again if needed
        })
        .catch((error) => {
            console.error(`Error transferring patient to ${targetRoleString}:`, error);
            const defaultMessage = `Failed to transfer patient to ${targetRoleString}. Please try again later.`;
            let alertMessage = defaultMessage;
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || defaultMessage;
                if (status === 401 || status === 403) {
                    alertMessage = `Permission Denied or Session Expired: ${message}`;
                    performLogout();
                } else if (status === 404) {
                    alertMessage = `Not Found: ${message}`;
                } else if (status === 400) {
                    alertMessage = `Bad Request: ${message}`;
                } else if (status === 409) { // Conflict (e.g., Doctor already exists)
                    alertMessage = `Conflict: ${message}`;
                } else {
                    alertMessage = `Error (${status}): ${message}`;
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
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // Determine if current user is Admin or Doctor/Assistant
  const isAdmin = userRoles.includes("ROLE_ADMIN");
  const isDoctorOrAssistant = userRoles.includes("ROLE_DOCTOR") || userRoles.includes("ROLE_ASSISTANT");

  return (
    <div className="changerole-container"> {/* Added container class */}
      <h1>User Role Management</h1>
      <input
        type="text"
        placeholder="Rechercher par nom et prénom"
        value={searchTerm}
         onChange={(e) => setSearchTerm(e.target.value)}
         className="form-control mb-4" // Use Bootstrap class
       />
       {/* Add Bootstrap responsive table wrapper */}
       <div className="table-responsive">
         <table className="table table-striped table-hover custom-table"> {/* Add Bootstrap table classes */}
        <thead>
          <tr>
         
            <th>Nom</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Transfert</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan="5">Aucun utilisateur trouvé</td>
            </tr>
          ) : (
            filteredUsers.map((user) => (
              <tr key={user.id}>
                
                <td>{user.firstName} {user.lastName}</td>
                <td>{user.email? user.email: "ce patient n'a pas d'email"}</td>
                <td>{user.role}</td> {/* Should always be PATIENT */}
                <td>
                  {isAdmin && user.registrations && (
                    <>
                      {user.registrations.length === 0 && (
                        <span>No cabinet registrations</span>
                      )}
                      {user.registrations.length === 1 && (
                        <select
                          id={`role-select-${user.id}`}
                          defaultValue=""
                          onChange={(e) => handleTransferPatient(user.id, e.target.value, user.registrations[0].cabinetId)}
                          disabled={loading}
                        >
                          <option value="" disabled>-- Select Role --</option>
                          <option value="DOCTOR">DOCTOR</option>
                          <option value="ASSISTANT">ASSISTANT</option>
                        </select>
                      )}
                      {user.registrations.length > 1 && (
                        <>
                          <select
                            id={`cabinet-select-${user.id}`}
                            defaultValue=""
                            onChange={(e) => handleTargetCabinetChange(user.id, e.target.value)}
                            disabled={loading}
                            style={{ marginRight: '10px' }}
                          >
                            <option value="" disabled>-- Select Cabinet --</option>
                            {user.registrations.map(reg => (
                              <option key={reg.cabinetId} value={reg.cabinetId}>
                                {reg.cabinetName || `Cabinet ID: ${reg.cabinetId}`} {/* Display name or ID */}
                              </option>
                            ))}
                          </select>
                          <select
                            id={`role-select-${user.id}`}
                            defaultValue=""
                            onChange={(e) => handleTransferPatient(user.id, e.target.value, selectedTargetCabinets[user.id])}
                            disabled={loading || !selectedTargetCabinets[user.id]} // Disable if no cabinet selected
                            title={!selectedTargetCabinets[user.id] ? "Select a target cabinet first" : ""}
                          >
                            <option value="" disabled>-- Select Role --</option>
                            <option value="DOCTOR">DOCTOR</option>
                            <option value="ASSISTANT">ASSISTANT</option>
                          </select>
                        </>
                      )}
                    </>
                  )}
                  {isDoctorOrAssistant && (
                    <button
                      onClick={() => handleTransferPatient(user.id, 'ASSISTANT', currentUserCabinetId)}
                      className="btn btn-theme-green" // Use custom theme green class
                      disabled={loading || !currentUserCabinetId} // Disable if doctor/assistant has no cabinet ID
                      title={!currentUserCabinetId ? "Your cabinet information is missing" : ""}
                    >
                      Changer en Assistant
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
