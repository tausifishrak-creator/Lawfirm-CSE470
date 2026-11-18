// /dashboard — shows the client or lawyer dashboard depending on who is logged in.
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useApi from '../hooks/useApi';
import { PageHeader, PageStatus } from '../components/ui';
import { money } from '../utils/format';

function DashCard({ to, icon, title, children }) {
    return (
        <Link to={to} className="dash_card">
            <div className="dash_card_icon">{icon}</div>
            <h3>{title}</h3>
            <p>{children}</p>
        </Link>
    );
}

function ClientDashboard({ user }) {
    return (
        <main>
            <section className="dashboard">
                <PageHeader title={`Welcome, ${user.full_name}!`}>
                    <p className="role_badge client_badge">Client</p>
                </PageHeader>
                <div className="dashboard_grid">
                    <DashCard to="/appointments" icon="📅" title="Appointments">
                        Schedule and manage appointments with your assigned lawyers.
                    </DashCard>
                    <DashCard to="/documents" icon="📂" title="Documents">
                        Upload and view contracts, evidence and court notices for your cases.
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
                            <DashCard to="/schedule" icon="⏰" title="My Schedule">
                                Configure your weekly office hours and availability for appointments.
                            </DashCard>
                            <DashCard to="/appointments" icon="📅" title="Appointments">
                                Accept, reject or reschedule appointment requests from clients.
                            </DashCard>
                            <DashCard to="/documents" icon="📂" title="Documents">
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
