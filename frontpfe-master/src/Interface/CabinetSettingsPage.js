import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getUserData, getCabinetId } from '../utils/auth'; // Assuming these utils provide user and cabinet info

const CabinetSettingsPage = () => {
    const [cabinetId, setCabinetId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6952';

    useEffect(() => {
        // Get the current cabinet ID when the component mounts
        const currentCabinetId = getCabinetId();
        if (!currentCabinetId) {
            setError("Impossible de déterminer l'ID du cabinet. Veuillez vous reconnecter.");
        }
        setCabinetId(currentCabinetId);
    }, []);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setMessage(''); // Clear previous messages
        setError('');
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError("Veuillez sélectionner un fichier image pour la signature.");
            return;
        }
        if (!cabinetId) {
            setError("ID du cabinet non trouvé. Impossible de téléverser.");
            return;
        }

        const userData = getUserData();
        if (!userData || !userData.accessToken) {
            setError("Erreur d'authentification.");
            return;
        }

        setIsLoading(true);
        setMessage('');
        setError('');

        const formData = new FormData();
        formData.append('signatureFile', selectedFile); // 'signatureFile' must match the @RequestParam name in the backend

        try {
            const response = await axios.post(
                `${API_URL}/cabinets/${cabinetId}/signature`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${userData.accessToken}`,
                        'Content-Type': 'multipart/form-data', // Important for file uploads
                    },
                }
            );
            setMessage(response.data || "Signature téléversée avec succès !");
            setSelectedFile(null); // Clear file input after successful upload (optional)
            // Optionally clear the file input visually: document.getElementById('signature-upload-input').value = null;

        } catch (err) {
            console.error("Error uploading signature:", err);
            setError(err.response?.data || "Échec du téléversement de la signature.");
            setMessage('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="cabinet-settings-page" style={{ padding: '20px' }}>
            <h2>Paramètres du Cabinet</h2>

            {error && <p style={{ color: 'red' }}>Erreur : {error}</p>}
            {message && <p style={{ color: 'green' }}>{message}</p>}

            <div style={{ marginTop: '20px' }}>
                <h3>Téléverser la Signature Électronique</h3>
                <p>Sélectionnez une image (PNG, JPG) pour la signature qui apparaîtra sur les ordonnances.</p>

                <input
                    type="file"
                    id="signature-upload-input"
                    accept="image/png, image/jpeg, image/jpg" // Restrict file types
                    onChange={handleFileChange}
                    disabled={isLoading || !cabinetId}
                    style={{ display: 'block', marginBottom: '10px' }}
                />

                <button
                    onClick={handleUpload}
                    disabled={isLoading || !selectedFile || !cabinetId}
                    className="btn btn-primary" // Example styling
                >
                    {isLoading ? 'Téléversement...' : 'Enregistrer la Signature'}
                </button>
            </div>

            {/* Add other cabinet settings here if needed */}

        </div>
    );
};

export default CabinetSettingsPage;