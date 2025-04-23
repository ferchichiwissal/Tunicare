import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getUserData } from '../../utils/auth'; // Use getUserData instead

// import './MyConsultationsPage.css'; // Optional CSS

const MyConsultationsPage = () => {
    const [user, setUser] = useState(null); // State to hold user info
    const [consultations, setConsultations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    useEffect(() => {
        // Fetch user data on mount
        const userData = getUserData();
        setUser(userData.user); // Store user object in state

        const fetchMyConsultations = async () => {
            // Use userData directly here as state update might be async
            if (!userData.user || !userData.user.id) {
                setError("Utilisateur non identifié.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError('');
            try {
                // Use the history endpoint, assuming backend filters correctly or we adapt it
                // Or create a dedicated endpoint like /api/consultations/my-history
                const response = await axios.get(`${API_URL}/api/consultations/patient/${userData.user.id}/history`, {
                    headers: { // Add Authorization header if needed
                        // Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });
                // Sort consultations by date descending
                 const sortedConsultations = (response.data || []).sort((a, b) => {
                    const dateA = a.dateConsultation || 0;
                    const dateB = b.dateConsultation || 0;
                    return new Date(dateB) - new Date(dateA);
                });
                setConsultations(sortedConsultations);
            } catch (err) {
                console.error("Error fetching patient consultations:", err);
                // Check for 403 Forbidden if endpoint requires DOCTOR role
                if (err.response?.status === 403) {
                     setError("Accès non autorisé à l'historique complet. Endpoint patient dédié nécessaire?");
                } else {
                    setError(err.response?.data?.message || 'Échec de la récupération de vos consultations.');
                }
                setConsultations([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyConsultations();
    }, [API_URL]); // Remove user from dependency array, getUserData is called once on mount

    // Helper function to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch (e) {
            return 'Date invalide';
        }
    };

    if (isLoading) {
        return <div style={{ padding: '20px' }}>Chargement de vos consultations...</div>;
    }

    return (
        <div className="my-consultations-page" style={{ padding: '20px' }}>
            <h2>Mes Consultations</h2>

            {error && <p style={{ color: 'red' }}>Erreur : {error}</p>}

            {consultations.length > 0 ? (
                <table className="table table-striped">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type (Placeholder)</th>
                            {/* Add other relevant columns for patient view */}
                        </tr>
                    </thead>
                    <tbody>
                        {consultations.map(consult => (
                            <tr key={consult.idConsultation}>
                                <td>{formatDate(consult.dateConsultation)}</td>
                                <td>{consult.type || 'Consultation Générale'}</td> {/* Placeholder */}
                                {/* Display consultation text snippet or link to details? */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                !error && <p>Vous n'avez aucune consultation enregistrée.</p>
            )}
        </div>
    );
};

export default MyConsultationsPage;
