import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getUserData, getCabinetId } from '../../utils/auth'; // Import getCabinetId as well

// import './MyConsultationsPage.css'; // Optional CSS

const MyConsultationsPage = () => {
    const [user, setUser] = useState(null); // State to hold user info
    const [cabinetId, setCabinetId] = useState(null); // State to hold cabinet ID
    const [consultations, setConsultations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    useEffect(() => {
        // Fetch user data and cabinet ID on mount
        const userData = getUserData();
        const currentCabinetId = getCabinetId(); // Get cabinet ID using the helper
        setUser(userData.user); // Store user object in state
        setCabinetId(currentCabinetId); // Store cabinet ID in state

        const fetchMyConsultations = async () => {
            // Use userData and currentCabinetId directly here as state update might be async
            if (!userData.user || !userData.user.id) {
                setError("Utilisateur non identifié.");
                setIsLoading(false);
                return;
            }
            // Also check if cabinetId is available, as it's needed for filtering
            if (!currentCabinetId) {
                 setError("Contexte du cabinet non trouvé. Veuillez vous reconnecter.");
                 setIsLoading(false);
                 return;
            }

            setIsLoading(true);
            setError('');
            try {
                // Use the new dedicated endpoint for patients, passing cabinetId as a query parameter
                const response = await axios.get(`${API_URL}/api/consultations/my-consultations/${userData.user.id}`, { // Changed endpoint path
                     params: { // cabinetId is still passed as a query parameter
                         cabinetId: currentCabinetId
                     },
                    headers: { // Add Authorization header if needed
                         'Authorization': `Bearer ${userData.accessToken}` // Assuming token is needed
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

    // Function to handle prescription download
    const handleDownload = async (consultationId) => {
        const userData = getUserData();
        if (!userData || !userData.accessToken) {
            setError("Erreur d'authentification pour le téléchargement.");
            return;
        }

        try {
            const response = await axios.get(`${API_URL}/api/ordonnances/consultation/${consultationId}/download`, {
                headers: {
                    'Authorization': `Bearer ${userData.accessToken}`
                },
                // Important: Expect PDF content as a Blob
                responseType: 'blob' // Request blob data
            });

            // Check if response is a valid Blob
            if (response.data && response.data instanceof Blob && response.data.type === 'application/pdf') {
                // Create a URL for the Blob
                const blob = new Blob([response.data], { type: 'application/pdf' }); // Ensure correct MIME type
                const url = window.URL.createObjectURL(blob);

                // Create a temporary link to trigger the download
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `ordonnance_${consultationId}.pdf`); // Suggest PDF filename
                document.body.appendChild(link);
                link.click();

                // Clean up
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } else {
                 setError(`Impossible de télécharger l'ordonnance (réponse invalide).`);
            }

        } catch (err) {
            console.error("Error downloading prescription:", err);
            if (err.response?.status === 404) {
                setError(`Aucune ordonnance trouvée pour cette consultation.`);
            } else {
                setError(err.response?.data || 'Échec du téléchargement de l\'ordonnance.');
            }
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
                            <th>Ordonnance</th> {/* New column header */}
                            {/* Add other relevant columns for patient view */}
                        </tr>
                    </thead>
                    <tbody>
                        {consultations.map(consult => (
                            <tr key={consult.idConsultation}>
                                <td>{formatDate(consult.dateConsultation)}</td>
                                <td>{consult.type || 'Consultation Générale'}</td> {/* Placeholder */}
                                <td> {/* New cell for the button */}
                                    <button
                                        className="btn btn-sm btn-info" // Basic styling
                                        onClick={() => handleDownload(consult.idConsultation)}
                                    >
                                        Télécharger
                                    </button>
                                </td>
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
