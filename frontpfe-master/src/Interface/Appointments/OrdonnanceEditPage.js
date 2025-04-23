import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
// import './OrdonnanceEditPage.css'; // Optional CSS

const OrdonnanceEditPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [patients, setPatients] = useState([]); // Results from patient search
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [prescriptions, setPrescriptions] = useState([]);
    const [editingPrescriptionId, setEditingPrescriptionId] = useState(null);
    const [editingText, setEditingText] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchError, setSearchError] = useState('');
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');


    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    // Debounced search for patients
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.trim().length > 1) { // Search only if term is long enough
                setIsLoading(true);
                setSearchError('');
                setPatients([]);
                setSelectedPatient(null); // Clear selection on new search
                setPrescriptions([]);   // Clear prescriptions on new search
                try {
                    // Assuming an endpoint exists to search patients by name/firstname
                    const response = await axios.get(`${API_URL}/api/users/search/patients?query=${searchTerm}`, { /* headers */ });
                    setPatients(response.data || []);
                    if (response.data.length === 0) {
                        setSearchError('Aucun patient trouvé.');
                    }
                } catch (err) {
                    console.error("Error searching patients:", err);
                    setSearchError(err.response?.data?.message || 'Erreur lors de la recherche des patients.');
                    setPatients([]);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setPatients([]); // Clear results if search term is too short
                setSearchError('');
            }
        }, 500); // Debounce time: 500ms

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, API_URL]);

    // Fetch prescriptions when a patient is selected
    useEffect(() => {
        const fetchPrescriptions = async () => {
            if (!selectedPatient) {
                setPrescriptions([]);
                return;
            }
            setIsLoading(true);
            setError('');
            try {
                const response = await axios.get(`${API_URL}/api/ordonnances/patient/${selectedPatient.idPatient}`, { /* headers */ });
                // Sort prescriptions by date (assuming date is available, might need backend adjustment)
                const sortedPrescriptions = (response.data || []).sort((a, b) => {
                    // Need consultation date on prescription object or fetch it separately
                    // Placeholder sort - assuming createdAt exists on PrescribedMedications
                    const dateA = a.consultation?.dateConsultation || a.createdAt || 0;
                    const dateB = b.consultation?.dateConsultation || b.createdAt || 0;
                    return new Date(dateB) - new Date(dateA);
                });
                setPrescriptions(sortedPrescriptions);

            } catch (err) {
                console.error("Error fetching prescriptions:", err);
                setError(err.response?.data?.message || 'Erreur lors de la récupération des ordonnances.');
                setPrescriptions([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrescriptions();
    }, [selectedPatient, API_URL]);

    const handlePatientSelect = (patient) => {
        setSelectedPatient(patient);
        setSearchTerm(`${patient.firstName} ${patient.lastName}`); // Update search bar
        setPatients([]); // Hide search results
        setSearchError('');
    };

    const handleEditClick = (prescription) => {
        setEditingPrescriptionId(prescription.idOrd);
        setEditingText(prescription.prescribedMedications || '');
        setEditError('');
        setEditSuccess('');
    };

    const handleCancelEdit = () => {
        setEditingPrescriptionId(null);
        setEditingText('');
        setEditError('');
        setEditSuccess('');
    };

    const handleSaveEdit = async () => {
        if (editingPrescriptionId === null) return;
        setEditError('');
        setEditSuccess('');
        setIsLoading(true); // Indicate loading during save

        try {
            const payload = { prescriptionText: editingText };
            const response = await axios.put(`${API_URL}/api/ordonnances/${editingPrescriptionId}`, payload, { /* headers */ });

            // Update the prescription list locally
            setPrescriptions(prev =>
                prev.map(p =>
                    p.idOrd === editingPrescriptionId ? { ...p, prescribedMedications: editingText } : p
                )
            );
            setEditSuccess('Ordonnance mise à jour avec succès !');
            setEditingPrescriptionId(null); // Exit edit mode
            setEditingText('');
             setTimeout(() => setEditSuccess(''), 3000);

        } catch (err) {
            console.error("Error updating prescription:", err);
            setEditError(err.response?.data?.message || 'Erreur lors de la mise à jour.');
        } finally {
             setIsLoading(false);
        }
    };

     // Helper function to format date
     const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            // Assuming the date comes from consultation.dateConsultation
            return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch (e) {
            return 'Date invalide';
        }
    };


    return (
        <div className="ordonnance-edit-page" style={{ padding: '20px' }}>
            <h2>Gestion des Ordonnances</h2>

            {/* Patient Search */}
            <div className="patient-search" style={{ marginBottom: '20px', position: 'relative' }}>
                <label htmlFor="patientSearch">Rechercher un patient (Nom/Prénom) :</label>
                <input
                    type="text"
                    id="patientSearch"
                    className="form-control"
                    placeholder="Entrez au moins 2 caractères..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ marginBottom: '5px' }}
                />
                 {isLoading && searchTerm && <p>Recherche...</p>}
                 {searchError && <p style={{ color: 'orange' }}>{searchError}</p>}
                 {patients.length > 0 && (
                    <ul className="list-group" style={{ position: 'absolute', zIndex: 1000, width: '100%', maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc' }}>
                        {patients.map(p => (
                            <li
                                key={p.idPatient}
                                className="list-group-item list-group-item-action"
                                onClick={() => handlePatientSelect(p)}
                                style={{ cursor: 'pointer' }}
                            >
                                {p.firstName} {p.lastName} (ID: {p.idPatient})
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Selected Patient Info */}
            {selectedPatient && (
                <div style={{ marginBottom: '20px' }}>
                    <h4>Patient sélectionné : {selectedPatient.firstName} {selectedPatient.lastName}</h4>
                </div>
            )}

            {/* Prescriptions List */}
            {selectedPatient && (
                <div className="prescriptions-list">
                    <h4>Ordonnances</h4>
                    {isLoading && !prescriptions.length && <p>Chargement des ordonnances...</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {!isLoading && prescriptions.length === 0 && <p>Aucune ordonnance trouvée pour ce patient.</p>}

                    {prescriptions.map(prescription => (
                        <div key={prescription.idOrd} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '15px' }}>
                            <p><strong>Date Consultation :</strong> {formatDate(prescription.consultation?.dateConsultation || prescription.createdAt)}</p> {/* Adjust date source */}

                            {editingPrescriptionId === prescription.idOrd ? (
                                <div>
                                    <ReactQuill
                                        theme="snow"
                                        value={editingText}
                                        onChange={setEditingText}
                                        style={{ backgroundColor: 'white', minHeight: '150px', marginBottom: '10px' }}
                                    />
                                    {editError && <p style={{ color: 'red' }}>{editError}</p>}
                                    {editSuccess && <p style={{ color: 'green' }}>{editSuccess}</p>}
                                    <button onClick={handleSaveEdit} className="btn btn-success btn-sm" style={{ marginRight: '5px' }} disabled={isLoading}>
                                        Enregistrer
                                    </button>
                                    <button onClick={handleCancelEdit} className="btn btn-secondary btn-sm" disabled={isLoading}>
                                        Annuler
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div dangerouslySetInnerHTML={{ __html: prescription.prescribedMedications || '<i>Ordonnance vide</i>' }} />
                                    <button
                                        onClick={() => handleEditClick(prescription)}
                                        className="btn btn-primary btn-sm"
                                        style={{ marginTop: '10px' }}
                                    >
                                        Modifier
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrdonnanceEditPage;
