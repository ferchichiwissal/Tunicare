import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Import useTranslation
import axios from "axios";
import { getToken, clearUserData, isTokenExpired, getUserData } from "../../utils/auth";
import './Users Management.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const UserTable = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(); // Get translation function
  const [users, setUsers] = useState([]);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserDetails, setCurrentUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState('doctors'); // 'doctors' or 'doctorCentres'

  // --- Logout Function ---
  const performLogout = useCallback(() => { // Wrap in useCallback
    clearUserData();
    alert(t('userManagement.alerts.sessionExpired'));
    navigate("/sign-in");
  }, [navigate]); // Add navigate dependency

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
  }, [performLogout]); // Use performLogout dependency

  // --- Inactivity Logout Logic ---
  useEffect(() => {
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.log("Inactivity timeout reached.");
        setSessionExpired(true); // Mark session as expired
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
  }, [performLogout]); // Use performLogout dependency

  // --- Get Current User Details ---
  useEffect(() => {
    const details = getUserData(); // Use the correct function getUserData()
    // const details = userDetails; // If using Context
    setCurrentUserDetails(details);
    console.log("Current User Details:", details);
  }, []); // Run once on mount

  // --- Fetch Users Function (Refactored for View Type) ---
  const fetchUsers = useCallback(async () => {
    if (sessionExpired || !currentUserDetails) return; // Wait for user details

    setLoading(true); // Start loading
    setUsers([]); // Clear previous users
    const token = getToken();
    const roles = currentUserDetails?.roles;

    if (!token || !roles) {
      console.log("Token or roles missing, cannot fetch users.");
      setLoading(false);
      if (!token) performLogout(); // Logout if no token
      return;
    }

    let apiUrl = "";
    const isAdmin = roles.includes("ROLE_ADMIN");
    // Note: Only Admin can currently see the 'doctorCentres' view based on requirements
    // Other roles (Doctor, Assistant) will only see their relevant 'doctors' view.

    if (viewType === 'doctors') {
        const isDoctor = roles.includes("ROLE_DOCTOR");
        const isAssistant = roles.includes("ROLE_ASSISTANT");

        if (isAdmin) {
          apiUrl = "http://localhost:6952/Users/doctors"; // Admin gets all doctors
        } else if (isDoctor) {
          apiUrl = "http://localhost:6952/Users/cabinet/active-users"; // Doctor gets active users in their cabinet
        } else if (isAssistant) {
          apiUrl = "http://localhost:6952/Users/cabinet/active-patients"; // Assistant gets active patients in their cabinet
        } else {
          console.error("Unknown or unsupported user roles for 'doctors' view:", roles);
          setLoading(false);
          return;
        }
    } else if (viewType === 'doctorCentres' && isAdmin) {
        apiUrl = "http://localhost:6952/api/doctor-centre-examen/all"; // Admin gets ALL doctor centres (active and inactive)
    } else {
        console.error(`Unsupported viewType '${viewType}' or insufficient permissions for roles: ${roles}`);
        setLoading(false);
        return;
    }


    console.log(`Fetching users from ${apiUrl} for view: ${viewType}, roles: ${roles}`);

    try {
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`[fetchUsers] Raw data from ${apiUrl}:`, response.data);

      const currentUserId = currentUserDetails?.user?.id;
      let filteredData = response.data;
      if (currentUserId != null) { // Check for null/undefined
        // Filter out the current logged-in user
        filteredData = response.data.filter(user => user.id !== currentUserId);
        console.log(`[fetchUsers] Filtered data (removed self ID ${currentUserId}):`, filteredData);
      } else {
        console.warn("[fetchUsers] Could not filter self from user list because current user ID is missing.");
      }
      // Add a simple 'isActive' field for display purposes based on backend data
      // Map data, ensuring 'active' field is used for displayStatus
      const usersWithStatus = filteredData.map(u => ({
          ...u,
          // Use the 'active' field directly if it exists, otherwise default (e.g., true for simplicity)
          // DoctorCentreDexamen should have 'active' field from backend.
          // Regular doctors/patients might need adjustment based on API response structure.
          displayStatus: u.active !== undefined ? u.active : true
      }));

      setUsers(usersWithStatus);
      console.log(`[fetchUsers] Processed users for view '${viewType}':`, usersWithStatus);
    } catch (error) {
      console.error(`Error loading users from ${apiUrl} for view '${viewType}':`, error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        alert(t('userManagement.alerts.fetchFailed.auth'));
        performLogout();
      } else {
        alert(t('userManagement.alerts.fetchFailed.generic'));
      }
      setUsers([]); // Clear users on error
    } finally {
      setLoading(false); // Stop loading
    }
  }, [sessionExpired, currentUserDetails, performLogout, viewType]); // Dependencies for useCallback - ADDED viewType

  // --- Load Users on Mount and View Change ---
  useEffect(() => {
    if (currentUserDetails) { // Fetch only when details are available
        fetchUsers();
    }
  // Trigger fetch when details load, fetchUsers changes, OR viewType changes
  }, [currentUserDetails, fetchUsers, viewType]);


  // --- Delete User / Registration ---
  const handleDelete = (userToDelete) => { // Pass the whole user object
    const userIdToDelete = userToDelete.id;
    const userRoleToDelete = userToDelete.role; // Get role from the user object
    console.log(`[handleDelete] Clicked. Target User ID: ${userIdToDelete}, Role: ${userRoleToDelete}, View: ${viewType}, Current User:`, JSON.stringify(currentUserDetails));

    // Check current user details are loaded
    if (!currentUserDetails) {
        console.error("[deleteUser] Check failed: currentUserDetails is null or undefined.");
        alert(t('userManagement.alerts.deleteFailed.noCurrentUser'));
        return;
    }
    if (!currentUserDetails.user) {
        console.error("[deleteUser] Check failed: currentUserDetails.user is missing.", currentUserDetails);
        alert(t('userManagement.alerts.deleteFailed.missingUserInfo'));
        return;
    }
     // Check specifically for null or undefined, allowing 0 as a valid ID
     if (currentUserDetails.user.id == null) { // Use == null check
        console.error("[deleteUser] Check failed: currentUserDetails.user.id is null or undefined.", currentUserDetails);
        alert(t('userManagement.alerts.deleteFailed.missingUserId'));
        return;
    }
    if (!currentUserDetails.roles) {
        console.error("[deleteUser] Check failed: currentUserDetails.roles is missing.", currentUserDetails);
        alert(t('userManagement.alerts.deleteFailed.missingUserRoles'));
        return;
    }

    const token = getToken();
    const roles = currentUserDetails.roles; // Use state
    const cabinetId = currentUserDetails.cabinetId; // Use state
    const currentUserId = currentUserDetails.user.id; // Get current user ID from state
    console.log(`[deleteUser] Context: Target User ID=${userIdToDelete}, Actor Roles=${roles}, Actor Cabinet ID=${cabinetId}, Actor User ID=${currentUserId}`); // Log context

    const isAdmin = roles.includes("ROLE_ADMIN");
    const isDoctorOrAssistant = roles.includes("ROLE_DOCTOR") || roles.includes("ROLE_ASSISTANT");

    // **Enhanced Check:** Doctor/Assistant must have a cabinetId for certain actions
    if (viewType === 'doctors' && isDoctorOrAssistant && !cabinetId) {
        alert(t('userManagement.alerts.deleteFailed.missingCabinetInfo'));
        return;
    }

    if (!token) {
      alert(t('userManagement.alerts.sessionInvalid'));
      performLogout();
      return;
    }

    let deleteUrl = "";
    let confirmationMessage = "";
    let successMessageKey = "";

    if (viewType === 'doctors') {
        if (isAdmin) {
          deleteUrl = `http://localhost:6952/Users/delete/${userIdToDelete}`;
          confirmationMessage = t('userManagement.confirmations.deleteAdmin', { userId: userIdToDelete });
          successMessageKey = 'userManagement.alerts.deleteSuccess.admin';
        } else if (isDoctorOrAssistant && cabinetId) {
          // This deletes the registration from the cabinet
          deleteUrl = `http://localhost:6952/Users/cabinet/${cabinetId}/user/${userIdToDelete}`;
          confirmationMessage = t('userManagement.confirmations.deleteDoctorAssistant', { userId: userIdToDelete, cabinetId });
          successMessageKey = 'userManagement.alerts.deleteSuccess.doctorAssistant';
        } else {
          alert(t('userManagement.alerts.deleteFailed.permissionOrMissingCabinet'));
          return;
        }
    } else if (viewType === 'doctorCentres' && isAdmin) {
        // Deleting a DoctorCentreDexamen directly
        deleteUrl = `http://localhost:6952/api/doctor-centre-examen/${userIdToDelete}`;
        confirmationMessage = t('userManagement.confirmations.deleteDoctorCentre', { userId: userIdToDelete }); // Add new translation key
        successMessageKey = 'userManagement.alerts.deleteSuccess.doctorCentre'; // Add new translation key
    } else {
        alert(t('userManagement.alerts.deleteFailed.invalidViewOrPermission')); // Generic error for invalid state
        return;
    }


    if (window.confirm(confirmationMessage)) {
      setLoading(true);
      axios
        .delete(deleteUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(() => {
          alert(t(successMessageKey)); // Use dynamic success message key
          // Refresh the list or filter locally
          setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userIdToDelete));
          // Consider fetching the list again if needed: fetchUsers();
        })
        .catch((error) => {
          console.error(`Error during delete operation for view ${viewType}:`, error);
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            alert(t('userManagement.alerts.deleteFailed.auth'));
            performLogout();
          } else if (error.response && error.response.status === 404) {
             alert(t('userManagement.alerts.deleteFailed.notFound'));
          } else {
            alert(t('userManagement.alerts.deleteFailed.generic'));
          }
        });
    }
  };

  // --- Toggle User Status (Deactivate/Activate) ---
  const handleToggleStatus = (targetUser) => {
    console.log(`[handleToggleStatus] Clicked. Target User:`, targetUser, `View: ${viewType}`, "Current User Details:", JSON.stringify(currentUserDetails));

    // Check current user details are loaded
    const token = getToken();
    const actorRoles = currentUserDetails?.roles;
    const actorCabinetId = currentUserDetails?.cabinetId;
    const targetUserId = targetUser.id;
    const targetUserRole = targetUser.role; // Role of the user being toggled
    const currentStatus = targetUser.displayStatus; // Get current status from the mapped user data

    console.log(`[handleToggleStatus] Context: Target User ID=${targetUserId}, Target Role=${targetUserRole}, Current Status=${currentStatus}, Actor Roles=${actorRoles}, Actor Cabinet ID=${actorCabinetId}`);

    if (!token) {
      alert(t('userManagement.alerts.sessionInvalid')); // Reuse session invalid alert
      performLogout();
      return;
    }

    let toggleUrl = "";
    let confirmationMessageKey = ""; // Key for translation
    let successMessageKey = ""; // Key for translation

    if (viewType === 'doctors') {
        // Logic for toggling status of regular Doctors/Assistants/Patients
        if (targetUserRole === 'PATIENT') {
            if (!actorCabinetId) {
                alert(t('userManagement.alerts.toggleFailed.missingCabinetInfo')); return;
            }
            if (actorRoles.includes("ROLE_ADMIN")) {
                 alert(t('userManagement.alerts.toggleFailed.adminPatientLimitation')); return;
            }
            toggleUrl = `http://localhost:6952/Users/cabinet/${actorCabinetId}/user/${targetUserId}/toggle-status`;
            confirmationMessageKey = currentStatus ? 'userManagement.confirmations.deactivatePatient' : 'userManagement.confirmations.activatePatient';
            successMessageKey = 'userManagement.alerts.toggleSuccess'; // Generic success message
        } else if (targetUserRole === 'DOCTOR' || targetUserRole === 'ASSISTANT') {
            toggleUrl = `http://localhost:6952/Users/users/${targetUserId}/toggle-direct-status`;
            confirmationMessageKey = currentStatus ? 'userManagement.confirmations.deactivateDoctorAssistant' : 'userManagement.confirmations.activateDoctorAssistant';
            successMessageKey = 'userManagement.alerts.toggleSuccess'; // Generic success message
        } else {
            alert(t('userManagement.alerts.toggleFailed.invalidRole', { role: targetUserRole })); return;
        }
    } else if (viewType === 'doctorCentres' && actorRoles.includes("ROLE_ADMIN")) {
        // Logic for toggling status of DoctorCentreDexamen
        toggleUrl = `http://localhost:6952/api/doctor-centre-examen/${targetUserId}/toggle-status`;
        confirmationMessageKey = currentStatus ? 'userManagement.confirmations.deactivateDoctorCentre' : 'userManagement.confirmations.activateDoctorCentre'; // Add new keys
        successMessageKey = 'userManagement.alerts.toggleSuccessDoctorCentre'; // Add new key
    } else {
        alert(t('userManagement.alerts.toggleFailed.invalidViewOrPermission')); return;
    }

    const confirmationText = t(confirmationMessageKey, { userId: targetUserId, role: targetUserRole.toLowerCase(), cabinetId: actorCabinetId });

    if (window.confirm(confirmationText)) {
      setLoading(true);
      axios
        .put(toggleUrl, null, { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => {
          // Use the specific success message key
          const newStatus = viewType === 'doctorCentres' ? response.data?.newStatus : response.data?.isActiveNow;
          const statusText = newStatus ? t('userManagement.status.active') : t('userManagement.status.inactive');
          alert(t(successMessageKey, { role: targetUserRole, status: statusText, userId: targetUserId }));
          console.log(`Toggle status response for view ${viewType}:`, response.data);
          fetchUsers(); // Refetch the user list
        })
        .catch((error) => {
          console.error(`Error toggling ${targetUserRole} status in view ${viewType}:`, error);
          if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || "An error occurred.";
            if (status === 401 || status === 403) {
              alert(t('userManagement.alerts.toggleFailed.authWithMessage', { message }));
              performLogout();
            } else if (status === 404) {
              alert(t('userManagement.alerts.toggleFailed.notFoundWithMessage', { message }));
            } else if (status === 400) {
              alert(t('userManagement.alerts.toggleFailed.badRequestWithMessage', { message }));
            } else {
              alert(t('userManagement.alerts.toggleFailed.genericWithMessage', { message }));
            }
          } else {
            alert(t('userManagement.alerts.toggleFailed.networkError', { role: targetUserRole }));
          }
        })
        .finally(() => {
            setLoading(false); // Stop loading
        });
    }
  };


  // Redirect to Edit based on viewType
  const handleEditClick = (userToEdit) => {
    const id = userToEdit.id;
    if (viewType === 'doctors') {
        // Navigate to the existing edit form for regular users
        navigate(`/edit-user/${id}`);
    } else if (viewType === 'doctorCentres') {
        // Navigate to a new edit form for doctor centres (to be created)
        navigate(`/edit-doctor-centre/${id}`); // Define this route later
    } else {
        console.error("Cannot edit: Unknown view type", viewType);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter((user) => {
    const searchTermLower = searchTerm.toLowerCase();
    const userFirstName = user.firstName ? user.firstName.toLowerCase() : "";
    const userLastName = user.lastName ? user.lastName.toLowerCase() : "";
    const fullName = `${userFirstName} ${userLastName}`;
    return fullName.includes(searchTermLower);
  });

  // Only show radio buttons if the user is Admin
  const isAdmin = currentUserDetails?.roles?.includes("ROLE_ADMIN");

  return (
    <div>
      <h2 className="users-list-title">{t('userManagement.title')}</h2>

      {/* Radio Buttons for Admins */}
      {isAdmin && (
        <div className="mb-3">
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name="viewTypeRadio"
              id="viewDoctors"
              value="doctors"
              checked={viewType === 'doctors'}
              onChange={() => setViewType('doctors')}
            />
            <label className="form-check-label" htmlFor="viewDoctors">
              {t('userManagement.viewOptions.doctors')} {/* Add translation */}
            </label>
          </div>
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name="viewTypeRadio"
              id="viewDoctorCentres"
              value="doctorCentres"
              checked={viewType === 'doctorCentres'}
              onChange={() => setViewType('doctorCentres')}
            />
            <label className="form-check-label" htmlFor="viewDoctorCentres">
              {t('userManagement.viewOptions.doctorCentres')} {/* Add translation */}
            </label>
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder={t('userManagement.searchPlaceholder')}
        value={searchTerm}
         onChange={(e) => setSearchTerm(e.target.value)}
         className="form-control mb-4" // Use Bootstrap class
       />
       {loading && <p>{t('userManagement.loading')}</p>} {/* Loading indicator */}
       {/* Add Bootstrap responsive table wrapper */}
       <div className="table-responsive">
         <table className="table table-striped table-hover custom-table"> {/* Add Bootstrap table classes */}
        <thead>
          <tr>
            <th>{t('userManagement.tableHeaders.firstName')}</th>
            <th>{t('userManagement.tableHeaders.lastName')}</th>
            <th>{t('userManagement.tableHeaders.email')}</th>
            <th>{t('userManagement.tableHeaders.role')}</th>
            {/* Conditionally show Speciality for Doctor Centres */}
            {viewType === 'doctorCentres' && <th>{t('userManagement.tableHeaders.speciality')}</th>}
            <th>{t('userManagement.tableHeaders.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {!loading && filteredUsers.length === 0 ? (
            <tr>
              {/* Adjust colspan based on visible columns */}
              <td colSpan={viewType === 'doctorCentres' ? 7 : 6}>{t('userManagement.noUsersFound')}</td>
            </tr>
          ) : (
            filteredUsers.map((user) => {
              // Log speciality specifically for doctorCentres view for debugging
              if (viewType === 'doctorCentres') {
                console.log(`Rendering Doctor Centre ID: ${user.id}, Speciality:`, user.speciality);
              }
              return (
              <tr key={user.id}>
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td>{user.email ? user.email : t('userManagement.noEmail')}</td>
                <td>{user.role}</td>
                {/* Conditionally render Speciality */}
                {viewType === 'doctorCentres' && <td>{user.speciality ? user.speciality : 'N/A'}</td>}
                <td>
                  <div className="action-buttons-container">
                    <button onClick={() => handleEditClick(user)} className="btn btn-sm btn-custom-teal me-1 btn-edit-custom" disabled={loading} style={{ backgroundColor: '#00c6a9', borderColor: '#00c6a9', color: '#ffffff', minWidth: '120px', textAlign: 'center' }}>{t('userManagement.buttons.edit')} ✏️</button>
                    <button
                      onClick={() => handleDelete(user)} // Pass whole user object
                      className="btn btn-sm btn-custom-teal me-1"
                      disabled={loading}
                      style={{ backgroundColor: '#00c6a9', borderColor: '#00c6a9', color: '#ffffff', minWidth: '120px', textAlign: 'center' }}
                    >
                      {t('userManagement.buttons.delete')} 🗑️
                    </button>
                     <button
                      onClick={() => handleToggleStatus(user)}
                      className="btn btn-sm btn-custom-teal btn-toggle-status-custom"
                      disabled={loading}
                      style={{ backgroundColor: '#00c6a9', borderColor: '#00c6a9', color: '#ffffff', minWidth: '120px', textAlign: 'center' }}
                    >
                      {/* Use 'Deactivate'/'Activate' based on status */}
                      {user.displayStatus ? t('userManagement.buttons.deactivate') : t('userManagement.buttons.activate')} 🔻
                    </button>
                  </div>
                </td>
              </tr>
              );
            })
          )
  }
         </tbody>
       </table>
       </div> {/* Close table-responsive wrapper */}
     </div>
  );
};

export default UserTable;
