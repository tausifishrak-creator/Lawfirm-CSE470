// Client: find a verified lawyer and choose who to send a case to.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { queryString } from '../api/client';
import useApi from '../hooks/useApi';
import { EmptyState, PageHeader, PageStatus } from '../components/ui';
import { SPECIALIZATIONS } from '../utils/constants';
import { money, renderStars } from '../utils/format';

const FILTERS = ['specialization', 'location', 'min_experience', 'max_fee'];

export default function SearchLawyers() {
    // Filters live in the URL (?specialization=...), like the old GET form.
    const [params, setParams] = useSearchParams();
    const current = Object.fromEntries(FILTERS.map((key) => [key, params.get(key) || '']));
    const [form, setForm] = useState(current);
    const { data, error, loading } = useApi(`/lawyers${queryString(current)}`);

    const hasFilters = FILTERS.some((key) => current[key]);
    const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const submit = (e) => {
        e.preventDefault();
        setParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '')));
    };
    const clear = () => {
        setForm(Object.fromEntries(FILTERS.map((key) => [key, ''])));
        setParams({});
    };

    return (
        <main>
            <section className="dashboard dashboard_section">
                <PageHeader title="Find a Lawyer">
                    <p>Choose a verified lawyer, then submit your case to them. They will accept or decline it.</p>
                </PageHeader>

                <form className="search_form" onSubmit={submit}>
                    <div className="form_group inline_form_group">
                        <select name="specialization" value={form.specialization} onChange={change}>
                            <option value="">All Specializations</option>
                            {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form_group inline_form_group">
                        <input type="text" name="location" placeholder="City or Location..." value={form.location} onChange={change} />
                    </div>
                    <div className="form_group inline_form_group">
                        <input type="number" name="min_experience" placeholder="Min Experience (Yrs)" min="0"
                            value={form.min_experience} onChange={change} />
                    </div>
                    <div className="form_group inline_form_group">
                        <input type="number" name="max_fee" placeholder="Max Fee (৳)" min="0" step="100"
                            value={form.max_fee} onChange={change} />
                    </div>
                    <div className="form_group inline_form_group">
                        <input type="submit" value="Search" className="btn_primary" />
                    </div>
                    {hasFilters && (
                        <button type="button" className="btn_clear" onClick={clear}
                            style={{ marginLeft: 10, color: '#94a3b8', textDecoration: 'underline', fontSize: '0.9rem', alignSelf: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                            Clear
                        </button>
                    )}
                </form>

                <PageStatus error={error} loading={loading && !data} />

                {data && (
                    <div className="dashboard_grid mt_30">
                        {data.lawyers.length === 0 ? (
                            <EmptyState icon="🕵️‍♂️" title="No Lawyers Found" className="empty_wide">
                                We couldn&apos;t find any lawyers matching your exact criteria.
                            </EmptyState>
                        ) : (
                            data.lawyers.map((lawyer) => (
                                <div className="dash_card lawyer_card" key={lawyer.lawyer_id}>
                                    <div className="card_header">
                                        <h3>{lawyer.full_name}</h3>
                                        <span className="verified_badge small_badge">✅ Verified</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 10px' }}>
                                        {Number(lawyer.total_reviews) > 0 ? (
                                            <>
                                                <span style={{ color: '#eab308', fontSize: '1rem', letterSpacing: '1px' }}>
                                                    {renderStars(lawyer.avg_rating)}
                                                </span>
                                                <strong style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>
                                                    {Number(lawyer.avg_rating).toFixed(1)}
                                                </strong>
                                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                                    ({lawyer.total_reviews} {Number(lawyer.total_reviews) === 1 ? 'review' : 'reviews'})
                                                </span>
                                            </>
                                        ) : (
                                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>⭐ No reviews yet</span>
                                        )}
                                    </div>
                                    <div className="card_details">
                                        <p><strong>Specialization:</strong> {lawyer.specialization}</p>
                                        <p><strong>Location:</strong> {lawyer.location}</p>
                                        <p><strong>Experience:</strong> {lawyer.experience_years} years</p>
                                        <p><strong>Fee:</strong> {money(lawyer.consultation_fee)}</p>
                                        <p>
                                            <strong>Working Days:</strong>{' '}
                                            <span className="working_days">
                                                {lawyer.working_days.length
                                                    ? `${lawyer.working_days.map((d) => d.slice(0, 3)).join(', ')} (8:00 AM - 6:20 PM)`
                                                    : 'Schedule not configured'}
                                            </span>
                                        </p>
                                    </div>
                                    {lawyer.bio && <p className="lawyer_bio">&quot;{lawyer.bio}&quot;</p>}
                                    <div className="card_action" style={{ marginTop: 20 }}>
                                        <Link to={`/lawyers/${lawyer.lawyer_id}/request`} className="btn_primary" style={{ display: 'block', textAlign: 'center' }}>
                                            Submit a Case
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </section>
        </main>
    );
}
