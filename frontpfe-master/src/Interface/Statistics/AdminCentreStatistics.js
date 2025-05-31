import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import '../../Interface/Statistics/Statistics.css'; // Assurez-vous que le chemin est correct

const AdminCentreStatistics = () => {
    const { t, i18n } = useTranslation(); // Initialize useTranslation and get i18n instance
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, token } = useAuth();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Month is 0-indexed

    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                setError(null); // Clear previous errors
                
                if (!token) {
                    setError(t("authentication_token_missing")); // Use translation key
                    setLoading(false);
                    console.error("Token JWT manquant pour l'appel API.");
                    return;
                }

                const response = await axios.get('http://localhost:6952/api/statistics/admin-centre/exams-by-doctor', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    params: {
                        year: selectedYear,
                        month: selectedMonth
                    }
                });
                setStats(response.data);
            } catch (err) {
                setError(t("error_loading_statistics")); // Use translation key
                console.error("Erreur API:", err);
            } finally {
                setLoading(false);
            }
        };

        if (user && token) { 
            fetchStats();
        } else if (!user && !token && !loading) {
             console.log("AdminCentreStatistics: User or token not available, skipping fetchStats.");
             setLoading(false);
        }

    }, [user, token, selectedYear, selectedMonth]); // Dépendance à user, token, year et month

    const handleYearChange = (event) => {
        setSelectedYear(parseInt(event.target.value, 10));
    };

    const handleMonthChange = (event) => {
        setSelectedMonth(parseInt(event.target.value, 10));
    };

    const handlePrint = () => {
        // Implement print functionality here if needed
        console.log("Print button clicked for Year:", selectedYear, "Month:", selectedMonth);
        // Example: window.print();
    };

    if (loading) {
        return <div>{t('admin_centre_statistics.loading_statistics')}</div>;
    }

    if (error) {
        return <div>{t('admin_centre_statistics.error')}: {error}</div>;
    }

    return (
        <div className="statistics-container">
            <h2>{t('admin_centre_statistics.admin_centre_exam_stats_title')}</h2>

            <div className="filters-container">
                <label htmlFor="year-select">{t('admin_centre_statistics.year')}</label>
                <select id="year-select" value={selectedYear} onChange={handleYearChange}>
                    {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>

                <label htmlFor="month-select">{t('admin_centre_statistics.month')}</label>
                <select id="month-select" value={selectedMonth} onChange={handleMonthChange}>
                    <option value="">{t('admin_centre_statistics.all_months')}</option>
                    {months.map(month => (
                        <option key={month} value={month}>{new Date(0, month - 1).toLocaleString(i18n.language, { month: 'long' })}</option>
                    ))}
                </select>

            </div>

            {stats.length > 0 ? (
                <table className="statistics-table">
                    <thead>
                        <tr>
                            <th>{t('admin_centre_statistics.prescribing_doctor')}</th>
                            <th>{t('admin_centre_statistics.cabinet_name')}</th>
                            <th>{t('admin_centre_statistics.number_of_exams')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((stat, index) => (
                            <tr key={index}>
                                <td>{stat.prescribingDoctorName}</td>
                                <td>{stat.prescribingDoctorCabinetName || 'N/A'}</td> {/* Handle null cabinet name */}
                                <td>{stat.examCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>{t('admin_centre_statistics.no_exam_stats_found')}</p>
            )}
        </div>
    );
};

export default AdminCentreStatistics;
