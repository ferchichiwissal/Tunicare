import React, { useState, useEffect, useContext, useCallback } from 'react';
import apiClient from '../../utils/apiClient';
import AuthContext from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { clearUserData, getToken, isTokenExpired } from '../../utils/auth';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './ManageReportTemplates.css';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const ManageReportTemplates = () => {
    const { t } = useTranslation();
    const { user } = useContext(AuthContext);
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');
    const navigate = useNavigate();

    // State for Add/Edit Form
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState({ id: null, nomModele: '', typeModele: '', contenuModele: '' });
    const [previewImageFile, setPreviewImageFile] = useState(null);

    // Determine if the user has permission to manage (add/edit/delete) templates
    const canManageTemplates = user?.role === 'ADMIN_CENTRE_EXAMEN';
    // Determine if the user can view templates (all authorized roles)
    const canViewTemplates = user?.role === 'ADMIN_CENTRE_EXAMEN' || user?.role === 'DOCTOR_CENTRE_EXAMEN';


    // --- Logout Function ---
    const performLogout = useCallback(() => {
        clearUserData();
        alert(t('manageReportTemplates.alerts.sessionExpired'));
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
            // The backend now handles filtering by centre based on the authenticated user
            const response = await apiClient.get('/api/modeles-compte-rendu');
            setTemplates(response.data || []);
        } catch (err) {
            console.error("Failed to fetch report templates:", err);
            setError(err.response?.data?.message || t('manageReportTemplates.errors.fetchFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch templates on component mount if user is authorized to view
    useEffect(() => {
        if (canViewTemplates) {
            fetchTemplates();
        } else {
            setError(t('common.errors.unauthorized'));
            setIsLoading(false);
        }
    }, [user, t, canViewTemplates]); // Added canViewTemplates to dependency array

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
        setPreviewImageFile(null);
        setIsEditing(false);
        setShowForm(true);
        setFormError('');
    };

    const handleOpenEditForm = (template) => {
        setCurrentTemplate({ ...template });
        setPreviewImageFile(null);
        setIsEditing(true);
        setShowForm(true);
        setFormError('');
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setCurrentTemplate({ id: null, nomModele: '', typeModele: '', contenuModele: '' });
        setPreviewImageFile(null);
        setFormError('');
    };

    const handleFileChange = (event) => {
        setPreviewImageFile(event.target.files[0]);
    };

    const handleFormInputChange = (event) => {
        const { name, value } = event.target;
        setCurrentTemplate(prev => ({ ...prev, [name]: value }));
    };

    // Handler for ReactQuill content changes
    const handleContenuChange = (html) => {
        setCurrentTemplate(prev => ({ ...prev, contenuModele: html }));
    };

    const handleSaveTemplate = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setFormError('');
        setError('');

        const formData = new FormData();
        formData.append('nomModele', currentTemplate.nomModele);
        formData.append('typeModele', currentTemplate.typeModele);
        formData.append('contenuModele', currentTemplate.contenuModele);
        if (previewImageFile) {
            formData.append('previewImageFile', previewImageFile);
        }

        try {
            if (isEditing) {
                await apiClient.put(`/api/modeles-compte-rendu/${currentTemplate.id}`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            } else {
                await apiClient.post('/api/modeles-compte-rendu', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            }
            alert(isEditing ? t('manageReportTemplates.success.updateSuccess') : t('manageReportTemplates.success.addSuccess'));
            handleCloseForm();
            fetchTemplates();
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

    // Show error if user cannot view templates
    if (!canViewTemplates) {
         return <div className="container mt-5 alert alert-danger">{t('common.errors.unauthorized')}</div>;
    }

    // Show error if fetching failed AND there are no templates to display
    if (error && templates.length === 0) {
        return <div className="container mt-5 alert alert-danger">{error}</div>;
    }


    return (
        <div className="manage-report-templates-container container mt-5">
            <h2>{t('manageReportTemplates.title')}</h2>
            {error && <div className="alert alert-danger mt-3">{error}</div>}

            {/* Add Template Button - Only visible if user can manage templates */}
            {canManageTemplates && (
                <div className="add-template-button-container">
                    <button className="btn btn-primary mb-3 add-template-button" onClick={handleOpenAddForm}>
                        {t('manageReportTemplates.buttons.addTemplate')}
                    </button>
                </div>
            )}


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
                                    accept="image/*"
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
                                <ReactQuill
                                    theme="snow"
                                    value={currentTemplate.contenuModele}
                                    onChange={handleContenuChange}
                                    modules={quillModules}
                                    className="quill-editor-custom"
                                />
                            </div>
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
                // If showForm is false, display the "Add Template" button (if authorized) and the templates list
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
                                        {canManageTemplates && <th>{t('manageReportTemplates.tableHeaders.actions')}</th>} {/* Show actions header only if user can manage */}
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.map(template => (
                                        <tr key={template.id}>
                                            <td>{template.nomModele}</td>
                                            <td>{template.typeModele || '-'}</td>
                                            {canManageTemplates && ( // Show action buttons only if user can manage
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
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

// Define Quill modules (can be customized)
const quillModules = {
    toolbar: [
        [{ 'header': '1'}, {'header': '2'}, { 'font': [] }],
        [{size: []}],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
        ['link'],
        ['clean'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
    ],
};

export default ManageReportTemplates;
