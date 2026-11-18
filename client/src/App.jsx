// All frontend routes. Each page component lives in src/pages.
import { Link, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import CaseTasks from './pages/CaseTasks';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import DocumentCases from './pages/DocumentCases';
import Documents from './pages/Documents';
import Appointments from './pages/Appointments';
import Schedule from './pages/Schedule';

function NotFound() {
    return (
        <main>
            <div className="empty_state">
                <div className="empty_state_icon">🧭</div>
                <h3>Page not found</h3>
                <p><Link to="/" className="gold">Go to the home page</Link></p>
            </div>
        </main>
    );
}

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Client and lawyer */}
                <Route element={<ProtectedRoute roles={['client', 'lawyer']} />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/documents" element={<DocumentCases />} />
                    <Route path="/cases/:caseId/documents" element={<Documents />} />
                    <Route path="/appointments" element={<Appointments />} />
                </Route>

                {/* Lawyer only */}
                <Route element={<ProtectedRoute roles={['lawyer']} />}>
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/tasks" element={<CaseTasks />} />
                </Route>

                {/* Admin only */}
                <Route element={<ProtectedRoute roles={['admin']} />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                </Route>

                <Route path="*" element={<NotFound />} />
            </Route>
        </Routes>
    );
}
