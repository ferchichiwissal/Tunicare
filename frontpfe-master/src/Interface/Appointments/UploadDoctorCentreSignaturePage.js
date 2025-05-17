import React, { useState, useEffect, useContext } from 'react'; // Ajout de useContext
import apiClient from '../../utils/apiClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Importer useAuth
import { useTranslation } from 'react-i18next'; // Importer useTranslation
import './UploadDoctorCentreSignaturePage.css';

function UploadDoctorCentreSignaturePage() {
    const { t } = useTranslation(); // Initialiser useTranslation
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
            setError(t('uploadSignaturePage.selectFileError'));
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
            setMessage(response.data.message || t('uploadSignaturePage.uploadSuccess'));
            setSelectedFile(null); // Réinitialiser le champ de fichier
        } catch (err) {
            const errorMessage = err.response?.data?.message || t('uploadSignaturePage.uploadError');
            setError(errorMessage);
            console.error("Upload signature error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="cabinet-settings-page"> {/* Changed class to match CabinetSettingsPage.css */}
            <h2>{t('uploadSignaturePage.title')}</h2>
            <p>
                {t('uploadSignaturePage.description')}
            </p>
            <form onSubmit={handleSubmit}> {/* Removed form class, not strictly necessary unless styled */}
                <div className="form-group"> {/* This class exists in both, keep it */}
                    <label htmlFor="signatureFile">{t('uploadSignaturePage.fileLabel')}</label>
                    <input
                        type="file"
                        id="signatureFile"
                        accept=".png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        disabled={isLoading}
                    />
                </div>
                {error && <p className="error-message">{error}</p>} {/* This class exists in both, keep it */}
                {message && <p className="success-message">{message}</p>} {/* This class exists in both, keep it */}
                <button type="submit" className="btn btn-primary" disabled={isLoading}> {/* Changed class to btn btn-primary */}
                    {isLoading ? t('uploadSignaturePage.uploadingButton') : t('uploadSignaturePage.uploadButton')}
                </button>
            </form>
            {/* Vous pouvez ajouter un aperçu de la signature actuelle si elle existe */}
        </div>
    );
}

export default UploadDoctorCentreSignaturePage;
