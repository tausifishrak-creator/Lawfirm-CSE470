// /appointments — book through the calendar, and see/manage appointments (client and lawyer).
import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useApi from '../hooks/useApi';
import BookingModal from '../components/BookingModal';
import { PageHeader, PageStatus, StatusBadge } from '../components/ui';
import { clockTime, shortDate } from '../utils/format';

/** One row per open case, each with a Schedule button that opens the calendar. */
function ScheduleSection({ cases, isLawyer, onSchedule }) {
    return (
        <div className="dashboard_section">
            <h2>{isLawyer ? 'Schedule with a Client' : 'Book an Appointment'}</h2>
            <p className="subtitle" style={{ marginBottom: 16 }}>
                {isLawyer
                    ? 'Pick a case to open your calendar and set an appointment. The client is notified automatically.'
                    : 'Pick a case to see when your lawyer is free and book a time slot.'}
            </p>
            <div className="table_container">
                <table className="data_table">
                    <thead>
                        <tr>
                            <th>Case</th>
                            <th>{isLawyer ? 'Client' : 'Lawyer'}</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cases.map((c) => (
                            <tr key={c.case_id}>
                                <td style={{ fontWeight: 500 }}>{c.title}</td>
                                <td>{c.other_name}</td>
                                <td>
                                    <button type="button" className="btn_approve btn_receipt" onClick={() => onSchedule(c)}>
                                        📅 Schedule
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function Appointments() {
    const { user } = useAuth();
    const toast = useToast();
    const { data, error, loading, reload } = useApi('/appointments');
    const [booking, setBooking] = useState(null);        // case being booked
    const [rescheduling, setRescheduling] = useState(null); // appointment being moved
    const isLawyer = user.role === 'lawyer';

    const update = async (appointment, action, question) => {
        if (!window.confirm(question)) return;
        try {
            const result = await api.patch(`/appointments/${appointment.appointment_id}`, { action });
            action === 'reject' ? toast.error(result.message) : toast.success(result.message);
            reload();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const closeModal = () => {
        setBooking(null);
        setRescheduling(null);
    };
    const afterSave = () => {
        closeModal();
        reload();
    };

    return (
        <main>
            <section className="dashboard">
                <PageHeader title="📅 Appointments" />
                <PageStatus error={error} loading={loading && !data} />

                {data && data.bookableCases.length > 0 && (
                    <ScheduleSection cases={data.bookableCases} isLawyer={isLawyer} onSchedule={setBooking} />
                )}

                {data && (
                    <div className="dashboard_section">
                        <h2>{isLawyer ? 'Appointment Requests & Schedule' : 'My Appointments'}</h2>
                        <div className="table_container">
                            <table className="data_table">
                                <thead>
                                    <tr>
                                        <th>Case</th>
                                        <th>{isLawyer ? 'Client' : 'Lawyer'}</th>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Status</th>
                                        {isLawyer && <th>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.appointments.length === 0 ? (
                                        <tr><td colSpan={isLawyer ? 6 : 5} className="text-center">No appointments yet.</td></tr>
                                    ) : (
                                        data.appointments.map((a) => {
                                            const open = ['Pending', 'Confirmed'].includes(a.status);
                                            return (
                                                <tr key={a.appointment_id}>
                                                    <td>{a.case_title}</td>
                                                    <td>{a.other_name}</td>
                                                    <td>{shortDate(a.appointment_date)}</td>
                                                    <td>{clockTime(a.appointment_time)}</td>
                                                    <td><StatusBadge status={a.status} /></td>
                                                    {isLawyer && (
                                                        <td className="action_cell">
                                                            {a.status === 'Pending' && (
                                                                <>
                                                                    <button type="button" className="btn_approve"
                                                                        onClick={() => update(a, 'accept', 'Accept this appointment?')}>Accept</button>
                                                                    <button type="button" className="btn_reject"
                                                                        onClick={() => update(a, 'reject', 'Reject this appointment?')}>Reject</button>
                                                                </>
                                                            )}
                                                            {a.status === 'Confirmed' && (
                                                                <button type="button" className="btn_approve"
                                                                    onClick={() => update(a, 'complete', 'Mark as completed?')}>Complete</button>
                                                            )}
                                                            {open && (
                                                                <button type="button" className="btn_approve btn_receipt"
                                                                    onClick={() => setRescheduling(a)}>Reschedule</button>
                                                            )}
                                                            {!open && <span className="dim">—</span>}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            {booking && <BookingModal caseInfo={booking} role={user.role} onClose={closeModal} onDone={afterSave} />}
            {rescheduling && <BookingModal appointment={rescheduling} role={user.role} onClose={closeModal} onDone={afterSave} />}
        </main>
    );
}
