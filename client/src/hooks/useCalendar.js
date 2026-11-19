// Loads one month of slot states from GET /api/appointments/calendar.
// `params` picks whose calendar: { case_id } | { appointment_id } | {} (lawyer's own).
import { useCallback, useEffect, useState } from 'react';
import api, { queryString } from '../api/client';
import { monthOf, todayISO } from '../utils/format';

export default function useCalendar(params) {
    const [month, setMonth] = useState(monthOf(todayISO()));
    const [days, setDays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const key = JSON.stringify(params);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get(`/appointments/calendar${queryString({ ...JSON.parse(key), month })}`);
            setDays(data.days);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [key, month]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { month, setMonth, days, loading, error, reload };
}
