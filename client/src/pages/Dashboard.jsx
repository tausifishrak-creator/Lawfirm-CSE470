// /dashboard — shows the client or lawyer dashboard depending on who is logged in.
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useApi from '../hooks/useApi';
import { PageHeader, PageStatus } from '../components/ui';
import { money } from '../utils/format';

/** Dashboard card; `badge` shows a red count (e.g. unread updates or pending requests). */
function DashCard({ to, icon, title, badge, children }) {
    return (
        <Link to={to} className="dash_card">
            <div className="dash_card_icon">{icon}</div>
            <h3>
                {title}
                {badge > 0 && <span className="card_badge">{badge}</span>}
            </h3>
            <p>{children}</p>
        </Link>
    );
}

function ClientDashboard({ user }) {
    const { data } = useApi('/dashboard/client');
    const badges = (data && data.badges) || {};
    return (
        <main>
            <section className="dashboard">
                <PageHeader title={`Welcome, ${user.full_name}!`}>
                    <p className="role_badge client_badge">Client</p>
                </PageHeader>
                <div className="dashboard_grid">
                    <DashCard to="/lawyers" icon="🔍" title="Find a Lawyer">
                        Choose a verified lawyer and submit your case to them.
                    </DashCard>
                    <DashCard to="/cases" icon="📋" title="My Cases" badge={badges.cases}>
                        Track your case requests and see when a lawyer accepts them.
                    </DashCard>
                    <DashCard to="/appointments" icon="📅" title="Appointments" badge={badges.appointments}>
                        Book a time on your lawyer&apos;s calendar and see your appointments.
                    </DashCard>
                    <DashCard to="/documents" icon="📂" title="Documents" badge={badges.documents}>
                        Upload and view contracts & agreements between plaintiff and defendant, evidence and court notices for your cases.
                    </DashCard>
                </div>
            </section>
        </main>
    );
}

function LawyerDashboard({ user }) {
    const { data, error, loading } = useApi('/dashboard/lawyer');

    return (
        <main>
            <section className="dashboard">
                <PageHeader title={`Welcome, ${user.full_name}!`}>
                    <p className="role_badge lawyer_badge">Lawyer</p>
                    {data && (data.profile.is_verified
                        ? <span className="verified_badge">✅ Verified</span>
                        : <span className="pending_badge">⏳ {data.profile.verification_status === 'Rejected' ? 'Verification Rejected' : 'Pending Verification'}</span>)}
                </PageHeader>
                <PageStatus error={error} loading={loading} />

                {data && (
                    <>
                        <div className="profile_summary">
                            <div className="profile_item"><strong>Specialization</strong><span>{data.profile.specialization}</span></div>
                            <div className="profile_item"><strong>Location</strong><span>{data.profile.location}</span></div>
                            <div className="profile_item"><strong>Experience</strong><span>{data.profile.experience_years} years</span></div>
                            <div className="profile_item"><strong>Consultation Fee</strong><span>{money(data.profile.consultation_fee)}</span></div>
                        </div>

                        <div className="dashboard_grid">
                            <DashCard to="/cases?tab=pending" icon="📥" title="Pending Approval" badge={data.pendingCount}>
                                Accept or decline new case requests from clients.
                            </DashCard>
                            <DashCard to="/cases" icon="📋" title="My Cases" badge={data.badges.cases}>
                                Update the status of the cases you have accepted.
                            </DashCard>
                            <DashCard to="/schedule" icon="⏰" title="My Schedule">
                                Set your weekly hours and open or close time slots on the calendar.
                            </DashCard>
                            <DashCard to="/appointments" icon="📅" title="Appointments" badge={data.badges.appointments}>
                                Accept, reject or reschedule requests, or set appointments with your clients.
                            </DashCard>
                            <DashCard to="/documents" icon="📂" title="Documents" badge={data.badges.documents}>
                                Upload and manage documents for your cases.
                            </DashCard>

                            <DashCard to="/tasks" icon="✅" title="Case Tasks">
                                Create tasks, track deadlines, and monitor overdue work.
                            </DashCard>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return user.role === 'lawyer' ? <LawyerDashboard user={user} /> : <ClientDashboard user={user} />;
}
