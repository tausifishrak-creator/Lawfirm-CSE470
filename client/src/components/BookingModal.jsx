// Pop-up calendar for booking an appointment on a case (client or lawyer), or for moving one (lawyer).
//   <BookingModal caseInfo={{ case_id, title, other_name }} role="client" onClose={...} onDone={...} />
//   <BookingModal appointment={{ appointment_id, case_title, other_name }} role="lawyer" ... />   (reschedule)
import { useEffect, useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import useCalendar from '../hooks/useCalendar';
import MonthCalendar from './MonthCalendar';
import { fullDate } from '../utils/format';

export default function BookingModal({ caseInfo, appointment, role, onClose, onDone }) {
    const toast = useToast();
    const rescheduling = Boolean(appointment);
    const { month, setMonth, days, loading, error } = useCalendar(
        rescheduling ? { appointment_id: appointment.appointment_id } : { case_id: caseInfo.case_id }
    );
    const [date, setDate] = useState('');
    const [slotId, setSlotId] = useState(null);
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);

    // Close with the Escape key.
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const day = days.find((d) => d.date === date);
    // Clients only see slots they can take or that are already taken; closed hours are hidden.
    const visibleSlots = day ? day.slots.filter((s) => s.state === 'available' || s.state === 'booked') : [];
    const chosen = visibleSlots.find((s) => s.id === slotId);

    const pickDate = (value) => {
        setDate(value);
        setSlotId(null);
    };

    const changeMonth = (value) => {
        setMonth(value);
        pickDate('');
    };

    const submit = async () => {
        setBusy(true);
        try {
            const result = rescheduling
                ? await api.patch(`/appointments/${appointment.appointment_id}/reschedule`, { appointment_date: date, session_slot: slotId })
                : await api.post('/appointments', { case_id: caseInfo.case_id, appointment_date: date, session_slot: slotId, notes });
            toast.success(result.message);
            onDone();
        } catch (err) {
            toast.error(err.message);
            setBusy(false);
        }
    };

    const title = rescheduling ? appointment.case_title : caseInfo.title;
    const otherName = rescheduling ? appointment.other_name : caseInfo.other_name;
    let heading = 'Book an Appointment';
    if (rescheduling) heading = 'Reschedule Appointment';
    else if (role === 'lawyer') heading = 'Schedule an Appointment';

    let buttonText = 'Request Appointment';
    if (rescheduling) buttonText = 'Move Appointment';
    else if (role === 'lawyer') buttonText = 'Schedule & Notify Client';

    return (
        <div className="modal_backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal_box" role="dialog" aria-modal="true" aria-label={heading}>
                <div className="modal_head">
                    <div>
                        <h2>📅 {heading}</h2>
                        <p>
                            {title} · {role === 'client' ? 'Lawyer' : 'Client'}: <strong className="gold">{otherName}</strong>
                        </p>
                    </div>
                    <button type="button" className="modal_close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <div className="calendar_layout">
                    <div>
                        {loading && days.length === 0 ? (
                            <p className="calendar_loading">Loading calendar…</p>
                        ) : (
                            <MonthCalendar month={month} days={days} selected={date} onSelect={pickDate} onMonthChange={changeMonth} />
                        )}
                    </div>

                    <div className="day_panel">
                        {!date && (
                            <>
                                <h4>Pick a date</h4>
                                <p className="hint">Days with a green dot have free time slots.</p>
                            </>
                        )}

                        {date && (
                            <>
                                <h4>{fullDate(date)}</h4>
                                <p className="hint">Choose a free time slot. Booked slots are taken by someone else.</p>
                                <div className="slot_list">
                                    {visibleSlots.length === 0 && <p className="muted">No time slots on this day.</p>}
                                    {visibleSlots.map((slot) =>
                                        slot.state === 'available' ? (
                                            <button type="button" key={slot.id}
                                                className={`slot_chip state_available ${slot.id === slotId ? 'is_chosen' : ''}`}
                                                onClick={() => setSlotId(slot.id)} aria-pressed={slot.id === slotId}>
                                                {slot.label}
                                                <small>{slot.id === slotId ? 'Selected' : 'Available'}</small>
                                            </button>
                                        ) : (
                                            <div key={slot.id} className="slot_chip state_booked" aria-disabled="true">
                                                {slot.label}
                                                <small>🔒 Booked</small>
                                            </div>
                                        )
                                    )}
                                </div>

                                {chosen && (
                                    <div className="booking_confirm">
                                        <p className="booking_summary">
                                            <strong>{fullDate(date)}</strong>, {chosen.label}
                                        </p>
                                        {!rescheduling && (
                                            <div className="form_group">
                                                <label htmlFor="booking_notes">Notes (optional)</label>
                                                <textarea id="booking_notes" value={notes} onChange={(e) => setNotes(e.target.value)}
                                                    placeholder="What would you like to discuss?" />
                                            </div>
                                        )}
                                        <button type="button" className="btn_primary btn_block" onClick={submit} disabled={busy}>
                                            {busy ? 'Saving…' : buttonText}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
