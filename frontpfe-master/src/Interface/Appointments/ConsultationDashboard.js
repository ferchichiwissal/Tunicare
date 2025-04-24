import React, { useState, useEffect, useMemo, useContext } from 'react'; // Import useContext
import { useNavigate } from 'react-router-dom';
// import axios from 'axios'; // Use apiClient instead
import apiClient from '../../utils/apiClient'; // Import apiClient
// import { getUserData } from '../../utils/auth'; // Use AuthContext instead
import AuthContext from '../../context/AuthContext'; // Import AuthContext

// import './ConsultationDashboard.css'; // Optional CSS

const ConsultationDashboard = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext); // Get user from context
    const [consultations, setConsultations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952'; // apiClient handles base URL

    useEffect(() => {
        const fetchConsultations = async () => {
            // Ensure user and user ID are available from context
            if (!user || !user.id) {
                setError("Impossible de récupérer l'ID du médecin connecté.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError('');
            try {
                // Fetch consultations for the specific doctor using apiClient
                console.log(`Fetching consultations for doctor ID: ${user.id}`);
                const response = await apiClient.get(`/api/consultations/doctor/${user.id}`);
                // Sort consultations by date descending (optional, backend might do it)
                const sortedConsultations = (response.data || []).sort((a, b) => {
                    const dateA = a.dateConsultation || 0;
                    const dateB = b.dateConsultation || 0;
                    return new Date(dateB) - new Date(dateA);
                });
                setConsultations(sortedConsultations);
            } catch (err) {
                console.error("Error fetching doctor's consultations:", err);
                setError(err.response?.data?.message || 'Échec de la récupération de vos consultations.');
                setConsultations([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConsultations();
    }, [user]); // Depend on user object from context

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

     // Renamed function for clarity
     const handleViewDetails = (consultationId) => {
         // Navigate to the consultation page, passing consultationId
         // We'll use a different route or parameter to indicate "view/edit" mode vs "new" mode
         navigate(`/consultation/details/${consultationId}`);
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
                        {/* Corrected role check */}
                        {user?.role === 'DOCTOR' && <th>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {filteredConsultations.length > 0 ? (
                        filteredConsultations.map(consult => (
                            <tr key={consult.idConsultation}>
                                <td>{consult.patient ? `${consult.patient.firstName} ${consult.patient.lastName}` : 'N/A'}</td>
                                <td>{formatDate(consult.dateConsultation)}</td>
                                <td>{consult.type || 'Consultation Générale'}</td> {/* Assuming a type field or default */}
                                {/* Corrected role check */}
                                {user?.role === 'DOCTOR' && (
                                     <td>
                                         {/* Changed button text and handler */}
                                         <button
                                             className="btn btn-sm btn-info" // Changed style for visual difference
                                             onClick={() => handleViewDetails(consult.idConsultation)}
                                         >
                                             Afficher Détails
                                         </button>
                                     </td>
                                )}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            {/* Corrected role check for colSpan */}
                            <td colSpan={user?.role === 'DOCTOR' ? 4 : 3} style={{ textAlign: 'center' }}>
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
