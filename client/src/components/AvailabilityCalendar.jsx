// Lawyer: month calendar of their own availability and appointments.
// Pick a date to see its time slots; click a slot to open or close it for that date only.
import { useEffect, useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import useCalendar from '../hooks/useCalendar';
import MonthCalendar from './MonthCalendar';
import { StatusBadge } from './ui';
import { fullDate, todayISO } from '../utils/format';

export default function AvailabilityCalendar({ refreshKey }) {
    const toast = useToast();
    const { month, setMonth, days, loading, error, reload } = useCalendar({});
    const [date, setDate] = useState(todayISO());
    const [busySlot, setBusySlot] = useState(null);

    // Reload when the weekly hours are saved on the same page.
    useEffect(() => {
        if (refreshKey) reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    const day = days.find((d) => d.date === date);

    const changeMonth = (value) => {
        setMonth(value);
        setDate('');
    };

    const toggle = async (slot) => {
        const open = slot.state !== 'available';
        setBusySlot(slot.id);
        try {
            const result = await api.put(`/schedule/dates/${date}`, { slot: slot.id, available: open });
            toast.success(result.message);
            await reload();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusySlot(null);
        }
    };

    return (
        <div className="dashboard_section">
            <h2>Availability Calendar</h2>
            <p className="subtitle" style={{ marginBottom: 16 }}>
                Your weekly hours fill this calendar automatically. Pick a date to see who has booked you, or to open or
                close a time slot on that date only. Clients can only book the slots shown as available.
            </p>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="table_container panel_padded">
                <div className="calendar_layout">
                    <div>
                        {loading && days.length === 0 ? (
                            <p className="calendar_loading">Loading calendar…</p>
                        ) : (
                            <MonthCalendar mode="manage" month={month} days={days} selected={date}
                                onSelect={setDate} onMonthChange={changeMonth} />
                        )}
                    </div>

                    <div className="day_panel">
                        {!day ? (
                            <>
                                <h4>Pick a date</h4>
                                <p className="hint">Choose a day to manage its time slots.</p>
                            </>
                        ) : (
                            <>
                                <h4>{fullDate(day.date)}</h4>
                                <p className="hint">
                                    {day.weekday === 'Friday' ? 'Friday is a holiday.' : 'Click a slot to open or close it for this date.'}
                                </p>
                                <div className="slot_list">
                                    {day.slots.map((slot) => {
                                        if (slot.state === 'booked') {
                                            return (
                                                <div key={slot.id} className="slot_chip state_booked">
                                                    <span>
                                                        {slot.label}
                                                        {slot.appointment && (
                                                            <span className="slot_booking_info">
                                                                {slot.appointment.client_name} · {slot.appointment.case_title}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {slot.appointment ? <StatusBadge status={slot.appointment.status} /> : <small>Booked</small>}
                                                </div>
                                            );
                                        }
                                        if (slot.state === 'past' || day.weekday === 'Friday') {
                                            return (
                                                <div key={slot.id} className="slot_chip state_past">
                                                    {slot.label}
                                                    <small>{slot.state === 'past' ? 'Past' : 'Holiday'}</small>
                                                </div>
                                            );
                                        }
                                        const open = slot.state === 'available';
                                        return (
                                            <button type="button" key={slot.id} className={`slot_chip state_${slot.state}`}
                                                onClick={() => toggle(slot)} disabled={busySlot !== null} aria-pressed={open}>
                                                {slot.label}
                                                <small>{busySlot === slot.id ? 'Saving…' : open ? '✓ Available (click to close)' : 'Closed (click to open)'}</small>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
