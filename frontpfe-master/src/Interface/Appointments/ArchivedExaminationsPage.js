import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Importer Link pour la navigation
import apiClient from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import './MyExaminationsPage.css';

const ArchivedExaminationsPage = () => {
    const [archivedExams, setArchivedExams] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); // État pour le terme de recherche
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth(); // Utiliser le hook useAuth

    useEffect(() => {
        const fetchArchivedExams = async () => {
            if (user && user.role === 'DOCTOR_CENTRE_EXAMEN') {
                try {
                    setLoading(true);
                    const response = await apiClient.get('/api/medical-examinations/centre/archived');
                    setArchivedExams(response.data);
                    setError(null);
                } catch (err) {
                    console.error("Erreur lors de la récupération des examens archivés:", err);
                    setError(err.response?.data?.message || err.message || "Une erreur s'est produite lors de la récupération des examens archivés.");
                    setArchivedExams([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
                setError("Accès non autorisé ou rôle utilisateur incorrect.");
            }
        };

        fetchArchivedExams();
    }, [user]);

    if (loading) {
        return <div className="container mt-5"><p className="text-center">Chargement des examens archivés...</p></div>;
    }

    if (error) {
        return <div className="container mt-5"><div className="alert alert-danger" role="alert">{error}</div></div>;
    }

    if (!user || user.role !== 'DOCTOR_CENTRE_EXAMEN') {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning" role="alert">
                    Vous devez être connecté en tant que Médecin de Centre d'Examen pour voir cette page.
                </div>
            </div>
        );
    }

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleHideExam = async (examIdToHide) => {
        try {
            await apiClient.put(`/api/medical-examinations/${examIdToHide}/hide-for-centre-doctor`);
            setArchivedExams(prevExams => prevExams.filter(exam => exam.idExam !== examIdToHide));
            // Optionnel: afficher une notification de succès
        } catch (err) {
            console.error("Erreur lors du masquage de l'examen pour le centre:", err);
            setError(err.response?.data?.message || "Erreur lors de la tentative de masquage de l'examen.");
            // Optionnel: afficher une notification d'erreur à l'utilisateur
        }
    };

    const filteredExams = archivedExams.filter(exam => {
        const patientFullName = `${exam.patientFirstName || ''} ${exam.patientLastName || ''}`.toLowerCase();
        return patientFullName.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="my-examinations-container container mt-5">
            <h2 className="text-center mb-4">Archive des Examens Réalisés</h2>
            
            <div className="mb-3">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Rechercher par nom ou prénom du patient..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
            </div>

            {filteredExams.length === 0 ? (
                <p className="text-center">
                    {searchTerm ? "Aucun examen ne correspond à votre recherche." : "Aucun examen archivé trouvé."}
                </p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-striped table-hover">
                        <thead className="thead-dark">
                            <tr>
                                <th>Patient</th>
                                <th>Type d'Examen</th>
                                <th>Date de Création</th>
                                {/* Statut retiré car tous sont 'terminé' */}
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExams.map((exam) => (
                                <tr key={exam.idExam}>
                                    <td>{exam.patientFirstName} {exam.patientLastName}</td>
                                    <td>{exam.act}</td>
                                    <td>{new Date(exam.createdAt).toLocaleDateString()}</td>
                                    {/* Statut retiré */}
                                    <td>
                                        <Link to={`/examination-result/${exam.idExam}`} className="btn btn-info btn-sm me-2">
                                            Voir Résultat
                                        </Link>
                                        <button
                                            onClick={() => handleHideExam(exam.idExam)}
                                            className="btn btn-outline-secondary btn-sm"
                                            title="Ne plus afficher cet examen dans cette liste"
                                        >
                                            Ne plus afficher
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ArchivedExaminationsPage;