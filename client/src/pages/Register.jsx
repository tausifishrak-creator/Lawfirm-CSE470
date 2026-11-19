// Registration page for clients and lawyers.
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SPECIALIZATIONS } from '../utils/constants';

const EMPTY = {
    full_name: '', email: '', username: '', password: '', confirm_password: '', role: 'client',
    phone: '', address: '',
    specialization: SPECIALIZATIONS[0], location: '', experience_years: '', consultation_fee: '', bio: '',
};

export default function Register() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState(EMPTY);
    const [file, setFile] = useState(null);
    const [errors, setErrors] = useState([]);
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to="/dashboard" replace />;

    const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const isLawyer = form.role === 'lawyer';

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors([]);

        // FormData so the lawyer's document can be uploaded with the other fields.
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));
        if (isLawyer && file) data.append('verification_doc', file);

        try {
            const result = await api.post('/auth/register', data);
            navigate('/login', { state: { notice: result.message } });
        } catch (err) {
            setErrors(err.message.split(/(?<=\.)\s+/));
            setBusy(false);
        }
    };

    return (
        <main>
            <section className="login">
                <div className="login_box register_box">
                    <div className="login_header">
                        <h1>Create Account</h1>
                        <p>Join our legal services platform</p>
                    </div>

                    {errors.length > 0 && (
                        <div className="alert alert-error">
                            {errors.map((msg) => <p key={msg}>{msg}</p>)}
                        </div>
                    )}

                    <form className="login_form" onSubmit={submit}>
                        <div className="form_group">
                            <label htmlFor="full_name">Full Name</label>
                            <input id="full_name" name="full_name" type="text" placeholder="Enter your full name"
                                value={form.full_name} onChange={change} required />
                        </div>
                        <div className="form_group">
                            <label htmlFor="email">Email</label>
                            <input id="email" name="email" type="email" placeholder="Enter your email"
                                value={form.email} onChange={change} required />
                        </div>
                        <div className="form_group">
                            <label htmlFor="reg_username">Username</label>
                            <input id="reg_username" name="username" type="text" placeholder="Choose a username"
                                value={form.username} onChange={change} required />
                        </div>
                        <div className="form_group">
                            <label htmlFor="reg_password">Password</label>
                            <input id="reg_password" name="password" type="password" placeholder="At least 6 characters"
                                value={form.password} onChange={change} minLength={6} required />
                        </div>
                        <div className="form_group">
                            <label htmlFor="confirm_password">Confirm Password</label>
                            <input id="confirm_password" name="confirm_password" type="password" placeholder="Repeat your password"
                                value={form.confirm_password} onChange={change} required />
                        </div>
                        <div className="form_group">
                            <label htmlFor="reg_role">Register as</label>
                            <select id="reg_role" name="role" value={form.role} onChange={change}>
                                <option value="client">Client</option>
                                <option value="lawyer">Lawyer</option>
                            </select>
                        </div>

                        {!isLawyer && (
                            <div className="role_fields">
                                <div className="form_group">
                                    <label htmlFor="phone">Phone Number</label>
                                    <input id="phone" name="phone" type="text" placeholder="e.g. 01711111111"
                                        value={form.phone} onChange={change} />
                                </div>
                                <div className="form_group">
                                    <label htmlFor="address">Address</label>
                                    <input id="address" name="address" type="text" placeholder="Your city / area"
                                        value={form.address} onChange={change} />
                                </div>
                            </div>
                        )}

                        {isLawyer && (
                            <div className="role_fields">
                                <div className="form_group">
                                    <label htmlFor="specialization">Specialization</label>
                                    <select id="specialization" name="specialization" value={form.specialization} onChange={change}>
                                        {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form_group">
                                    <label htmlFor="location">Location</label>
                                    <input id="location" name="location" type="text" placeholder="e.g. Dhaka"
                                        value={form.location} onChange={change} required />
                                </div>
                                <div className="form_group">
                                    <label htmlFor="experience_years">Years of Experience</label>
                                    <input id="experience_years" name="experience_years" type="number" min="0" max="50" placeholder="e.g. 5"
                                        value={form.experience_years} onChange={change} required />
                                </div>
                                <div className="form_group">
                                    <label htmlFor="consultation_fee">Consultation Fee (BDT)</label>
                                    <input id="consultation_fee" name="consultation_fee" type="number" min="0" step="1000" placeholder="e.g. 3000"
                                        value={form.consultation_fee} onChange={change} required />
                                </div>
                                <div className="form_group">
                                    <label htmlFor="bio">Short Bio</label>
                                    <textarea id="bio" name="bio" rows="3" placeholder="Tell clients about your expertise..."
                                        value={form.bio} onChange={change} />
                                </div>
                                <div className="form_group">
                                    <label htmlFor="verification_doc">ID / Certificate Verification Document</label>
                                    <input id="verification_doc" type="file" accept=".pdf,.jpg,.jpeg,.png" className="file_input"
                                        onChange={(e) => setFile(e.target.files[0] || null)} required />
                                    <small className="hint">Required. Admin must verify your document before clients can find you.</small>
                                </div>
                            </div>
                        )}

                        <input type="submit" value={busy ? 'Creating account…' : 'Create Account'} disabled={busy} />
                    </form>
                    <p className="form_footer">Already have an account? <Link to="/login">Sign in</Link></p>
                </div>
            </section>
        </main>
    );
}
