import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getUserData } from '../../utils/auth'; // Use getUserData instead

// import './MyExaminationsPage.css'; // Optional CSS

const MyExaminationsPage = () => {
    const [user, setUser] = useState(null); // State to hold user info
    const [examinations, setExaminations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    useEffect(() => {
        // Fetch user data on mount
        const userData = getUserData();
        setUser(userData.user); // Store user object in state

        const fetchMyExaminations = async () => {
            // Use userData directly here as state update might be async
            if (!userData.user || !userData.user.id) {
                setError("Utilisateur non identifié.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError('');
            try {
                // Use the endpoint created in MedicalExaminationController
                const response = await axios.get(`${API_URL}/api/medical-examinations/patient/${userData.user.id}`, {
                    headers: { // Add Authorization header if needed
                        // Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });
                 // Sort examinations by date descending (assuming createdAt exists)
                 const sortedExaminations = (response.data || []).sort((a, b) => {
                    const dateA = a.createdAt || 0;
                    const dateB = b.createdAt || 0;
                    return new Date(dateB) - new Date(dateA);
                });
                setExaminations(sortedExaminations);
            } catch (err) {
                console.error("Error fetching patient examinations:", err);
                 setError(err.response?.data?.message || 'Échec de la récupération de vos demandes d\'examen.');
                setExaminations([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyExaminations();
    }, [API_URL]); // Remove user from dependency array, getUserData is called once on mount

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

     // Function to display centre information (needs backend data)
     const displayCentre = (exam) => {
        // This depends on how centre info is stored/returned by backend
        // Option 1: Direct link to CentreDexamen entity
        // return exam.centreDexamen ? exam.centreDexamen.name : (exam.centreAutre || 'Non spécifié');
        // Option 2: Stored name in a field (e.g., exam.centreName)
        // return exam.centreName || 'Non spécifié';
        // Placeholder:
        return 'Centre N/A'; // Replace with actual logic based on backend
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
                            <th>Recommandation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {examinations.map(exam => (
                            <tr key={exam.idExam}>
                                <td>{formatDate(exam.createdAt)}</td> {/* Using createdAt as request date */}
                                <td>{exam.act || 'N/A'}</td> {/* Assuming 'act' holds the type */}
                                <td>{displayCentre(exam)}</td> {/* Needs logic based on backend */}
                                <td>{exam.recommandation || '-'}</td>
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
