import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
// jwtDecode is no longer needed here
import { getToken, getRoles, clearUserData, isTokenExpired } from "../../utils/auth"; // Corrected import path
import './bloque.css'; // Import the CSS file

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes (consistent with userlist)

const ComptenotValide = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // State for search

  // --- Logout Function ---
  const performLogout = () => {
    clearUserData(); // Use the function from auth.js
    alert("Session expired or logged out. Redirecting to login.");
    navigate("/sign-in"); // Redirect to login page
  };

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
  }, [navigate]);

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
  }, [navigate]);

  // Load inactive users from the API based on role
  useEffect(() => {
    if (sessionExpired) return;

    const token = getToken();
    const roles = getRoles();

    if (!token) {
      console.log("No token found, redirecting to login.");
      return;
    }

    let apiUrl = "";
    const isAdmin = roles.includes("ROLE_ADMIN");
    const isDoctorOrAssistant = roles.includes("ROLE_DOCTOR") || roles.includes("ROLE_ASSISTANT");

    if (isAdmin) {
      apiUrl = "http://localhost:6952/Users/inactiveusers"; // Admin gets all inactive users
      console.log("Fetching all inactive users for ADMIN");
    } else if (isDoctorOrAssistant) {
      apiUrl = "http://localhost:6952/Users/cabinet/active-users"; // Doctor/Assistant gets filtered inactive users
      console.log("Fetching cabinet inactive users for DOCTOR/ASSISTANT");
    } else {
      console.error("Unknown or unsupported user roles:", roles);
      return;
    }

    axios
      .get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setUsers(response.data);
        console.log(`Inactive users loaded from ${apiUrl}:`, response.data);
      })
      .catch((error) => {
        console.error(`Error loading inactive users from ${apiUrl}:`, error);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          alert("Access Denied or Session Expired. Please log in again.");
          performLogout();
        } else {
          alert("Failed to load inactive user data. Please try again later.");
        }
      });
  }, [sessionExpired, navigate]);

  // Activate User (Admin only)
  const changeUserStatus = (id) => {
    const token = getToken();
    const roles = getRoles();

    if (!token) {
      alert("Session invalid. Please log in again.");
      performLogout();
      return;
    }


    if (window.confirm("Are you sure you want to activate this user?")) {
      axios
        .put(`http://localhost:6952/Users/changeractivateUser/${id}`, null, { // Endpoint for activation
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then(() => {
          alert("User has been successfully activated.");
          // Remove the activated user from the list of inactive users
          setUsers((prevUsers) =>
            prevUsers.filter((user) => user.id !== id)
          );
        })
        .catch((error) => {
          console.error("Error activating user:", error);
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            alert("Permission denied or session expired.");
            performLogout();
          } else {
            alert("Failed to activate the user. Please try again later.");
          }
        });
    }
  };

  // Filter users based on search term (first name and last name) - Use camelCase
  const filteredUsers = users.filter(user => {
    const searchTermLower = searchTerm.toLowerCase();
    const userFirstName = user.firstName ? user.firstName.toLowerCase() : "";
    const userLastName = user.lastName ? user.lastName.toLowerCase() : "";
    const fullName = `${userFirstName} ${userLastName}`;

    return fullName.includes(searchTermLower); // Simple search on full name
  });


  // Render the user table
  return (
    <div>
      <h2>active User List</h2>
       <input
         type="text"
         placeholder="Search by name..."
         value={searchTerm}
         onChange={(e) => setSearchTerm(e.target.value)}
         className="form-control mb-4" // Use Bootstrap class
       />
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
              <th>Actions</th>
           </tr>
         </thead>
         <tbody>
           {filteredUsers.length === 0 ? (
             <tr>
               <td colSpan="7">No active users found</td>
             </tr>
           ) : (
             filteredUsers.map((user) => (
               <tr key={user.id}>
                 <td>{user.id}</td>
                 <td>{user.firstName}</td>
                 <td>{user.lastName}</td>
                 <td>{user.email}</td>
                 <td>{user.role}</td>
              
                 <td>
                   {/* Use Bootstrap button classes */}
                   <button onClick={() => changeUserStatus(user.id)} className="btn btn-sm btn-success"> {/* Use btn-success for activate */}
                     Activate
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

export default ComptenotValide;
