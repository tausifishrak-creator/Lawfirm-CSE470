// Lawyer: weekly availability grid (days x 7 slots) and the availability calendar for specific dates.
import { useEffect, useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import useApi from '../hooks/useApi';
import { PageHeader, PageStatus } from '../components/ui';
import AvailabilityCalendar from '../components/AvailabilityCalendar';

const ALL_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function Schedule() {
    const toast = useToast();
    const { data, error, loading } = useApi('/schedule');
    const [schedule, setSchedule] = useState({});
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const [savedAt, setSavedAt] = useState(0); // tells the calendar to reload after saving

    useEffect(() => {
        if (data) setSchedule(data.schedule);
    }, [data]);

    const toggle = (day, slotId) => {
        setSchedule((current) => {
            const slots = current[day] || [];
            const next = slots.includes(slotId) ? slots.filter((id) => id !== slotId) : [...slots, slotId];
            return { ...current, [day]: next };
        });
    };

    const save = async (e) => {
        e.preventDefault();
        setBusy(true);
        setFormError('');
        try {
            const result = await api.put('/schedule', { schedule });
            toast.success(result.message);
            setSavedAt(Date.now());
        } catch (err) {
            setFormError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <main>
            <section className="dashboard">
                <PageHeader title="My Schedule">
                    <p>Set your available office hours for client appointments.</p>
                </PageHeader>
                <PageStatus error={error} loading={loading} />
                {formError && <div className="alert alert-error">{formError}</div>}

                {data && (
                    <div className="dashboard_section">
                        <h2>Weekly Hours</h2>
                        <div className="schedule_rules">
                            <ul>
                                <li>You must select at least <strong>3 days</strong> per week.</li>
                                <li>You can work a maximum of <strong>6 days</strong> per week.</li>
                                <li><strong>Fridays</strong> are default holidays (closed).</li>
                            </ul>
                        </div>

                        <form onSubmit={save}>
                            <div className="schedule_scroll">
                                <div className="schedule_grid">
                                    <div className="schedule_header">Day</div>
                                    {data.slots.map((slot) => (
                                        <div className="schedule_header" key={slot.id}>{slot.label}</div>
                                    ))}

                                    {ALL_DAYS.map((day) => (
                                        <div key={day} style={{ display: 'contents' }}>
                                            <div className="schedule_day">{day}</div>
                                            {data.slots.map((slot) =>
                                                day === 'Friday' ? (
                                                    <div className="slot_disabled" key={slot.id}>Off</div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        key={slot.id}
                                                        className={`slot_toggle ${(schedule[day] || []).includes(slot.id) ? 'selected' : ''}`}
                                                        aria-pressed={(schedule[day] || []).includes(slot.id)}
                                                        onClick={() => toggle(day, slot.id)}
                                                    >
                                                        Available
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="text_right mt_30">
                                <button type="submit" className="btn_primary" style={{ padding: '12px 30px', fontSize: 16 }} disabled={busy}>
                                    {busy ? 'Saving…' : 'Save Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {data && <AvailabilityCalendar refreshKey={savedAt} />}
            </section>
        </main>
    );
}
