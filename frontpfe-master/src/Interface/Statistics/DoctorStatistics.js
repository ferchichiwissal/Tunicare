import React, { useState, useEffect, useContext, useMemo } from 'react'; // Added useMemo
import apiClient from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import './Statistics.css';

const DoctorStatistics = () => {
    const { t, i18n } = useTranslation(); // Initialize useTranslation and get i18n instance
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // getMonth() is 0-indexed
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    const years = Array.from({ length: 10 }, (_, i) => currentYear - i); // Last 10 years

    // Month options using t() for labels
    const monthOptions = useMemo(() => {
        const months = [];
        for (let i = 1; i <= 12; i++) {
            months.push({ value: i, label: t(`doctorStatistics.months.${i}`) });
        }
        return [
            { value: '', label: t('doctorStatistics.allMonths') },
            ...months
        ];
    }, [t]); // Recreate monthOptions when t changes (language changes)


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
                    setError(`${t('doctorStatistics.errors.failedToLoad')} ${err.response?.data?.message || err.message}`);
                    setStats([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setError(t('doctorStatistics.errors.accessDenied'));
                setLoading(false);
                setStats([]);
            }
        };

        fetchStats();
    }, [user, selectedYear, selectedMonth, t]); // Add t to dependency array

    // Update selected month label when language changes
    useEffect(() => {
        // This effect is not strictly necessary if monthOptions is memoized with t as dependency
        // but can be kept for clarity if needed for other logic depending on month label.
    }, [i18n.language]);


    const totalExamsForMonth = selectedMonth && stats.length > 0
        ? stats.reduce((total, stat) => total + stat.examCount, 0)
        : null;

    if (loading) {
        return <div className="statistics-container"><p>{t('doctorStatistics.loading')}</p></div>;
    }

    if (error) {
        return <div className="statistics-container error-message"><p>{error}</p></div>;
    }

    // Find the label for the currently selected month using the generated options
    const currentMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || t('doctorStatistics.selectedMonthLabel');


    return (
        <div className="statistics-container">
            <h2>{t('doctorStatistics.title')}</h2>
            <div className="filters-container">
                <label htmlFor="year-select">{t('doctorStatistics.yearLabel')} </label>
                <select id="year-select" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                </select>

                <label htmlFor="month-select">{t('doctorStatistics.monthLabel')} </label>
                <select id="month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : '')}>
                    {/* Use the memoized monthOptions */}
                    { monthOptions.map(month => <option key={month.value} value={month.value}>{month.label}</option>) }
                </select>

                {totalExamsForMonth !== null && (
                    <div className="total-exams-month">
                        <strong>{t('doctorStatistics.totalFor')} {currentMonthLabel}: {totalExamsForMonth}</strong>
                    </div>
                )}
            </div>

            {stats.length === 0 ? (
                <p>{t('doctorStatistics.noStats')}</p>
            ) : (
                <table className="statistics-table">
                    <thead>
                        <tr>
                            <th>{t('doctorStatistics.centerNameHeader')}</th>
                            <th>{t('doctorStatistics.examCountHeader')}</th>
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
