// Client: submit a case to the chosen lawyer. The lawyer is notified and accepts or declines it.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import useApi from '../hooks/useApi';
import { PageStatus } from '../components/ui';
import { CASE_CATEGORIES } from '../utils/constants';
import { money } from '../utils/format';

export default function RequestCase() {
    const { lawyerId } = useParams();
    const { data, error, loading } = useApi(`/lawyers/${lawyerId}`);
    const [form, setForm] = useState({ title: '', case_type: '', description: '' });
    const [submitError, setSubmitError] = useState('');
    const [success, setSuccess] = useState('');
    const [busy, setBusy] = useState(false);

    const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setSubmitError('');
        try {
            const result = await api.post('/cases', { ...form, lawyer_id: Number(lawyerId) });
            setSuccess(result.message);
        } catch (err) {
            setSubmitError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const lawyer = data && data.lawyer;

    return (
        <main>
            <section className="login">
                <div className="login_box" style={{ maxWidth: 600 }}>
                    <PageStatus error={error} loading={loading} />
                    {lawyer && (
                        <>
                            <div className="login_header">
                                <h1>Submit a Case</h1>
                                <p>Sending your case to <strong>{lawyer.full_name}</strong> ({lawyer.specialization})</p>
                            </div>

                            {submitError && <div className="alert alert-error">{submitError}</div>}

                            {success ? (
                                <>
                                    <div className="alert alert-success">{success}</div>
                                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                                        <Link to="/cases" className="btn_primary">Go to My Cases</Link>
                                    </div>
                                </>
                            ) : (
                                <form className="login_form" onSubmit={submit}>
                                    <div className="form_group">
                                        <label htmlFor="title">Case Title (Brief Subject)</label>
                                        <input id="title" name="title" type="text" placeholder="e.g., Property Dispute in Gulshan"
                                            value={form.title} onChange={change} required />
                                    </div>
                                    <div className="form_group">
                                        <label htmlFor="case_type">Case Category</label>
                                        <select id="case_type" name="case_type" value={form.case_type} onChange={change} required>
                                            <option value="">Select Category...</option>
                                            {CASE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="form_group">
                                        <label htmlFor="description">Detailed Description</label>
                                        <textarea id="description" name="description"
                                            placeholder="Describe your legal issue, timeline, and what kind of help you need..."
                                            value={form.description} onChange={change} required />
                                    </div>
                                    <div className="info_box">
                                        ℹ️ {lawyer.full_name} will get a notification and can accept or decline your case. You&apos;ll be
                                        notified of their answer. Once accepted, you can share documents and book appointments.
                                        Consultation fee: {money(lawyer.consultation_fee)}.
                                    </div>
                                    <input type="submit" value={busy ? 'Sending…' : 'Send Case to Lawyer'} disabled={busy} />
                                </form>
                            )}
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}
