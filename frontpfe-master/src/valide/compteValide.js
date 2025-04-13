import React, { useState, useEffect } from "react"; // Import useState and useEffect
import axios from 'axios'; // Import axios for API calls
import { jwtDecode } from 'jwt-decode'; // Import jwt-decode to get user info from token
import './compteValide.css'; // Importing the associated CSS file for styling
import logo from '../assets/logo1.png'; // Importing the logo image

// Functional component for displaying validated accounts
const CompteValide = () => {
  const [users, setUsers] = useState([]); // State for users list
  const [loading, setLoading] = useState(true); // State for loading status
  const [error, setError] = useState(''); // State for error messages
  const [currentUser, setCurrentUser] = useState(null); // State for logged-in user details

  useEffect(() => {
    // Get token and decode user info
    const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        // Assuming the token payload has id, role, and cabinetId (adjust if needed)
        setCurrentUser({
          id: decodedToken.userId, // Adjust field name based on your token structure
          role: decodedToken.role, // Adjust field name
          cabinetId: decodedToken.cabinetId // Adjust field name
        });
      } catch (e) {
        console.error("Error decoding token:", e);
        setError("Token invalide ou expiré.");
        setLoading(false);
        // Optionally redirect to login
        return;
      }
    } else {
      setError("Authentification requise.");
      setLoading(false);
      // Optionally redirect to login
      return;
    }

    // Fetch users from API
    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      try {
        // Corrected endpoint to fetch active users
        const response = await axios.get('http://localhost:6952/Users/activeusers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // The backend endpoint now returns ResponseEntity<List<User>>, so response.data should be the list
        if (Array.isArray(response.data)) {
          setUsers(response.data);
        } else {
          console.warn("Received non-array data for users:", response.data);
          setUsers([]);
          setError('Format de données utilisateur inattendu.');
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          setError("Permission refusée pour voir les utilisateurs.");
        } else {
          setError('Erreur lors de la récupération des utilisateurs.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (token) {
        fetchUsers();
    }
  }, []); // Empty dependency array means this runs once on mount

  // Filtering logic
  const filteredUsers = users.filter(user => {
    if (!currentUser) return false; // Don't show anything if current user info is missing

    // Admin sees everyone except themselves
    if (currentUser.role === 'ADMIN') {
      return user.id !== currentUser.id;
    }

    // Doctor/Assistant see users in the same cabinet
    if (currentUser.role === 'DOCTOR' || currentUser.role === 'ASSISTANT') {
      // Assuming user object has a cabinetId or similar field
      // Adjust 'user.cabinetId' if the field name is different
      return user.cabinetId === currentUser.cabinetId;
    }

    // Other roles (e.g., Patient) might not see this list
    return false;
  });


  if (loading) {
    return <div>Chargement des utilisateurs...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="app">
      {/* Header section of the application */}
      <header className="app-header">
        {/* Logo section */}
        <div className="app-header-logo">
          <div className="logo">
            <span className="logo-icon">
              <img src={logo} alt="Logo" /> {/* Display the logo */}
            </span>
            <h1 className="logo-title">SoMezzo</h1> {/* Application name */}
          </div>
        </div>

        {/* Navigation links in the header */}
        <div className="app-header-navigation">
          <div className="tabs">
            <a href="#">Overview</a>
            <a href="#">Payments</a>
            <a href="#">Cards</a>
            <a href="#" className="active">Account</a> {/* Active link for Account */}
            <a href="#">System</a>
            <a href="#">Business</a>
          </div>
        </div>

        {/* User profile section in the header */}
        <div className="app-header-actions">
          <button className="user-profile">
            <span>ghada chelli</span> {/* User name */}
            <img src="https://assets.codepen.io/285131/almeria-avatar.jpeg" alt="User Avatar" /> {/* User avatar */}
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar navigation links */}
        <aside className="app-body-navigation">
          <nav className="navigation">
            <a href="#">Dashboard</a>
            <a href="#">Scheduled</a>
            <a href="#">Transfers</a>
            <a href="#">Templates</a>
            <a href="#">SWIFT</a>
            <a href="#">Exchange</a>
          </nav>
        </aside>

        {/* Main content area */}
        <main className="app-body-main-content">
          {/* Section for displaying validated accounts */}
          <section className="compte-section">
            <h2>Comptes à Valider</h2> {/* Section title */}
            {/* Add Bootstrap responsive table wrapper */}
            <div className="table-responsive">
              <table className="table table-striped table-hover compte-table"> {/* Add Bootstrap table classes */}
                <thead>
                  {/* Table header - adjust columns as needed */}
                <tr>
                  <th>ID</th>
                  <th>Prénom</th>
                  <th>Nom</th>
                  <th>Email</th>
                  {/* <th>Date Naissance</th> */}
                  <th>Rôle</th>
                  <th>Cabinet ID</th> {/* Added for clarity */}
                  {/* Remove password fields */}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6">Aucun utilisateur à afficher.</td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.firstName}</td> {/* Adjust field names if needed */}
                      <td>{user.lastName}</td>  {/* Adjust field names if needed */}
                      <td>{user.email}</td>
                      {/* <td>{user.birthDate || 'N/A'}</td> */}
                      <td>{user.role}</td>
                      <td>{user.cabinetId || 'N/A'}</td> {/* Adjust field name */}
                      {/* Add action buttons if needed */}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div> {/* Close table-responsive wrapper */}
          </section>
        </main>

        {/* Sidebar for payments section */}
        <aside className="app-body-sidebar">
          <section className="payment-section">
            <h2>New Payment</h2> {/* Title for the payment section */}
            <div className="payment-section-header">
              <p>Choose a card to transfer money</p> {/* Instruction text */}
              <div>
                <button className="card-button mastercard">MasterCard</button> {/* Button for MasterCard */}
                <button className="card-button visa active">Visa</button> {/* Button for Visa, active by default */}
              </div>
            </div>
            <div className="payments">
              {/* Example payments rendered using a map function */}
              {[ 
                { type: "Internet", amount: "$ 2,110", cardColor: "green", expiry: "01/22", lastFour: "4012" },
                { type: "Universal", amount: "$ 5,621", cardColor: "olive", expiry: "12/23", lastFour: "2228" },
                { type: "Gold", amount: "$ 3,473", cardColor: "gray", expiry: "03/22", lastFour: "5214" }
              ].map((payment, index) => (
                <div className="payment" key={index}>
                  {/* Payment card displaying the details */}
                  <div className={`card ${payment.cardColor}`}>
                    <span>{payment.expiry}</span> {/* Card expiry date */}
                    <span>•••• {payment.lastFour}</span> {/* Last four digits of the card */}
                  </div>
                  <div className="payment-details">
                    <h3>{payment.type}</h3> {/* Payment type */}
                    <div>
                      <span>{payment.amount}</span> {/* Payment amount */}
                      <button className="icon-button">
                        <i className="ph-caret-right-bold"></i> {/* Icon for navigation */}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

      </div>
    </div>
  );
};

export default CompteValide; // Export the component for use in other parts of the application
