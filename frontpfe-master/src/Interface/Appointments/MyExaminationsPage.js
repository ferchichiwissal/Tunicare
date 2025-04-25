import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getUserData, getCabinetId } from '../../utils/auth'; // Import getCabinetId

// import './MyExaminationsPage.css'; // Optional CSS

const MyExaminationsPage = () => {
    const [user, setUser] = useState(null); // State to hold user info
    const [cabinetId, setCabinetId] = useState(null); // State to hold cabinet ID
    const [examinations, setExaminations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(null); // Track which exam is downloading

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    // Function to handle the download click
    const handleDownload = async (examId) => {
        setDownloading(examId); // Indicate download start for this exam
        setError(''); // Clear previous errors

        // --- BACKEND REQUIRED ---
        // This part needs a backend endpoint like:
        // GET /api/medical-examinations/{examId}/download
        // which returns the PDF file content with appropriate headers.

        console.log(`Attempting to download examination ID: ${examId}`);
        // Removed the placeholder alert:
        // alert(`La fonctionnalité de téléchargement pour l'examen ${examId} nécessite une mise à jour du backend.`);

        // Example of how it *would* work with axios if the endpoint existed:
        // UNCOMMENTED THE ACTUAL LOGIC:
        const userData = getUserData();
        const token = userData?.accessToken;
        if (!token) {
            setError("Token d'authentification manquant.");
            setDownloading(null);
            return;
        }

        try {
            const response = await axios.get(`${API_URL}/api/medical-examinations/${examId}/download`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob', // Important for file download
            });

            // Create a URL for the blob object
            const fileURL = window.URL.createObjectURL(new Blob([response.data]));
            // Create a temporary link element
            const fileLink = document.createElement('a');
            fileLink.href = fileURL;
            // Suggest a filename (backend might provide one via Content-Disposition header)
            fileLink.setAttribute('download', `examen_${examId}.pdf`);
            // Append to body, click, and remove
            document.body.appendChild(fileLink);
            fileLink.click();
            fileLink.parentNode.removeChild(fileLink);
            window.URL.revokeObjectURL(fileURL); // Clean up blob URL

        } catch (err) {
            console.error("Error downloading examination PDF:", err);
            setError(err.response?.data?.message || `Échec du téléchargement de l'examen ${examId}. L'endpoint backend est peut-être manquant.`);
        } finally {
            setDownloading(null); // Indicate download end/failure
        }
        // --- END BACKEND REQUIRED --- UNCOMMENTED MARKER REMOVED

        // For now, just stop the loading indicator - REMOVED THIS SIMULATION
        // setTimeout(() => setDownloading(null), 500);
    };


    useEffect(() => {
        // Fetch user data and cabinet ID using the same approach as MyConsultationsPage
        const userData = getUserData();
        const currentCabinetId = getCabinetId(); // Use the dedicated helper function

        // Check if user and cabinetId are available
        if (!userData || !userData.user || !userData.user.id) {
             setError("Utilisateur non identifié.");
             setIsLoading(false);
             return;
        }
        if (!currentCabinetId) {
            setError("Contexte du cabinet non trouvé. Veuillez vous reconnecter.");
            setIsLoading(false);
            return;
        }

        setUser(userData.user); // Store user object in state
        setCabinetId(currentCabinetId); // Store cabinet ID in state

        const fetchMyExaminations = async () => {
            // Use userData and currentCabinetId directly
            const currentPatientId = userData.user.id;

            // No need for this check anymore as it's done above
            // if (!currentPatientId || !currentCabinetId) {
            //     setError("ID utilisateur ou ID cabinet manquant.");
            //     setIsLoading(false);
            //     return;
            // }

            // Use accessToken from userData for authorization
            const token = userData.accessToken;
            if (!token) {
                setError("Token d'authentification manquant. Veuillez vous reconnecter.");
                setIsLoading(false); // Re-add missing lines
                return;             // Re-add missing lines
            }                       // Re-add missing closing brace

            setIsLoading(true);
            setError('');
            try {
                // Log the IDs being sent
                console.log(`Fetching examinations for Patient ID: ${currentPatientId}, Cabinet ID: ${currentCabinetId}`);

                // Use the updated endpoint with cabinetId query parameter
                const response = await axios.get(`${API_URL}/api/medical-examinations/my-examinations/${currentPatientId}?cabinetId=${currentCabinetId}`, {
                    headers: {
                        Authorization: `Bearer ${token}` // Use token from userData
                    }
                });
                 // Sort examinations by date descending (using createdAt)
                 const sortedExaminations = (response.data || []).sort((a, b) => {
                    const dateA = a.createdAt || 0; // Use createdAt from MedicalExamination entity
                    const dateB = b.createdAt || 0;
                    return new Date(dateB) - new Date(dateA);
                });
                setExaminations(sortedExaminations);
            } catch (err) {
                console.error("Error fetching patient examinations for cabinet:", err);
                 setError(err.response?.data?.message || `Échec de la récupération de vos demandes d'examen pour ce cabinet.`);
                setExaminations([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyExaminations();
    }, [API_URL]); // Dependencies removed as data is fetched once on mount

    // Helper function to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            // Using createdAt for exam request date
            return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch (e) {
            return 'Date invalide';
        }
    };

     // Function to display centre information using the centreName field set by the backend
     const displayCentre = (exam) => {
        return exam.centreName || 'Non spécifié'; // Use the centreName field
    };


    if (isLoading) {
        return <div style={{ padding: '20px' }}>Chargement de vos demandes d'examen...</div>;
    }

    return (
        <div className="my-examinations-page" style={{ padding: '20px' }}>
            <h2>Mes Demandes d'Examen</h2>

            {error && <p style={{ color: 'red' }}>Erreur : {error}</p>}

            {examinations.length > 0 ? (
                <table className="table table-striped">
                    <thead>
                        <tr>
                            <th>Date Demande</th>
                            <th>Type</th>
                            <th>Centre</th>
                            <th>Action</th> {/* Changed Header */}
                        </tr>
                    </thead>
                    <tbody>
                        {examinations.map(exam => (
                            <tr key={exam.idExam}>
                                <td>{formatDate(exam.createdAt)}</td> {/* Using createdAt as request date */}
                                <td>{exam.act || 'N/A'}</td> {/* Assuming 'act' holds the type */}
                                <td>{displayCentre(exam)}</td> {/* Needs logic based on backend */}
                                <td> {/* Replaced recommendation with button */}
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleDownload(exam.idExam)}
                                        disabled={downloading === exam.idExam} // Disable while downloading this specific exam
                                    >
                                        {downloading === exam.idExam ? 'Chargement...' : 'Télécharger'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                 !error && <p>Vous n'avez aucune demande d'examen enregistrée.</p>
            )}
        </div>
    );
};

export default MyExaminationsPage;
