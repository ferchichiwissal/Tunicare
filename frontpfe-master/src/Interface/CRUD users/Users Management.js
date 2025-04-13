import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getToken, clearUserData, isTokenExpired, getUserData } from "../../utils/auth";
import './Users Management.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const UserTable = () => {
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
    // const details = userDetails; // If using Context
    setCurrentUserDetails(details);
    console.log("Current User Details:", details);
  }, []); // Run once on mount

  // --- Fetch Users Function (Refactored) ---
  const fetchUsers = useCallback(async () => {
    if (sessionExpired || !currentUserDetails) return; // Wait for user details

    setLoading(true); // Start loading
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
    const isDoctor = roles.includes("ROLE_DOCTOR");
    const isAssistant = roles.includes("ROLE_ASSISTANT");

    if (isAdmin) {
      apiUrl = "http://localhost:6952/Users/doctors"; // Admin gets doctors
    } else if (isDoctor) {
      apiUrl = "http://localhost:6952/Users/cabinet/active-users"; // Doctor gets active users in cabinet
    } else if (isAssistant) {
      apiUrl = "http://localhost:6952/Users/cabinet/active-patients"; // Assistant gets active patients in cabinet
    } else {
      console.error("Unknown or unsupported user roles:", roles);
      setUsers([]);
      setLoading(false);
      return;
    }

    console.log(`Fetching users from ${apiUrl} for roles: ${roles}`);

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
      // This is a placeholder - the actual status might be more complex (per cabinet)
      const usersWithStatus = filteredData.map(u => ({
          ...u,
          // Attempt to determine status: Doctor/Assistant have direct 'active' field.
          // Patients' status depends on registration (not directly available here).
          // Default to true if field exists, otherwise assume active for display?
          // This needs refinement based on what the API actually returns for each role.
          displayStatus: u.active !== undefined ? u.active : true // Placeholder logic
      }));

      setUsers(usersWithStatus);
    } catch (error) {
      console.error(`Error loading users from ${apiUrl}:`, error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        alert("Access Denied or Session Expired. Please log in again.");
        performLogout();
      } else {
        alert("Failed to load user data. Please try again later.");
      }
      setUsers([]); // Clear users on error
    } finally {
      setLoading(false); // Stop loading
    }
  }, [sessionExpired, currentUserDetails, performLogout]); // Dependencies for useCallback

  // --- Initial Load Users ---
  useEffect(() => {
    if (currentUserDetails) { // Fetch only when details are available
        fetchUsers();
    }
  }, [currentUserDetails, fetchUsers]); // Trigger fetch when details load or fetchUsers changes


  // --- Delete User / Registration ---
  const handleDelete = (userIdToDelete) => { // Renamed function
    console.log("[handleDelete] Clicked. currentUserDetails:", JSON.stringify(currentUserDetails));

    // Check current user details are loaded
    if (!currentUserDetails) {
        console.error("[deleteUser] Check failed: currentUserDetails is null or undefined.");
        alert("Current user details not available. Please wait or try logging in again.");
        return;
    }
    if (!currentUserDetails.user) {
        console.error("[deleteUser] Check failed: currentUserDetails.user is missing.", currentUserDetails);
        alert("User core information missing in details. Please wait or try logging in again.");
        return;
    }
     // Check specifically for null or undefined, allowing 0 as a valid ID
     if (currentUserDetails.user.id == null) { // Use == null check
        console.error("[deleteUser] Check failed: currentUserDetails.user.id is null or undefined.", currentUserDetails);
        alert("Current User ID missing in details. Please wait or try logging in again.");
        return;
    }
    if (!currentUserDetails.roles) {
        console.error("[deleteUser] Check failed: currentUserDetails.roles is missing.", currentUserDetails);
        alert("Current User roles missing in details. Please wait or try logging in again.");
        return;
    }

    const token = getToken();
    const roles = currentUserDetails.roles; // Use state
    const cabinetId = currentUserDetails.cabinetId; // Use state
    const currentUserId = currentUserDetails.user.id; // Get current user ID from state
    console.log(`[deleteUser] Context: Target User ID=${userIdToDelete}, Actor Roles=${roles}, Actor Cabinet ID=${cabinetId}, Actor User ID=${currentUserId}`); // Log context

    const isAdmin = roles.includes("ROLE_ADMIN");
    const isDoctorOrAssistant = roles.includes("ROLE_DOCTOR") || roles.includes("ROLE_ASSISTANT");

    // **Enhanced Check:** Doctor/Assistant must have a cabinetId
    if (isDoctorOrAssistant && !cabinetId) {
        alert("Cannot perform action: Your cabinet information is missing.");
        return;
    }

    if (!token) { // Token check is likely redundant if currentUserDetails exists, but safe
      alert("Session invalid. Please log in again.");
      performLogout(); // Log out if token somehow missing despite details existing
      return;
    }

    let deleteUrl = "";
    let confirmationMessage = "";

    if (isAdmin) {
      deleteUrl = `http://localhost:6952/Users/delete/${userIdToDelete}`;
      confirmationMessage = "Are you sure you want to permanently delete this user and all their registrations?";
    } else if (isDoctorOrAssistant && cabinetId) {
      deleteUrl = `http://localhost:6952/Users/cabinet/${cabinetId}/user/${userIdToDelete}`;
 
      confirmationMessage = `Are you sure you want to remove this user's registration from your cabinet (ID: ${cabinetId})?`;
    } else {
      alert("You do not have permission to delete users or your cabinet ID is missing.");
      return;
    }

    if (window.confirm(confirmationMessage)) {
      axios
        .delete(deleteUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(() => {
          alert(isAdmin ? "User deleted successfully." : "User registration removed from this cabinet successfully.");
          // Refresh the list or filter locally
          setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userIdToDelete));
          // TODO: Consider fetching the list again for absolute accuracy, especially if deleting a registration might change the user's overall status (active/inactive)
        })
        .catch((error) => {
          console.error("Error during delete operation:", error);
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            alert("Permission denied or session expired.");
            performLogout();
          } else if (error.response && error.response.status === 404) {
             alert("User or registration not found.");
          } else {
            alert("Failed to perform the delete operation. Please try again later.");
          }
        });
    }
  };

  // --- Toggle User Status ---
  const handleToggleStatus = (targetUser) => {
    console.log("[handleToggleStatus] Clicked. Target User:", targetUser, "Current User Details:", JSON.stringify(currentUserDetails));

    // Check current user details are loaded
    const token = getToken();
    const actorRoles = currentUserDetails.roles;
    const actorCabinetId = currentUserDetails.cabinetId;
    const targetUserId = targetUser.id;
    const targetUserRole = targetUser.role; // Role of the user being toggled

    console.log(`[handleToggleStatus] Context: Target User ID=${targetUserId}, Target Role=${targetUserRole}, Actor Roles=${actorRoles}, Actor Cabinet ID=${actorCabinetId}`);

    if (!token) {
      alert("Session invalid. Please log in again.");
      performLogout();
      return;
    }

    let toggleUrl = "";
    let confirmationMessage = "";

    // Determine API endpoint and confirmation based on TARGET user's role
    if (targetUserRole === 'PATIENT') {
        // Patients are toggled via cabinet registration
        if (!actorCabinetId) {
            alert("Cannot toggle patient status: Your cabinet information is missing.");
            return;
        }
        // Admin cannot use this specific button for patients yet (needs cabinet context)
        if (actorRoles.includes("ROLE_ADMIN")) {
             alert("Admin role cannot use this toggle button for patients without specifying a target cabinet (UI enhancement needed).");
             return;
        }
        toggleUrl = `http://localhost:6952/Users/cabinet/${actorCabinetId}/user/${targetUserId}/toggle-status`;
        confirmationMessage = `Are you sure you want to toggle the active status for patient ID ${targetUserId} in your cabinet (ID: ${actorCabinetId})?`;

    } else if (targetUserRole === 'DOCTOR' || targetUserRole === 'ASSISTANT') {
        // Doctors/Assistants are toggled directly
        toggleUrl = `http://localhost:6952/Users/users/${targetUserId}/toggle-direct-status`;
        confirmationMessage = `Are you sure you want to toggle the active status for ${targetUserRole.toLowerCase()} ID ${targetUserId}?`;
        // Permission check for toggling Doctor/Assistant happens in the backend service
    } else {
        alert(`Cannot toggle status for user role: ${targetUserRole}`);
        return;
    }

    if (window.confirm(confirmationMessage)) {
      setLoading(true); // Indicate loading
      axios
        .put(toggleUrl, null, { // PUT request with null body
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          const newStatus = response.data?.isActiveNow; // Get the new status from response
          alert(`${targetUserRole} status successfully toggled. New status: ${newStatus ? 'Active' : 'Inactive'}.`);
          console.log("Toggle status response:", response.data);
          fetchUsers(); // Refetch the user list to reflect the change
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
            setLoading(false); // Stop loading
        });
    }
  };


  // Redirect to Edit
  const handleEditClick = (id) => {
    navigate(`/edit-user/${id}`);
  };

  // Filter users based on search term
  const filteredUsers = users.filter((user) => {
    const searchTermLower = searchTerm.toLowerCase();
    const userFirstName = user.firstName ? user.firstName.toLowerCase() : "";
    const userLastName = user.lastName ? user.lastName.toLowerCase() : "";
    const fullName = `${userFirstName} ${userLastName}`;
    return fullName.includes(searchTermLower);
  });

  return (
    <div>
      <h2>User List</h2>
      <input
        type="text"
        placeholder="Search by first name and last name (e.g., John Doe)"
        value={searchTerm}
         onChange={(e) => setSearchTerm(e.target.value)}
         className="form-control mb-4" // Use Bootstrap class
       />
       {loading && <p>Loading users...</p>} {/* Loading indicator */}
       {/* Add Bootstrap responsive table wrapper */}
       <div className="table-responsive">
         <table className="table table-striped table-hover custom-table"> {/* Add Bootstrap table classes */}
        <thead>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th> {/* Add Status column */}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {!loading && filteredUsers.length === 0 ? ( // Check loading state
            <tr>
              <td colSpan="6">No users found</td> {/* Adjusted colSpan */}
            </tr>
          ) : (
            filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td>{user.email ? user.email : "ce patient n'a pas d'email"}</td>
                <td>{user.role}</td>
                {/* Display status - Placeholder, needs refinement based on actual data */}
                <td>{user.displayStatus ? <span className="badge bg-success">Active</span> : <span className="badge bg-secondary">Inactive</span>}</td> {/* Use Bootstrap badges */}
                <td>
                  {/* Use Bootstrap button classes */}
                  <button onClick={() => handleEditClick(user.id)} className="btn btn-sm btn-primary me-1" disabled={loading}>Edit</button>
                  <button
                    onClick={() => handleDelete(user.id)} // Use handleDelete
                    className="btn btn-sm btn-danger me-1" // Use Bootstrap classes
                    disabled={loading} // Disable during loading
                  >
                    Delete
                  </button>
                   <button
                    onClick={() => handleToggleStatus(user)} // Pass the whole user object
                    className="btn btn-sm btn-warning" // Use btn-warning for toggle
                    disabled={loading} // Disable during loading
                  >
                    {user.displayStatus ? 'Deactivate' : 'Activate'} {/* Change button text based on status */}
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

export default UserTable;
