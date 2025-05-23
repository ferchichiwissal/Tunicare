import React, { useState, useEffect, useContext, useCallback } from 'react'; // Added useCallback
import apiClient from '../../utils/apiClient';
import AuthContext from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { clearUserData, getToken, isTokenExpired } from '../../utils/auth'; // Import auth utils
import './ManageReportTemplates.css'; // Optional CSS

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const ManageReportTemplates = () => {
    const { t } = useTranslation();
    const { user } = useContext(AuthContext);
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // For form saving state
    const [error, setError] = useState('');
    const [formError, setFormError] = useState(''); // Error specific to the form
    const navigate = useNavigate(); // Initialize useNavigate

    // State for Add/Edit Form
    const [showForm, setShowForm] = useState(false); // Initialize to false to show button and table by default
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState({ id: null, nomModele: '', typeModele: '', contenuModele: '' });
    const [previewImageFile, setPreviewImageFile] = useState(null); // For storing the selected image file

    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('manageReportTemplates.alerts.sessionExpired')); // Add translation key
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


    // Function to fetch templates
    const fetchTemplates = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await apiClient.get('/api/modeles-compte-rendu');
            setTemplates(response.data || []);
        } catch (err) {
            console.error("Failed to fetch report templates:", err);
            setError(err.response?.data?.message || t('manageReportTemplates.errors.fetchFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch templates on component mount
    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchTemplates();
        } else {
            setError(t('common.errors.unauthorized'));
            setIsLoading(false);
        }
    }, [user, t]);

    const handleDelete = async (id) => {
        if (!window.confirm(t('manageReportTemplates.confirmDelete'))) {
            return;
        }
        setError('');
        try {
            await apiClient.delete(`/api/modeles-compte-rendu/${id}`);
            // Refresh the list after deletion
            setTemplates(prevTemplates => prevTemplates.filter(template => template.id !== id));
            alert(t('manageReportTemplates.success.deleteSuccess'));
        } catch (err) {
            console.error("Failed to delete template:", err);
            setError(err.response?.data?.message || t('manageReportTemplates.errors.deleteFailed'));
        }
    };

    const handleOpenAddForm = () => {
        setCurrentTemplate({ id: null, nomModele: '', typeModele: '', contenuModele: '' });
        setPreviewImageFile(null); // Reset file
        setIsEditing(false);
        setShowForm(true);
        setFormError('');
    };

    const handleOpenEditForm = (template) => {
        setCurrentTemplate({ ...template }); // Copy template data
        setPreviewImageFile(null); // Reset file input, existing image URL should be handled by display if needed
        setIsEditing(true);
        setShowForm(true);
        setFormError('');
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setCurrentTemplate({ id: null, nomModele: '', typeModele: '', contenuModele: '' }); // Reset form
        setPreviewImageFile(null); // Reset file
        setFormError('');
    };

    const handleFileChange = (event) => {
        setPreviewImageFile(event.target.files[0]);
    };

    const handleFormInputChange = (event) => {
    const { name, value } = event.target;
    setCurrentTemplate(prev => ({ ...prev, [name]: value }));
};

const handleSaveTemplate = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setFormError('');
        setError(''); // Clear main error too

        const formData = new FormData();
        formData.append('nomModele', currentTemplate.nomModele);
        formData.append('typeModele', currentTemplate.typeModele);
        formData.append('contenuModele', currentTemplate.contenuModele);
        if (previewImageFile) {
            formData.append('previewImageFile', previewImageFile);
        }

        try {
            if (isEditing) {
                // Update existing template
                // Note: For PUT with FormData, some backends might expect POST or specific handling for file updates.
                // This assumes the backend handles PUT with FormData for updates including optional new file.
                await apiClient.put(`/api/modeles-compte-rendu/${currentTemplate.id}`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            } else {
                // Create new template
                await apiClient.post('/api/modeles-compte-rendu', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            }
            alert(isEditing ? t('manageReportTemplates.success.updateSuccess') : t('manageReportTemplates.success.addSuccess'));
            handleCloseForm();
            fetchTemplates(); // Refresh the list
        } catch (err) {
            console.error("Failed to save template:", err);
            setFormError(err.response?.data?.message || (isEditing ? t('manageReportTemplates.errors.updateFailed') : t('manageReportTemplates.errors.addFailed')));
        } finally {
            setIsSaving(false);
        }
    };


    if (isLoading) {
        return <div className="container mt-5"><p>{t('manageReportTemplates.loading')}</p></div>;
    }

    if (error && templates.length === 0) { // Show error prominently if loading failed
        return <div className="container mt-5 alert alert-danger">{error}</div>;
    }

    // Ensure only Admin can see this page content
    if (user?.role !== 'ADMIN') {
         return <div className="container mt-5 alert alert-danger">{t('common.errors.unauthorized')}</div>;
    }

    return (
        <div className="manage-report-templates-container container mt-5">
            <h2>{t('manageReportTemplates.title')}</h2>
            {error && <div className="alert alert-danger mt-3">{error}</div>}

            {/* Add Template Button */}
            <div className="add-template-button-container">
                <button className="btn btn-primary mb-3 add-template-button" onClick={handleOpenAddForm}>
                    {t('manageReportTemplates.buttons.addTemplate')}
                </button>
            </div>

            {/* Add/Edit Form Section (Conditional Rendering) */}
            {showForm ? (
                // If showForm is true, display only the form
                <div className="card mb-4">
                    <div className="card-header">
                        {isEditing ? t('manageReportTemplates.editTitle') : t('manageReportTemplates.addTitle')}
                    </div>
                    <div className="card-body">
                        {formError && <div className="alert alert-danger">{formError}</div>}
                        <form onSubmit={handleSaveTemplate}>
                            <div className="mb-3">
                                <label htmlFor="nomModele" className="form-label required">{t('manageReportTemplates.form.name')}</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="nomModele"
                                    name="nomModele"
                                    value={currentTemplate.nomModele}
                                    onChange={handleFormInputChange}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="typeModele" className="form-label">{t('manageReportTemplates.form.type')}</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="typeModele"
                                    name="typeModele"
                                    value={currentTemplate.typeModele}
                                    onChange={handleFormInputChange}
                                    placeholder={t('manageReportTemplates.form.typePlaceholder')}
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="previewImageFile" className="form-label">{t('manageReportTemplates.form.previewImage')}</label>
                                <input
                                    type="file"
                                    className="form-control"
                                    id="previewImageFile"
                                    name="previewImageFile"
                                    onChange={handleFileChange}
                                    accept="image/*" // Accept only image files
                                />
                                {isEditing && currentTemplate.previewImageUrl && !previewImageFile && (
                                    <div className="mt-2">
                                        <small>{t('manageReportTemplates.form.currentImage')}:</small>
                                        <img src={currentTemplate.previewImageUrl} alt={t('manageReportTemplates.form.currentImageAlt')} style={{ width: '100px', height: 'auto', display: 'block', marginTop: '5px' }} />
                                    </div>
                                )}
                            </div>
                            <div className="mb-3">
                                <label htmlFor="contenuModele" className="form-label required">{t('manageReportTemplates.form.content')}</label>
                                <textarea
                                    className="form-control"
                                    id="contenuModele"
                                    name="contenuModele"
                                    value={currentTemplate.contenuModele}
                                    onChange={handleFormInputChange}
                                    rows="5" // Optional: adjust number of rows
                                    required
                                />
                            </div>
                            {/* The duplicate previewImageFile div was removed in a previous step, this comment is just for tracking */}
                            <button type="submit" className="btn btn-success me-2" disabled={isSaving}>
                                {isSaving ? t('common.saving') : t('common.save')}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={handleCloseForm}>
                                {t('common.cancel')}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                // If showForm is false, display the "Add Template" button and the templates list
                <>
                    {/* Templates List */}
                    {templates.length === 0 && !isLoading ? (
                        <p>{t('manageReportTemplates.noTemplates')}</p>
                    ) : (
                        <>
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>{t('manageReportTemplates.tableHeaders.name')}</th>
                                        <th>{t('manageReportTemplates.tableHeaders.type')}</th>
                                        <th>{t('manageReportTemplates.tableHeaders.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.map(template => (
                                        <tr key={template.id}>
                                            <td>{template.nomModele}</td>
                                            <td>{template.typeModele || '-'}</td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-warning me-2"
                                                    onClick={() => handleOpenEditForm(template)}
                                                >
                                                    {t('common.edit')}
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleDelete(template.id)}
                                                >
                                                    {t('common.delete')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </>
            )}
            {/* TODO: Add Modals/Forms for Add/Edit */}
            {/* <AddEditTemplateModal show={showAddModal || showEditModal} handleClose={() => ...} template={currentTemplate} refreshTemplates={fetchTemplates} /> */}
        </div>
    );
};

export default ManageReportTemplates;
