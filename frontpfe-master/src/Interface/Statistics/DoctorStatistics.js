import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../LanguageContext'; // Import useLanguage
import './Statistics.css';

const translations = {
    title: {
        en: 'Completed Examinations Referred by Center',
        fr: 'Examens Complets Référés par Centre'
    },
    yearLabel: { en: 'Year:', fr: 'Année :' },
    monthLabel: { en: 'Month:', fr: 'Mois :' },
    allMonths: { en: 'All Months', fr: 'Tous les mois' },
    months: {
        en: [
            { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
            { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
            { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
            { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
        ],
        fr: [
            { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' }, { value: 3, label: 'Mars' },
            { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
            { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' }, { value: 9, label: 'Septembre' },
            { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' }
        ]
    },
    totalForMonth: { en: 'Total for', fr: 'Total pour' },
    selectedMonth: { en: 'selected month', fr: 'mois sélectionné' },
    noStats: {
        en: 'No completed examination statistics found for the selected period.',
        fr: 'Aucune statistique d\'examen complet trouvée pour la période sélectionnée.'
    },
    centerNameHeader: { en: 'Center Name', fr: 'Nom du Centre' },
    examCountHeader: { en: 'Number of Completed Examinations', fr: 'Nombre d\'Examens Complets' },
    loading: { en: 'Loading statistics...', fr: 'Chargement des statistiques...' },
    errorAccessDenied: {
        en: 'Access denied. You must be a DOCTOR to view these statistics.',
        fr: 'Accès refusé. Vous devez être MÉDECIN pour consulter ces statistiques.'
    },
    errorFailedToLoad: {
        en: 'Failed to load statistics.',
        fr: 'Échec du chargement des statistiques.'
    }
};

const DoctorStatistics = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const { language = 'en' } = useLanguage() || {}; // Get current language, default to 'en' if context is not found

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // getMonth() is 0-indexed
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    const years = Array.from({ length: 10 }, (_, i) => currentYear - i); // Last 10 years
    
    const monthOptions = [
        { value: '', label: translations.allMonths[language] },
        ...translations.months[language]
    ];

    useEffect(() => {
        const fetchStats = async () => {
            if (user && user.role === 'DOCTOR') {
                try {
                    setLoading(true);
                    let url = `/api/statistics/doctor/exams-by-center?year=${selectedYear}`;
                    if (selectedMonth) {
                        url += `&month=${selectedMonth}`;
                    }
                    const response = await apiClient.get(url);
                    setStats(response.data);
                    setError('');
                } catch (err) {
                    console.error("Error fetching doctor statistics:", err);
                    setError(`${translations.errorFailedToLoad[language]} ${err.response?.data?.message || err.message}`);
                    setStats([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setError(translations.errorAccessDenied[language]);
                setLoading(false);
                setStats([]);
            }
        };

        fetchStats();
    }, [user, selectedYear, selectedMonth, language]); // Add language to dependency array

    // Update month options when language changes
    useEffect(() => {
        setSelectedMonth(prevMonth => {
            // If "All Months" was selected, keep it, otherwise try to keep the numeric month
            return prevMonth === '' ? '' : parseInt(prevMonth, 10);
        });
    }, [language]);

    const totalExamsForMonth = selectedMonth && stats.length > 0
        ? stats.reduce((total, stat) => total + stat.examCount, 0)
        : null;

    if (loading) {
        return <div className="statistics-container"><p>{translations.loading[language]}</p></div>;
    }

    if (error) {
        return <div className="statistics-container error-message"><p>{error}</p></div>;
    }

    const currentMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || translations.selectedMonth[language];

    return (
        <div className="statistics-container">
            <h2>{translations.title[language]}</h2>
            <div className="filters-container">
                <label htmlFor="year-select">{translations.yearLabel[language]} </label>
                <select id="year-select" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                </select>

                <label htmlFor="month-select">{translations.monthLabel[language]} </label>
                <select id="month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : '')}>
                    {/* Regenerate options based on current language */}
                    { [
                        { value: '', label: translations.allMonths[language] },
                        ...translations.months[language]
                      ].map(month => <option key={month.value} value={month.value}>{month.label}</option>)
                    }
                </select>

                {totalExamsForMonth !== null && (
                    <div className="total-exams-month">
                        <strong>{translations.totalForMonth[language]} {currentMonthLabel}: {totalExamsForMonth}</strong>
                    </div>
                )}
            </div>

            {stats.length === 0 ? (
                <p>{translations.noStats[language]}</p>
            ) : (
                <table className="statistics-table">
                    <thead>
                        <tr>
                            <th>{translations.centerNameHeader[language]}</th>
                            <th>{translations.examCountHeader[language]}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((stat, index) => (
                            <tr key={index}>
                                <td>{stat.centerName}</td>
                                <td>{stat.examCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default DoctorStatistics;