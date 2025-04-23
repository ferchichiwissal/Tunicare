import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getUserData } from '../../utils/auth'; // Use getUserData instead

// import './ConsultationDashboard.css'; // Optional CSS

const ConsultationDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null); // State to hold user info
    const [consultations, setConsultations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    useEffect(() => {
        // Fetch user data on mount
        const userData = getUserData();
        setUser(userData.user); // Store user object in state

        const fetchConsultations = async () => {
            setIsLoading(true);
            setError('');
            try {
                // Fetch all consultations - backend needs refinement for filtering by cabinet/role
                const response = await axios.get(`${API_URL}/api/consultations/all`, {
                    headers: { // Add Authorization header if needed
                        // Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });
                setConsultations(response.data || []);
            } catch (err) {
                console.error("Error fetching consultations:", err);
                setError(err.response?.data?.message || 'Échec de la récupération des consultations.');
                setConsultations([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConsultations();
    }, [API_URL]);

    // Filter consultations based on search term (client-side)
    const filteredConsultations = useMemo(() => {
        if (!searchTerm) {
            return consultations;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return consultations.filter(consult =>
            (consult.patient?.firstName?.toLowerCase().includes(lowerSearchTerm) ||
             consult.patient?.lastName?.toLowerCase().includes(lowerSearchTerm))
        );
    }, [consultations, searchTerm]);

    const handleEdit = (consultationId) => {
        // Navigate to the consultation page for editing
        navigate(`/consultation/${consultationId}`);
    };

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
        return <div style={{ padding: '20px' }}>Chargement du tableau de bord des consultations...</div>;
    }

    return (
        <div className="consultation-dashboard-container" style={{ padding: '20px' }}>
            <h2>Tableau de Bord des Consultations</h2>

            {error && <p style={{ color: 'red' }}>Erreur : {error}</p>}

            {/* Search Bar */}
            <div className="form-group" style={{ marginBottom: '20px', maxWidth: '400px' }}>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Rechercher par nom/prénom patient..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Consultations List/Table */}
            <table className="table table-striped table-bordered">
                <thead>
                    <tr>
                        <th>Patient</th>
                        <th>Date</th>
                        <th>Type (Placeholder)</th>
                        {user?.role === 'ROLE_DOCTOR' && <th>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {filteredConsultations.length > 0 ? (
                        filteredConsultations.map(consult => (
                            <tr key={consult.idConsultation}>
                                <td>{consult.patient ? `${consult.patient.firstName} ${consult.patient.lastName}` : 'N/A'}</td>
                                <td>{formatDate(consult.dateConsultation)}</td>
                                <td>{consult.type || 'Consultation Générale'}</td> {/* Assuming a type field or default */}
                                {user?.role === 'ROLE_DOCTOR' && (
                                    <td>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleEdit(consult.idConsultation)}
                                        >
                                            Modifier
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={user?.role === 'ROLE_DOCTOR' ? 4 : 3} style={{ textAlign: 'center' }}>
                                Aucune consultation trouvée.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ConsultationDashboard;
