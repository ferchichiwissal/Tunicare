import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import apiClient from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import './Statistics.css';

const CenterStatistics = () => {
    const { t } = useTranslation(); // Initialize useTranslation
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // getMonth() is 0-indexed
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    // Month options using t() for labels
    const monthOptions = useMemo(() => {
        const months = [];
        for (let i = 1; i <= 12; i++) {
            months.push({ value: i, label: t(`centerStatistics.months.${i}`) });
        }
        return [
            { value: '', label: t('centerStatistics.allMonths') },
            ...months
        ];
    }, [t]); // Recreate monthOptions when t changes (language changes)


    useEffect(() => {
        const fetchStats = async () => {
            if (user && user.role === 'DOCTOR_CENTRE_EXAMEN') {
                try {
                    setLoading(true);
                    let url = `/api/statistics/center/exams-by-doctor?year=${selectedYear}`;
                    if (selectedMonth) {
                        url += `&month=${selectedMonth}`;
                    }
                    const response = await apiClient.get(url);
                    setStats(response.data);
                    setError('');
                } catch (err) {
                    console.error("Error fetching center statistics:", err);
                    setError(t('centerStatistics.errors.failedToLoadPrefix') + (err.response?.data?.message || err.message));
                    setStats([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setError(t('centerStatistics.errors.accessDenied'));
                setLoading(false);
                setStats([]);
            }
        };

        fetchStats();
    }, [user, selectedYear, selectedMonth, t]); // Added t to dependency array

    if (loading) {
        return <div className="statistics-container"><p>{t('centerStatistics.loading')}</p></div>;
    }

    if (error) {
        return <div className="statistics-container error-message"><p>{error}</p></div>;
    }

    return (
        <div className="statistics-container">
            <h2>{t('centerStatistics.title')}</h2>
            <div className="filters-container">
                <label htmlFor="year-select-center">{t('centerStatistics.yearLabel')}</label>
                <select id="year-select-center" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                </select>

                <label htmlFor="month-select-center">{t('centerStatistics.monthLabel')}</label>
                <select id="month-select-center" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : '')}>
                    {/* Use the memoized monthOptions */}
                    {monthOptions.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
                </select>
            </div>

            {stats.length === 0 ? (
                <p>{t('centerStatistics.noStats')}</p>
            ) : (
                <table className="statistics-table">
                    <thead>
                        <tr>
                            <th>{t('centerStatistics.tableHeaders.prescribingDoctor')}</th>
                            <th>{t('centerStatistics.tableHeaders.cabinetName')}</th>
                            <th>{t('centerStatistics.tableHeaders.numberOfExaminations')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((stat, index) => (
                            <tr key={index}>
                                <td>{stat.prescribingDoctorName}</td>
                                <td>{stat.prescribingDoctorCabinetName || t('common.notAvailable')}</td>
                                <td>{stat.examCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default CenterStatistics;
