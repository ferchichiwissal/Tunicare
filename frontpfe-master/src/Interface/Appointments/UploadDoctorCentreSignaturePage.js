import React, { useState, useEffect, useContext } from 'react'; // Ajout de useContext
import apiClient from '../../utils/apiClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Importer useAuth
// import './UploadDoctorCentreSignaturePage.css';

function UploadDoctorCentreSignaturePage() {
    const auth = useAuth(); // Utiliser le contexte d'authentification
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Vérifier si l'utilisateur est connecté et a le bon rôle en utilisant AuthContext
    useEffect(() => {
        if (!auth.loading) { // Attendre que le contexte ait fini de charger
            if (!auth.user || auth.user.role !== 'DOCTOR_CENTRE_EXAMEN') {
                console.log("UploadDoctorCentreSignaturePage: Redirecting to /login. Auth loading:", auth.loading, "User:", auth.user);
                navigate('/login'); // Rediriger si non autorisé ou utilisateur non chargé correctement
            } else {
                console.log("UploadDoctorCentreSignaturePage: User role check passed via context.", auth.user);
            }
        }
    }, [auth.loading, auth.user, navigate]);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setMessage('');
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!selectedFile) {
            setError('Veuillez sélectionner un fichier de signature.');
            return;
        }

        setIsLoading(true);
        setError('');
        setMessage('');

        const formData = new FormData();
        formData.append('signatureFile', selectedFile);

        try {
            const response = await apiClient.put('/api/doctor-centre-examen/signature', formData, { // Ajout de /api
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage(response.data.message || 'Signature téléchargée avec succès !');
            setSelectedFile(null); // Réinitialiser le champ de fichier
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Erreur lors du téléchargement de la signature.';
            setError(errorMessage);
            console.error("Upload signature error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="upload-signature-container">
            <h2>Télécharger ma Signature Électronique</h2>
            <p>
                Veuillez télécharger une image de votre signature. Cette signature sera utilisée
                pour signer électroniquement les résultats d'examen.
            </p>
            <form onSubmit={handleSubmit} className="upload-signature-form">
                <div className="form-group">
                    <label htmlFor="signatureFile">Fichier de signature (PNG, JPG) :</label>
                    <input
                        type="file"
                        id="signatureFile"
                        accept=".png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        disabled={isLoading}
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}
                <button type="submit" className="submit-btn" disabled={isLoading}>
                    {isLoading ? 'Téléchargement...' : 'Télécharger la Signature'}
                </button>
            </form>
            {/* Vous pouvez ajouter un aperçu de la signature actuelle si elle existe */}
        </div>
    );
}

export default UploadDoctorCentreSignaturePage;