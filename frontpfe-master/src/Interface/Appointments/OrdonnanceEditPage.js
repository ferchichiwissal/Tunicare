import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { getToken, isTokenExpired, clearUserData } from '../../utils/auth'; // Import auth utils
import { useNavigate } from 'react-router-dom'; // Import useNavigate for logout redirect

// import './OrdonnanceEditPage.css'; // Optional CSS

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const OrdonnanceEditPage = () => {
    const { t } = useTranslation(); // Initialize translation hook
    const navigate = useNavigate(); // Initialize navigate

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

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('sessionExpiredAlert', 'Your session has expired due to inactivity. Redirecting to login...')); // Use existing key
        navigate("/sign-in");
    }, [navigate, t]);

    // --- Token Expiry & Inactivity Checks ---
    useEffect(() => {
        const token = getToken();
        if (!token || isTokenExpired(token)) {
            performLogout();
            return;
        }
        let expiryTimer;
        try {
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            const expiryTime = decodedToken.exp * 1000;
            const currentTime = Date.now();
            const timeToExpire = expiryTime - currentTime;
            if (timeToExpire > 0) {
                expiryTimer = setTimeout(performLogout, timeToExpire);
            } else {
                performLogout();
                return;
            }
        } catch (err) {
            console.error("Error decoding token for expiry check:", err);
            performLogout();
            return;
        }
        let inactivityTimer;
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(performLogout, INACTIVITY_TIMEOUT);
        };
        const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
        activityEvents.forEach(event => window.addEventListener(event, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(expiryTimer);
            clearTimeout(inactivityTimer);
            activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [performLogout]);


    // Debounced search for patients
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.trim().length > 1) { // Search only if term is long enough
                setIsLoading(true);
                setSearchError('');
                setPatients([]);
                setSelectedPatient(null); // Clear selection on new search
                setPrescriptions([]);   // Clear prescriptions on new search
                const token = getToken();
                if (!token) {
                    performLogout();
                    return;
                }
                try {
                    // Assuming an endpoint exists to search patients by name/firstname
                    const response = await axios.get(`${API_URL}/api/users/search/patients?query=${searchTerm}`, {
                         headers: { Authorization: `Bearer ${token}` } // Add Auth header
                    });
                    setPatients(response.data || []);
                    if (response.data.length === 0) {
                        setSearchError(t('ordonnanceEditPage.search.noPatients', 'Aucun patient trouvé.')); // Use translation key
                    }
                } catch (err) {
                    console.error("Error searching patients:", err);
                    if (err.response?.status === 401 || err.response?.status === 403) {
                        performLogout(); // Logout on auth error
                    } else {
                        setSearchError(err.response?.data?.message || t('ordonnanceEditPage.search.error', 'Erreur lors de la recherche des patients.')); // Use translation key
                    }
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
    }, [searchTerm, API_URL, t, performLogout]); // Added t and performLogout dependencies

    // Fetch prescriptions when a patient is selected
    useEffect(() => {
        const fetchPrescriptions = async () => {
            if (!selectedPatient) {
                setPrescriptions([]);
                return;
            }
            setIsLoading(true);
            setError('');
            const token = getToken();
            if (!token) {
                performLogout();
                return;
            }
            try {
                const response = await axios.get(`${API_URL}/api/ordonnances/patient/${selectedPatient.idPatient}`, {
                    headers: { Authorization: `Bearer ${token}` } // Add Auth header
                });
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
                 if (err.response?.status === 401 || err.response?.status === 403) {
                    performLogout(); // Logout on auth error
                } else {
                    setError(err.response?.data?.message || t('ordonnanceEditPage.fetchPrescriptions.error', 'Erreur lors de la récupération des ordonnances.')); // Use translation key
                }
                setPrescriptions([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrescriptions();
    }, [selectedPatient, API_URL, t, performLogout]); // Added t and performLogout dependencies

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
        const token = getToken();
        if (!token) {
            performLogout();
            return;
        }

        try {
            const payload = { prescriptionText: editingText };
            const response = await axios.put(`${API_URL}/api/ordonnances/${editingPrescriptionId}`, payload, {
                 headers: { Authorization: `Bearer ${token}` } // Add Auth header
            });

            // Update the prescription list locally
            setPrescriptions(prev =>
                prev.map(p =>
                    p.idOrd === editingPrescriptionId ? { ...p, prescribedMedications: editingText } : p
                )
            );
            setEditSuccess(t('ordonnanceEditPage.edit.success', 'Ordonnance mise à jour avec succès !')); // Use translation key
            setEditingPrescriptionId(null); // Exit edit mode
            setEditingText('');
             setTimeout(() => setEditSuccess(''), 3000);

        } catch (err) {
            console.error("Error updating prescription:", err);
             if (err.response?.status === 401 || err.response?.status === 403) {
                performLogout(); // Logout on auth error
            } else {
                setEditError(err.response?.data?.message || t('ordonnanceEditPage.edit.error', 'Erreur lors de la mise à jour.')); // Use translation key
            }
        } finally {
             setIsLoading(false);
        }
    };

     // Helper function to format date
     const formatDate = (dateString) => {
        if (!dateString) return t('common.notAvailable', 'N/A'); // Use common key
        try {
            // Assuming the date comes from consultation.dateConsultation
            // TODO: Consider using i18n locale for date formatting if needed globally
            return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch (e) {
            return t('common.invalidDate', 'Date invalide'); // Use common key
        }
    };


    // Determine the container class based on theme (if ThemeContext is used)
    // const { theme } = useContext(ThemeContext); // Uncomment if using ThemeContext
    // const containerClass = `ordonnance-edit-page ${theme === 'night' ? 'night-mode' : ''}`; // Example

    return (
        // <div className={containerClass} style={{ padding: '20px' }}> {/* Use containerClass if theme is applied */}
        <div className="ordonnance-edit-page" style={{ padding: '20px' }}>
            <h2>{t('ordonnanceEditPage.title', 'Gestion des Ordonnances')}</h2>

            {/* Patient Search */}
            <div className="patient-search" style={{ marginBottom: '20px', position: 'relative' }}>
                <label htmlFor="patientSearch">{t('ordonnanceEditPage.search.label', 'Rechercher un patient (Nom/Prénom) :')}</label>
                <input
                    type="text"
                    id="patientSearch"
                    className="form-control"
                    placeholder={t('ordonnanceEditPage.search.placeholder', 'Entrez au moins 2 caractères...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ marginBottom: '5px' }}
                />
                 {isLoading && searchTerm && <p>{t('loading', 'Recherche...')}</p>} {/* Use common loading key */}
                 {searchError && <p style={{ color: 'orange' }}>{searchError}</p>}
                 {patients.length > 0 && (
                    <ul className="list-group" style={{ position: 'absolute', zIndex: 1000, width: '100%', maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', backgroundColor: 'white' /* Ensure background for visibility */ }}>
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
                    <h4>{t('ordonnanceEditPage.selectedPatientPrefix', 'Patient sélectionné :')} {selectedPatient.firstName} {selectedPatient.lastName}</h4>
                </div>
            )}

            {/* Prescriptions List */}
            {selectedPatient && (
                <div className="prescriptions-list">
                    <h4>{t('ordonnanceEditPage.prescriptionsTitle', 'Ordonnances')}</h4>
                    {isLoading && !prescriptions.length && <p>{t('ordonnanceEditPage.loadingPrescriptions', 'Chargement des ordonnances...')}</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {!isLoading && prescriptions.length === 0 && !error && <p>{t('ordonnanceEditPage.noPrescriptionsFound', 'Aucune ordonnance trouvée pour ce patient.')}</p>}

                    {prescriptions.map(prescription => (
                        <div key={prescription.idOrd} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '15px', backgroundColor: '#f9f9f9' /* Light background for contrast */ }}>
                            <p><strong>{t('ordonnanceEditPage.consultationDateLabel', 'Date Consultation :')}</strong> {formatDate(prescription.consultation?.dateConsultation || prescription.createdAt)}</p> {/* Adjust date source */}

                            {editingPrescriptionId === prescription.idOrd ? (
                                <div style={{ borderTop: '1px dashed #ccc', paddingTop: '10px', marginTop: '10px' }}>
                                    <label>{t('ordonnanceEditPage.edit.editorLabel', 'Modifier l\'ordonnance :')}</label>
                                    <ReactQuill
                                        theme="snow"
                                        value={editingText}
                                        onChange={setEditingText}
                                        style={{ backgroundColor: 'white', minHeight: '150px', marginBottom: '10px' }}
                                    />
                                    {editError && <p style={{ color: 'red' }}>{editError}</p>}
                                    {editSuccess && <p style={{ color: 'green' }}>{editSuccess}</p>}
                                    <button onClick={handleSaveEdit} className="btn btn-success btn-sm" style={{ marginRight: '5px' }} disabled={isLoading}>
                                        {isLoading ? t('loading', 'Enregistrement...') : t('common.save', 'Enregistrer')} {/* Use common save key */}
                                    </button>
                                    <button onClick={handleCancelEdit} className="btn btn-secondary btn-sm" disabled={isLoading}>
                                        {t('common.cancel', 'Annuler')} {/* Use common cancel key */}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ borderTop: '1px dashed #ccc', paddingTop: '10px', marginTop: '10px' }}>
                                     <div dangerouslySetInnerHTML={{ __html: prescription.prescribedMedications || `<i>${t('ordonnanceEditPage.emptyPrescription', 'Ordonnance vide')}</i>` }} />
                                    <button
                                        onClick={() => handleEditClick(prescription)}
                                        className="btn btn-primary btn-sm"
                                        style={{ marginTop: '10px' }}
                                    >
                                        {t('common.edit', 'Modifier')} {/* Use common edit key */}
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
