// Login page.
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;

    const notice = location.state && location.state.notice;
    const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const loggedIn = await login(form.username, form.password);
            const from = location.state && location.state.from;
            navigate(from || (loggedIn.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    };

    return (
        <main>
            <section className="login">
                <div className="login_box">
                    <div className="login_header">
                        <h1>Welcome Back</h1>
                        <p>Sign in to access your account</p>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}
                    {!error && notice && <div className="alert alert-success">{notice}</div>}

                    <form className="login_form" onSubmit={submit}>
                        <div className="form_group">
                            <label htmlFor="username">Username</label>
                            <input id="username" name="username" type="text" placeholder="Enter your username"
                                value={form.username} onChange={change} required />
                        </div>
                        <div className="form_group">
                            <label htmlFor="password">Password</label>
                            <input id="password" name="password" type="password" placeholder="Enter your password"
                                value={form.password} onChange={change} required />
                        </div>
                        
                        <input type="submit" value={busy ? 'Signing in…' : 'Sign In'} disabled={busy} />
                    </form>
                    <p className="form_footer">Don&apos;t have an account? <Link to="/register">Register here</Link></p>
                </div>
            </section>
        </main>
    );
}
