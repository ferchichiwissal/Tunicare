import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getToken, clearUserData, isTokenExpired, getUserData } from "../../utils/auth"; // Corrected import path, removed getRoles
import './Tovalidate.css'; // Custom styles

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const CompteValide = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserDetails, setCurrentUserDetails] = useState(null);
  const [loading, setLoading] = useState(false); // Add loading state

  // --- Logout Function ---
  const performLogout = useCallback(() => { // Wrap in useCallback
    clearUserData();
    alert("Session expired or logged out. Redirecting to login.");
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
    setCurrentUserDetails(details);
    console.log("Current User Details (Tovalidate):", details);
  }, []); // Run once on mount

  // --- Fetch Users Function ---
  const fetchUsers = useCallback(async () => {
    if (sessionExpired || !currentUserDetails) return;

    setLoading(true);
    const token = getToken();
    const roles = currentUserDetails?.roles;

    if (!token || !roles) {
      console.log("Token or roles missing, cannot fetch users.");
      setLoading(false);
      if (!token) performLogout();
      return;
    }

    let apiUrl = "";
    const isAdmin = roles.includes("ROLE_ADMIN");
    const isDoctorOrAssistant = roles.includes("ROLE_DOCTOR") || roles.includes("ROLE_ASSISTANT");

    // API endpoints for Tovalidate component fetch INACTIVE users
    if (isAdmin) {
      // TODO: Backend endpoint /Users/inactiveusers needs verification/creation
      apiUrl = "http://localhost:6952/Users/inactiveusers"; // Placeholder
      console.log("Fetching all inactive users for ADMIN (Tovalidate) - API NEEDS CHECK");
    } else if (isDoctorOrAssistant) {
      apiUrl = "http://localhost:6952/Users/cabinet/inactive-users"; // Fetches inactive users in cabinet
      console.log("Fetching cabinet inactive users for DOCTOR/ASSISTANT (Tovalidate)");
    } else {
      console.error("Unknown or unsupported user roles:", roles);
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`[fetchUsers Tovalidate] Raw data from ${apiUrl}:`, response.data);
      // Add displayStatus - for inactive list, it should generally be false
      const usersWithStatus = response.data.map(u => ({
          ...u,
          displayStatus: false // Assume false for users in this list
      }));
      setUsers(usersWithStatus);
    } catch (error) {
      console.error(`Error loading inactive users from ${apiUrl} (Tovalidate):`, error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        alert("Access Denied or Session Expired. Please log in again.");
        performLogout();
      } else {
        // Handle case where Admin endpoint might not exist yet
        if (isAdmin && error.response && error.response.status === 404) {
             alert("Failed to load inactive users: Admin endpoint might not be available.");
        } else {
            alert("Failed to load inactive user data. Please try again later.");
        }
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [sessionExpired, currentUserDetails, performLogout]);

  // --- Initial Load Users ---
   useEffect(() => {
    if (currentUserDetails) {
        fetchUsers();
    }
  }, [currentUserDetails, fetchUsers]);


  // Delete User Registration (Cancel Request)
  const deleteUserRegistration = (userIdToDelete) => {
    console.log("[deleteUserRegistration] Clicked. currentUserDetails:", JSON.stringify(currentUserDetails));
    if (!currentUserDetails || !currentUserDetails.user || !currentUserDetails.roles) {
        console.error("[deleteUserRegistration] Check failed: currentUserDetails incomplete.", currentUserDetails);
        alert("User details not fully loaded. Please wait or try logging in again.");
        return;
    }
    const token = getToken();
    const roles = currentUserDetails.roles; // Use state
    const cabinetId = currentUserDetails.cabinetId; // Use state
    console.log(`[deleteUserRegistration] Context: Target User ID=${userIdToDelete}, Actor Roles=${roles}, Actor Cabinet ID=${cabinetId}`); // Log context

    if (!token) {
      alert("Session invalid. Please log in again.");
      performLogout();
      return;
    }

    const isAdmin = roles.includes("ROLE_ADMIN");
    const isDoctorOrAssistant = roles.includes("ROLE_DOCTOR") || roles.includes("ROLE_ASSISTANT");

    // For Doctor/Assistant, cabinetId is required.
    if (isDoctorOrAssistant && !cabinetId) {
        alert("Cannot perform action: Your cabinet information is missing.");
        return;
    }

    // For Admin, the current API requires a cabinet ID. This UI doesn't provide it for the target user.
    // Option 1: Disable for Admin. Option 2: Try to find the user's cabinet (needs API change or more data).
    // Let's disable for Admin for now on this specific component.
    if (isAdmin) {
        alert("Admin cannot cancel registration directly from this screen without cabinet context (UI enhancement needed). Use the main User Management screen if applicable.");
        return;
    }

    // Construct the specific registration deletion URL
    const deleteUrl = `http://localhost:6952/Users/cabinet/${cabinetId}/user/${userIdToDelete}`;
    const confirmationMessage = `Are you sure you want to delete this user's registration request from your cabinet (ID: ${cabinetId})?`;


    if (window.confirm(confirmationMessage)) {
      axios
        .delete(deleteUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(() => {
          alert("User registration request cancelled (deleted).");
          setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userIdToDelete));
        })
        .catch((error) => {
          console.error("Error deleting user registration:", error);
          if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || "An error occurred.";
             if (status === 401 || status === 403) {
               alert(`Permission Denied or Session Expired: ${message}`);
               performLogout();
             } else if (status === 404) {
                alert(`Not Found: ${message}`);
             } else {
               alert(`Failed to delete registration: ${message}`);
             }
          } else {
             alert("Failed to delete the registration due to a network or unexpected error.");
          }
        });
    }
  };

  // Activate Patient Registration (Confirm Request)
  const activatePatient = (patientId) => {
    console.log("[activatePatient] Clicked. currentUserDetails:", JSON.stringify(currentUserDetails));
    if (!currentUserDetails || !currentUserDetails.user || !currentUserDetails.roles) {
        console.error("[activatePatient] Check failed: currentUserDetails incomplete.", currentUserDetails);
        alert("User details not fully loaded. Please wait or try logging in again.");
        return;
    }
    const token = getToken();
    const roles = currentUserDetails.roles; // Use state
    const cabinetId = currentUserDetails.cabinetId; // Use state
    console.log(`[activatePatient] Context: Target Patient ID=${patientId}, Actor Roles=${roles}, Actor Cabinet ID=${cabinetId}`); // Log context

    if (!token) {
      alert("Session invalid. Please log in again.");
      performLogout();
      return;
    }

    // Check if the current user is authorized (Doctor/Assistant with a cabinet)
    const isAuthorized = (roles.includes("ROLE_DOCTOR") || roles.includes("ROLE_ASSISTANT")) && cabinetId;
    if (!isAuthorized) {
      // Admin cannot use this button here as we don't know the target cabinet context
      alert("Only Doctors or Assistants associated with a cabinet can confirm registrations from this screen.");
      return;
    }

    const targetCabinetId = cabinetId; // Use the logged-in Doctor/Assistant's cabinet ID

    if (window.confirm(`Are you sure you want to activate patient ID ${patientId} in your cabinet (${targetCabinetId})?`)) {
      axios
             // toggleUrl = `http://localhost:6952/Users/cabinet/${actorCabinetId}/user/${targetUserId}/toggle-status`;

        // Use the toggle endpoint - calling it on an inactive user will activate them
        .put(`http://localhost:6952/Users/cabinet/${targetCabinetId}/Users/${patientId}/toggle-status`, null, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
           const isActive = response.data?.isActiveNow;
           if (isActive) { // Check if the toggle resulted in activation
             alert("Patient has been successfully activated.");
             // Remove the user from this list as they are now active
             setUsers((prevUsers) => prevUsers.filter((user) => user.id !== patientId));
           } else {
             // This shouldn't happen if we are activating an inactive user, but handle defensively
             alert("Patient status toggled, but they are still inactive. Please check the details.");
             console.warn("Toggle endpoint called, but user remained inactive:", response.data);
             // Optionally refetch the list here to show the current (still inactive) state
           }
        })
        .catch((error) => {
          console.error("Error activating patient:", error);
          if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || "An error occurred.";
            if (status === 401 || status === 403) {
              alert(`Permission Denied or Session Expired: ${message}`);
              performLogout();
            } else if (status === 404) {
              alert(`Not Found: ${message}`);
            } else if (status === 400) {
               alert(`Bad Request: ${message}`);
            } else {
              alert(`Failed to activate patient: ${message}`);
            }
          } else {
            alert("Failed to activate the patient due to a network or unexpected error.");
          }
        });
    }
  };

  // --- Toggle User Status (Copied from Users Management) ---
  const handleToggleStatus = (targetUser) => {
    console.log("[handleToggleStatus Tovalidate] Clicked. Target User:", targetUser, "Current User Details:", JSON.stringify(currentUserDetails));

    if (!currentUserDetails || !currentUserDetails.user || !currentUserDetails.roles) {
        console.error("[handleToggleStatus Tovalidate] Check failed: currentUserDetails incomplete.", currentUserDetails);
        alert("User details not fully loaded. Please wait or try logging in again.");
        return;
    }
    const token = getToken();
    const actorRoles = currentUserDetails.roles;
    const actorCabinetId = currentUserDetails.cabinetId;
    const targetUserId = targetUser.id;
    const targetUserRole = targetUser.role;

    console.log(`[handleToggleStatus Tovalidate] Context: Target User ID=${targetUserId}, Target Role=${targetUserRole}, Actor Roles=${actorRoles}, Actor Cabinet ID=${actorCabinetId}`);

    if (!token) {
      alert("Session invalid. Please log in again.");
      performLogout();
      return;
    }

    let toggleUrl = "";
    let confirmationMessage = "";

    // Determine API endpoint based on TARGET user's role
    if (targetUserRole === 'PATIENT') {
        if (!actorCabinetId) {
            alert("Cannot toggle patient status: Your cabinet information is missing.");
            return;
        }
        if (actorRoles.includes("ROLE_ADMIN")) {
             alert("Admin role cannot use this toggle button for patients without specifying a target cabinet (UI enhancement needed).");
             return;
        }
        // Corrected URL
        toggleUrl = `http://localhost:6952/Users/cabinet/${actorCabinetId}/user/${targetUserId}/toggle-status`;
        // Since this list shows inactive users, toggling likely means activating
        confirmationMessage = `Are you sure you want to activate patient ID ${targetUserId} in your cabinet (ID: ${actorCabinetId})?`;

    } else if (targetUserRole === 'DOCTOR' || targetUserRole === 'ASSISTANT') {
        // Toggling Doctor/Assistant status might not be relevant in "Tovalidate" list
        // but implement the call if needed.
        toggleUrl = `http://localhost:6952/Users/users/${targetUserId}/toggle-direct-status`;
        confirmationMessage = `Are you sure you want to toggle the active status for ${targetUserRole.toLowerCase()} ID ${targetUserId}? (This user might be removed from this list if activated)`;
    } else {
        alert(`Cannot toggle status for user role: ${targetUserRole}`);
        return;
    }

    if (window.confirm(confirmationMessage)) {
      setLoading(true);
      axios
        .put(toggleUrl, null, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          const newStatus = response.data?.isActiveNow;
          alert(`${targetUserRole} status successfully toggled. New status: ${newStatus ? 'Active' : 'Inactive'}.`);
          console.log("Toggle status response:", response.data);
          fetchUsers(); // Refetch the list
        })
        .catch((error) => {
          console.error(`Error toggling ${targetUserRole} status:`, error);
          if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || "An error occurred.";
            if (status === 401 || status === 403) {
              alert(`Permission Denied or Session Expired: ${message}`);
              performLogout();
            } else if (status === 404) {
              alert(`Not Found: ${message}`);
            } else if (status === 400) {
              alert(`Bad Request: ${message}`);
            } else {
              alert(`Failed to toggle status: ${message}`);
            }
          } else {
            alert(`Failed to toggle the ${targetUserRole} status due to a network or unexpected error.`);
          }
        })
        .finally(() => {
            setLoading(false);
        });
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

  // Render the user table
  return (
    <div>
      <h2>Users Pending Validation</h2>
      <input
        type="text"
        placeholder="Search by first name and last name (e.g., John Doe)"
        value={searchTerm}
         onChange={(e) => setSearchTerm(e.target.value)}
         className="form-control mb-4" // Use Bootstrap class
       />
       {loading && <p>Loading...</p>}
       {/* Add Bootstrap responsive table wrapper */}
       <div className="table-responsive">
         <table className="table table-striped table-hover custom-table"> {/* Add Bootstrap table classes */}
        <thead>
          <tr>
            <th>ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th> {/* Changed header */}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {!loading && filteredUsers.length === 0 ? (
            <tr>
              <td colSpan="7">No users pending validation found</td>
            </tr>
          ) : (
            filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.displayStatus ? <span className="badge bg-success">Active</span> : <span className="badge bg-secondary">Inactive/Pending</span>}</td> {/* Use Bootstrap badges */}
                <td>
                  {/* Use Bootstrap button classes */}
                  <button onClick={() => handleToggleStatus(user)} className="btn btn-sm btn-success me-1" disabled={loading}> {/* Activate button */}
                    Activate
                  </button>
                  <button onClick={() => deleteUserRegistration(user.id)} className="btn btn-sm btn-danger" disabled={loading}> {/* Cancel/Delete button */}
                    Cancel
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

export default CompteValide;
