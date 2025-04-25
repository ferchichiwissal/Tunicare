import React, { useState, useEffect, useContext } from 'react'; // Import useContext
import { useLocation, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill'; // Import ReactQuill
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import apiClient from '../../utils/apiClient'; // Import apiClient instead of axios
import AuthContext from '../../context/AuthContext'; // Import AuthContext
// import './MedicalExaminationForm.css'; // Optional CSS

const MedicalExaminationForm = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const patientId = queryParams.get('patientId');
    const appointmentId = queryParams.get('appointmentId'); // Renamed for clarity
    const consultationId = queryParams.get('consultationId'); // Retrieve consultationId

    const { user } = useContext(AuthContext); // Get user details from context

    const [patient, setPatient] = useState(null);
    const [centres, setCentres] = useState([]);
    const [selectedCentre, setSelectedCentre] = useState('');
    const [autreCentreName, setAutreCentreName] = useState('');
    const [examenType, setExamenType] = useState('');
    const [recommandation, setRecommandation] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitStatus, setSubmitStatus] = useState('');

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    // Fetch Patient Details and Centres
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');
            try {
                // Fetch Patient
                if (patientId) {
                    // Use apiClient which should handle headers automatically
                    // Corrected endpoint path based on UserController.java
                    const patientRes = await apiClient.get(`/Users/allid/${patientId}`);
                    setPatient(patientRes.data);
                } else {
                    throw new Error("ID Patient manquant dans l'URL.");
                }

                // Fetch Centres d'examen (adjust endpoint if needed)
                // Use apiClient which should handle headers automatically
                const centresRes = await apiClient.get(`/api/centres-examen`);
                setCentres(centresRes.data || []);

            } catch (err) {
                console.error("Error fetching initial data:", err);
                setError(err.response?.data?.message || err.message || 'Erreur lors du chargement des données.');
                setPatient(null);
                setCentres([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [patientId, API_URL]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitStatus('Enregistrement en cours...');
        setError('');

        if (!examenType) {
            setError('Veuillez sélectionner un type d\'examen.');
            setSubmitStatus('');
            return;
        }
        // Removed validation check for 'autreCentreName' as the input field was removed.

        if (!consultationId) { // Add check for consultationId
            setError('ID de consultation manquant dans l\'URL.');
            setSubmitStatus('');
            return;
        }

        const payload = {
            appointmentId: appointmentId, // Send appointmentId
            consultationId: consultationId, // Send consultationId retrieved from URL
            typeExamen: examenType,
            centreId: selectedCentre !== 'AUTRE' ? selectedCentre : null,
            // centreAutre is no longer sent as input field is removed
            recommandation: recommandation,
        };

        try {
            // Use apiClient which should handle headers automatically
            const response = await apiClient.post(`/api/medical-examinations`, payload);
            console.log("Exam request saved:", response.data);
            setSubmitStatus('Demande d\'examen enregistrée avec succès !');
            // Optionally redirect back or clear form
             setTimeout(() => {
                 setSubmitStatus('');
                 // navigate(`/consultation/${consultationId}`); // Example redirect
             }, 2000);

        } catch (err) {
            console.error("Error saving examination request:", err);
            setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement de la demande.');
            setSubmitStatus('');
        }
    };

    // --- Helper Functions ---
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch (e) { return 'Date invalide'; }
    };

    const calculateAge = (dobString) => {
        if (!dobString) return 'N/A';
        try {
            const dob = new Date(dobString);
            const ageDiffMs = Date.now() - dob.getTime();
            const ageDate = new Date(ageDiffMs);
            return Math.abs(ageDate.getUTCFullYear() - 1970);
        } catch (e) { return 'N/A'; }
    };

    // --- Print Function (using refined iframe method) ---
    const handlePrint = () => {
        if (!patient) {
            alert("Impossible d'imprimer : données patient non chargées.");
            return;
        }

        // Find selected centre name
        let centreName = "Autre";
        if (selectedCentre && selectedCentre !== 'AUTRE') {
            const centre = centres.find(c => c.idCentre.toString() === selectedCentre);
            if (centre) {
                centreName = `${centre.name} (${centre.adress})`;
            } else {
                centreName = `Centre ID: ${selectedCentre} (Nom non trouvé)`;
            }
        }

        // --- Generate HTML Content ---
        let printHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Demande d\'Examen Médical</title>'; // Added Doctype and charset
        printHtml += `
            <style>
                @page { size: A4; margin: 20mm; } /* Define page size and margins */
                body { font-family: Arial, sans-serif; font-size: 12px; }
                .header, .footer { text-align: center; margin-bottom: 20px; font-size: 10px; color: #555; }
                .content { border: 1px solid #ccc; padding: 15px; }
                h2 { text-align: center; margin-bottom: 25px; }
                .section { margin-bottom: 15px; }
                .section h4 { margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 3px; }
                .section p { margin: 3px 0; }
                strong { display: inline-block; width: 150px; font-weight: bold; } /* Ensure strong is bold */
                .recommendation-content { margin-left: 20px; border: 1px dashed #eee; padding: 5px; margin-top: 5px; } /* Style for recommendation */
                .footer { margin-top: 50px; }
                @media print {
                    body { font-size: 10pt; color: #000; background-color: #fff; -webkit-print-color-adjust: exact; color-adjust: exact; }
                    .header, .footer { color: #000; }
                    .content { border: 1px solid #000; }
                    .recommendation-content { border-color: #ccc; }
                }
            </style>
        `;
        printHtml += '</head><body>';

        // Header
        printHtml += `<div class="header">`;
        if (user) {
            printHtml += `Dr. ${user.name || '[Nom Docteur]'}<br>`;
            printHtml += `${user.activeCabinet?.address || '[Adresse Cabinet]'} - Tel: ${user.activeCabinet?.tel || '[Tel Cabinet]'}<br>`;
        }
        printHtml += `Date: ${formatDate(new Date())}`;
        printHtml += `</div>`;

        printHtml += '<h2>Demande d\'Examen Médical</h2>';
        printHtml += '<div class="content">';

        // Patient Section
        printHtml += '<div class="section"><h4>Patient</h4>';
        printHtml += `<p><strong>Nom:</strong> ${patient.lastName || 'N/A'}</p>`;
        printHtml += `<p><strong>Prénom:</strong> ${patient.firstName || 'N/A'}</p>`;
        printHtml += `<p><strong>Date de Naissance:</strong> ${formatDate(patient.birthDate)}</p>`;
        printHtml += `<p><strong>Âge:</strong> ${calculateAge(patient.birthDate)} ans</p>`;
        printHtml += '</div>';

        // Examination Section
        printHtml += '<div class="section"><h4>Examen Demandé</h4>';
        printHtml += `<p><strong>Type d'examen:</strong> ${examenType || 'Non spécifié'}</p>`;
        printHtml += `<p><strong>Centre:</strong> ${centreName}</p>`;
        // Handle Quill content for recommendation
        if (recommandation && recommandation !== '<p><br></p>') { // Check if not empty Quill content
             printHtml += `<p><strong>Recommandation:</strong></p><div class="recommendation-content">${recommandation}</div>`;
        } else {
             printHtml += `<p><strong>Recommandation:</strong> <i>Aucune</i></p>`;
        }
        printHtml += '</div>';

        printHtml += '</div>'; // Close content

        // Footer
        printHtml += `<div class="footer">`;
        printHtml += `Signature du Médecin: _________________________`;
        printHtml += `</div>`;

        printHtml += '</body></html>';

        // --- Use refined iframe method to print ---
        const iframeId = 'print-iframe-exam';
        let iframe = document.getElementById(iframeId);

        // Remove existing iframe if it exists
        if (iframe) {
            try {
                iframe.parentNode.removeChild(iframe);
            } catch (e) {
                console.warn("Could not remove existing exam print iframe:", e);
            }
        }

        // Create the iframe
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        iframe.style.left = '-9999px'; // Move off-screen

        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow.document;
        const iframeWin = iframe.contentWindow;

        iframeDoc.open();
        iframeDoc.write(printHtml);
        iframeDoc.close();

        // Function to handle cleanup
        const cleanupIframe = () => {
            const iframeToRemove = document.getElementById(iframeId);
            if (iframeToRemove) {
                try {
                    iframeToRemove.parentNode.removeChild(iframeToRemove);
                    console.log("Exam print iframe removed.");
                } catch (e) {
                    console.warn("Could not remove exam print iframe after print:", e);
                }
            }
        };

        // Trigger print after a short delay
        try {
            setTimeout(() => {
                try {
                    iframeWin.focus();
                    iframeWin.print();
                    // Fallback cleanup using setTimeout
                    setTimeout(cleanupIframe, 2000); // Cleanup after 2 seconds
                } catch (printError) {
                    console.error("Error during exam iframe print execution:", printError);
                    alert("Erreur lors de l'exécution de l'impression.");
                    cleanupIframe(); // Clean up immediately on error
                }
            }, 100); // 100ms delay
        } catch (e) {
            console.error("Error setting up exam print via iframe:", e);
            alert("Erreur lors de la préparation de l'impression.");
            cleanupIframe(); // Clean up immediately if setup fails
        }
    };

    if (isLoading) {
        return <div style={{ padding: '20px' }}>Chargement du formulaire...</div>;
    }

    if (error && !patient) { // Show main error only if patient couldn't load
        return <div className="error-message" style={{ padding: '20px', color: 'red' }}>Erreur : {error}</div>;
    }

    return (
        <div className="medical-exam-form-container" style={{ padding: '20px' }}>
            <h2>Création d'une Demande d'Examen Médical</h2>

            {patient && (
                 <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #eee' }}>
                    <h4>Patient</h4>
                    <p>{patient.firstName} {patient.lastName} </p>
                    {/* Add more patient details if needed */}
                </div>
            )}

            {error && <p style={{ color: 'red', marginBottom: '10px' }}>Erreur: {error}</p>}

            <form onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label htmlFor="examenType">🔽 Type d’examen :</label>
                    <select
                        id="examenType"
                        className="form-control"
                        value={examenType}
                        onChange={(e) => setExamenType(e.target.value)}
                        required
                    >
                        <option value="">-- Sélectionner --</option>
                        <option value="IRM">IRM</option>
                        <option value="Radio">Radio</option>
                        <option value="Analyse sanguine">Analyse sanguine</option>
                        <option value="Scanner">Scanner</option>
                        <option value="Echographie">Échographie</option>
                        {/* Add other common exam types */}
                        <option value="Autre">Autre (préciser)</option>
                    </select>
                     {examenType === 'Autre' && (
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Préciser le type d'examen"
                            value={recommandation} // Or a dedicated state? Let's reuse recommandation for now
                            onChange={(e) => setRecommandation(e.target.value)} // Adjust if needed
                            style={{ marginTop: '5px' }}
                        />
                    )}
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label htmlFor="centreExamen">🏥 Centre :</label>
                    <select
                        id="centreExamen"
                        className="form-control"
                        value={selectedCentre}
                        onChange={(e) => setSelectedCentre(e.target.value)}
                        required
                    >
                        <option value="">-- Sélectionner un centre --</option>
                        {centres.map(centre => (
                            <option key={centre.idCentre} value={centre.idCentre}>
                                {centre.name} ({centre.adress})
                            </option>
                        ))}
                        <option value="AUTRE">Autre (préciser)</option>
                    </select>
                    {/* Removed the input field for 'Autre' centre name */}
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label htmlFor="recommandation">🗒️ Recommandation (facultatif) :</label>
                    <ReactQuill
                        id="recommandation"
                        theme="snow"
                        value={recommandation}
                        onChange={setRecommandation} // Pass the setter function directly
                        style={{ backgroundColor: 'white', minHeight: '100px' }} // Adjust height as needed
                    />
                </div>

                {submitStatus && <p style={{ marginBottom: '10px' }}>{submitStatus}</p>}

                <div className="form-actions">
                    <button type="submit" className="btn btn-primary" style={{ marginRight: '10px' }}>
                        🔘 OK (Enregistrer)
                    </button>
                    <button type="button" onClick={handlePrint} className="btn btn-info">
                        🖨️ Imprimer
                    </button>
                     <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginLeft: '10px' }}>
                        Annuler
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MedicalExaminationForm;
