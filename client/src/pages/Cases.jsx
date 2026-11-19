// /cases
//   client: every case they submitted, with Documents and Schedule buttons once a lawyer accepts it
//   lawyer: "Pending Approval" tab (accept / decline requests) and "My Cases" tab (status, documents, schedule)
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useApi from '../hooks/useApi';
import BookingModal from '../components/BookingModal';
import { EmptyState, PageHeader, PageStatus, StatusBadge } from '../components/ui';
import { shortDate } from '../utils/format';

const BOOKABLE = ['Accepted', 'In Progress'];
const COMPLETED = ['Closed', 'Won', 'Lost'];

function CaseActions({ item, onSchedule, isClient }) {
    return (
        <span className="nowrap" style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap' }}>
            <Link to={`/messages?caseId=${item.case_id}`} className="btn_approve" style={{ background: '#3b82f6', color: '#fff' }}>
                💬 Message
            </Link>
            <Link to={`/cases/${item.case_id}/documents`} className="btn_approve btn_save">📂 Documents</Link>
            {BOOKABLE.includes(item.status) && (
                <button type="button" className="btn_approve btn_receipt" onClick={() => onSchedule(item)}>
                    📅 Schedule
                </button>
            )}
            {isClient && COMPLETED.includes(item.status) && (
                <Link to={`/reviews?caseId=${item.case_id}`} className="btn_approve" style={{ background: '#eab308', color: '#0f172a', fontWeight: 'bold' }}>
                    ⭐ Review
                </Link>
            )}
        </span>
    );
}

/* ---------------- Client ---------------- */

function ClientCases({ data, onSchedule }) {
    return (
        <>
            <div className="text_right" style={{ marginBottom: 16 }}>
                <Link to="/lawyers" className="btn_primary">+ Submit a New Case</Link>
            </div>
            {data.cases.length === 0 ? (
                <EmptyState icon="📋" title="No cases yet">
                    Find a lawyer and submit your first case. You&apos;ll be notified when they respond.
                </EmptyState>
            ) : (
                <div className="table_container">
                    <table className="data_table">
                        <thead>
                            <tr>
                                <th>Case</th>
                                <th>Category</th>
                                <th>Lawyer</th>
                                <th>Submitted</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.cases.map((c) => (
                                <tr key={c.case_id}>
                                    <td style={{ fontWeight: 500 }}>{c.title}</td>
                                    <td>{c.case_type}</td>
                                    <td>{c.other_name}</td>
                                    <td>{shortDate(c.created_at)}</td>
                                    <td><StatusBadge status={c.status} /></td>
                                    <td>
                                        {c.status === 'Pending' && <span className="dim">Waiting for the lawyer</span>}
                                        {c.status === 'Rejected' && <span className="dim">Declined by the lawyer</span>}
                                        {!['Pending', 'Rejected'].includes(c.status) && <CaseActions item={c} onSchedule={onSchedule} isClient={true} />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}

/* ---------------- Lawyer ---------------- */

function PendingRequests({ data, reload }) {
    const toast = useToast();
    const [busyId, setBusyId] = useState(null);

    const respond = async (item, action) => {
        const question = action === 'accept'
            ? `Accept "${item.title}" from ${item.other_name}?`
            : `Decline "${item.title}" from ${item.other_name}? This cannot be undone.`;
        if (!window.confirm(question)) return;
        setBusyId(item.case_id);
        try {
            const result = await api.patch(`/cases/${item.case_id}/respond`, { action });
            action === 'accept' ? toast.success(result.message) : toast.error(result.message);
            reload();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    };

    if (data.pending.length === 0) {
        return <EmptyState icon="📭" title="No pending requests">New case requests from clients will appear here.</EmptyState>;
    }

    return (
        <>
            {!data.isVerified && (
                <div className="alert alert-error">Your account must be verified by an admin before you can accept cases.</div>
            )}
            <div className="dashboard_grid">
                {data.pending.map((c) => (
                    <div className="dash_card pending_card request_card" key={c.case_id}>
                        <div className="card_header">
                            <h3>{c.title}</h3>
                            <span className="status_Pending">Pending</span>
                        </div>
                        <div className="card_details">
                            <p><strong>Client:</strong> {c.other_name}</p>
                            <p><strong>Category:</strong> {c.case_type}</p>
                            <p><strong>Submitted:</strong> {shortDate(c.created_at)}</p>
                        </div>
                        <p className="case_description">{c.description}</p>
                        <div className="request_actions">
                            <button type="button" className="btn_primary" disabled={busyId === c.case_id || !data.isVerified}
                                onClick={() => respond(c, 'accept')}>Accept</button>
                            <button type="button" className="btn_primary btn_gray" disabled={busyId === c.case_id}
                                onClick={() => respond(c, 'decline')}>Decline</button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

function StatusForm({ item, statuses, onSave }) {
    const [status, setStatus] = useState(item.status);
    return (
        <form className="status_form" onSubmit={(e) => { e.preventDefault(); onSave(item, status); }}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={`Status of ${item.title}`}>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" disabled={status === item.status}>Update</button>
        </form>
    );
}

function LawyerCaseTable({ data, reload, onSchedule }) {
    const toast = useToast();

    const saveStatus = async (item, status) => {
        try {
            const result = await api.patch(`/cases/${item.case_id}/status`, { status });
            toast.success(result.message);
            reload();
        } catch (err) {
            toast.error(err.message);
        }
    };

    if (data.cases.length === 0) {
        return <EmptyState icon="📂" title="No cases yet">Cases you accept will appear here.</EmptyState>;
    }

    return (
        <div className="table_container">
            <table className="data_table">
                <thead>
                    <tr>
                        <th>Case</th>
                        <th>Client</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Update Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data.cases.map((c) => (
                        <tr key={c.case_id}>
                            <td style={{ fontWeight: 500 }}>{c.title}</td>
                            <td>{c.other_name}</td>
                            <td>{c.case_type}</td>
                            <td><StatusBadge status={c.status} /></td>
                            <td><StatusForm key={c.status} item={c} statuses={data.statuses} onSave={saveStatus} /></td>
                            <td><CaseActions item={c} onSchedule={onSchedule} isClient={false} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ---------------- Page ---------------- */

export default function Cases() {
    const { user } = useAuth();
    const { data, error, loading, reload } = useApi('/cases');
    const [params, setParams] = useSearchParams();
    const [booking, setBooking] = useState(null);
    const isLawyer = user.role === 'lawyer';
    const tab = params.get('tab') === 'pending' ? 'pending' : 'cases';

    return (
        <main>
            <section className="dashboard dashboard_section">
                <PageHeader title={isLawyer ? '📋 Cases' : '📋 My Cases'}>
                    <p>{isLawyer ? 'Answer new case requests and manage the cases you have accepted.' : 'Track the cases you have sent to lawyers.'}</p>
                </PageHeader>
                <PageStatus error={error} loading={loading && !data} />

                {data && isLawyer && (
                    <>
                        <div className="tab_bar" role="tablist">
                            <button type="button" role="tab" aria-selected={tab === 'pending'}
                                className={`tab_button ${tab === 'pending' ? 'active' : ''}`}
                                onClick={() => setParams({ tab: 'pending' })}>
                                Pending Approval
                                {data.pending.length > 0 && <span className="card_badge">{data.pending.length}</span>}
                            </button>
                            <button type="button" role="tab" aria-selected={tab === 'cases'}
                                className={`tab_button ${tab === 'cases' ? 'active' : ''}`}
                                onClick={() => setParams({})}>
                                My Cases
                            </button>
                        </div>
                        {tab === 'pending'
                            ? <PendingRequests data={data} reload={reload} />
                            : <LawyerCaseTable data={data} reload={reload} onSchedule={setBooking} />}
                    </>
                )}

                {data && !isLawyer && <ClientCases data={data} onSchedule={setBooking} />}
            </section>

            {booking && (
                <BookingModal
                    caseInfo={booking}
                    role={user.role}
                    onClose={() => setBooking(null)}
                    onDone={() => setBooking(null)}
                />
            )}
        </main>
    );
}
