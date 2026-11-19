// /reviews — Lawyer Rating and Review System
// Client: submit ratings & reviews for completed cases (Closed, Won, Lost), view submitted review history
// Lawyer: view overall rating average, breakdown, and feedback left by clients
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useApi from '../hooks/useApi';
import { EmptyState, PageHeader, PageStatus, StatusBadge } from '../components/ui';
import { shortDate, dateTime, renderStars } from '../utils/format';

/* ---------------- Client Review Form Component ---------------- */
function StarSelector({ value, onChange }) {
    const [hover, setHover] = useState(0);

    return (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.8rem',
                        color: (hover || value) >= star ? '#eab308' : '#475569',
                        padding: '2px',
                        transition: 'color 0.15s, transform 0.15s',
                        transform: (hover || value) >= star ? 'scale(1.15)' : 'scale(1)',
                    }}
                    title={`${star} Star${star > 1 ? 's' : ''}`}
                >
                    ★
                </button>
            ))}
            <span style={{ marginLeft: '10px', fontSize: '0.95rem', color: '#94a3b8' }}>
                {value ? `${value} of 5 Stars` : 'Select a rating'}
            </span>
        </div>
    );
}

function ReviewSubmissionForm({ caseItem, onSubmitted }) {
    const toast = useToast();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rating) {
            toast.error('Please select a star rating (1-5).');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('/reviews', {
                caseId: caseItem.case_id,
                rating,
                comment,
            });
            toast.success(res.message || 'Review submitted successfully!');
            onSubmitted();
        } catch (err) {
            toast.error(err.message || 'Failed to submit review.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', marginTop: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                    Your Rating:
                </label>
                <StarSelector value={rating} onChange={setRating} />
            </div>

            <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                    Feedback & Comments (optional):
                </label>
                <textarea
                    rows="3"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe your experience with this lawyer..."
                    style={{ width: '100%', background: '#fff', color: '#0f172a', borderRadius: '6px', padding: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn_primary" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
            </div>
        </form>
    );
}

/* ---------------- Client View ---------------- */
function ClientReviewsView({ data, reload }) {
    const [params] = useSearchParams();
    const highlightCaseId = params.get('caseId') ? Number(params.get('caseId')) : null;
    const [openFormCaseId, setOpenFormCaseId] = useState(highlightCaseId);

    const reviewableCases = data.reviewableCases || [];
    const myReviews = data.myReviews || [];

    const unreviewedCases = reviewableCases.filter((c) => !c.review_id);
    const reviewedCases = reviewableCases.filter((c) => c.review_id);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Eligible Completed Cases */}
            <div>
                <h2 style={{ fontSize: '1.25rem', color: '#f1f5f9', marginBottom: '12px' }}>
                    ⚖️ Completed Cases Eligible for Review
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>
                    Under our platform rules, you may submit <strong>1 review per completed case</strong> (Closed, Won, or Lost).
                </p>

                {unreviewedCases.length === 0 ? (
                    <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center', color: '#94a3b8' }}>
                        {reviewedCases.length > 0
                            ? '✅ You have reviewed all of your completed cases!'
                            : 'No completed cases to review yet. Once a lawyer completes your case (Closed, Won, or Lost), you can rate and review them here.'}
                    </div>
                ) : (
                    <div className="dashboard_grid">
                        {unreviewedCases.map((c) => {
                            const isFormOpen = openFormCaseId === c.case_id;
                            return (
                                <div key={c.case_id} className="dash_card" style={{ borderColor: isFormOpen ? '#d4a843' : undefined }}>
                                    <div className="card_header">
                                        <h3>{c.title}</h3>
                                        <StatusBadge status={c.status} />
                                    </div>
                                    <div className="card_details">
                                        <p><strong>Lawyer:</strong> {c.lawyer_name}</p>
                                        <p><strong>Category:</strong> {c.case_type}</p>
                                        <p><strong>Completed On:</strong> {shortDate(c.updated_at)}</p>
                                    </div>

                                    {!isFormOpen ? (
                                        <div style={{ marginTop: '16px' }}>
                                            <button
                                                type="button"
                                                className="btn_primary"
                                                style={{ width: '100%' }}
                                                onClick={() => setOpenFormCaseId(c.case_id)}
                                            >
                                                ⭐ Rate Lawyer
                                            </button>
                                        </div>
                                    ) : (
                                        <ReviewSubmissionForm
                                            caseItem={c}
                                            onSubmitted={() => {
                                                setOpenFormCaseId(null);
                                                reload();
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Client Reviews History */}
            <div>
                <h2 style={{ fontSize: '1.25rem', color: '#f1f5f9', marginBottom: '16px' }}>
                    📜 Your Submitted Reviews ({myReviews.length})
                </h2>

                {myReviews.length === 0 ? (
                    <EmptyState icon="⭐" title="No reviews submitted yet">
                        Share your feedback on your lawyer after your case is marked as completed.
                    </EmptyState>
                ) : (
                    <div className="review_list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {myReviews.map((r) => (
                            <div key={r.review_id} className="review_card">
                                <div className="review_header">
                                    <div>
                                        <strong>{r.lawyer_name}</strong>
                                        <span className="review_case" style={{ marginLeft: '12px' }}>
                                            Case: <em>{r.case_title}</em>
                                        </span>
                                    </div>
                                    <div style={{ color: '#eab308', fontSize: '1.1rem', letterSpacing: '2px' }}>
                                        {renderStars(r.rating)}
                                        <span style={{ fontSize: '0.85rem', color: '#cbd5e1', marginLeft: '6px' }}>
                                            ({r.rating}/5)
                                        </span>
                                    </div>
                                </div>
                                {r.comment && (
                                    <p className="review_comment" style={{ marginTop: '8px', color: '#e2e8f0', fontStyle: 'italic' }}>
                                        &quot;{r.comment}&quot;
                                    </p>
                                )}
                                <div className="review_date" style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                                    Submitted on {dateTime(r.created_at)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ---------------- Lawyer View ---------------- */
function RatingBar({ star, count, total }) {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', marginBottom: '6px' }}>
            <span style={{ width: '40px', color: '#eab308' }}>{star} ★</span>
            <div style={{ flex: 1, height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${percentage}%`, height: '100%', background: '#eab308', borderRadius: '4px' }} />
            </div>
            <span style={{ width: '45px', textAlign: 'right', color: '#94a3b8' }}>
                {count} ({percentage}%)
            </span>
        </div>
    );
}

function LawyerReviewsView({ data }) {
    const summary = data.summary || { total_reviews: 0, avg_rating: 0 };
    const reviews = data.reviews || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Lawyer rating breakdown card */}
            <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '24px' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#f1f5f9', marginBottom: '16px' }}>
                    📊 Client Rating Summary
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 2fr', gap: '24px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#eab308', lineHeight: 1 }}>
                            {summary.avg_rating > 0 ? summary.avg_rating.toFixed(1) : '0.0'}
                        </div>
                        <div style={{ color: '#eab308', fontSize: '1.4rem', margin: '8px 0', letterSpacing: '2px' }}>
                            {renderStars(summary.avg_rating)}
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                            Based on {summary.total_reviews} client {summary.total_reviews === 1 ? 'review' : 'reviews'}
                        </p>
                    </div>

                    <div>
                        <RatingBar star={5} count={summary.stars_5 || 0} total={summary.total_reviews} />
                        <RatingBar star={4} count={summary.stars_4 || 0} total={summary.total_reviews} />
                        <RatingBar star={3} count={summary.stars_3 || 0} total={summary.total_reviews} />
                        <RatingBar star={2} count={summary.stars_2 || 0} total={summary.total_reviews} />
                        <RatingBar star={1} count={summary.stars_1 || 0} total={summary.total_reviews} />
                    </div>
                </div>
            </div>

            {/* List of client reviews */}
            <div>
                <h2 style={{ fontSize: '1.25rem', color: '#f1f5f9', marginBottom: '16px' }}>
                    💬 Client Feedback & Written Reviews ({reviews.length})
                </h2>

                {reviews.length === 0 ? (
                    <EmptyState icon="⭐" title="No reviews received yet">
                        Client ratings and written reviews will appear here once cases are completed.
                    </EmptyState>
                ) : (
                    <div className="review_list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {reviews.map((r) => (
                            <div key={r.review_id} className="review_card">
                                <div className="review_header">
                                    <div>
                                        <strong>{r.client_name}</strong>
                                        <span className="review_case" style={{ marginLeft: '12px' }}>
                                            Case: <em>{r.case_title}</em>
                                        </span>
                                    </div>
                                    <div style={{ color: '#eab308', fontSize: '1.1rem', letterSpacing: '2px' }}>
                                        {renderStars(r.rating)}
                                        <span style={{ fontSize: '0.85rem', color: '#cbd5e1', marginLeft: '6px' }}>
                                            ({r.rating}/5)
                                        </span>
                                    </div>
                                </div>
                                {r.comment && (
                                    <p className="review_comment" style={{ marginTop: '8px', color: '#e2e8f0', fontStyle: 'italic' }}>
                                        &quot;{r.comment}&quot;
                                    </p>
                                )}
                                <div className="review_date" style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                                    Received on {dateTime(r.created_at)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ---------------- Main Page Component ---------------- */
export default function Reviews() {
    const { user } = useAuth();
    const { data, error, loading, reload } = useApi('/reviews');

    return (
        <main>
            <section className="dashboard dashboard_section">
                <PageHeader title="⭐ Ratings & Reviews">
                    <p>
                        {user.role === 'client'
                            ? 'Rate and review lawyers for your completed legal cases to help other clients make informed decisions.'
                            : 'Monitor your client satisfaction ratings and review feedback from completed cases.'}
                    </p>
                </PageHeader>

                <PageStatus error={error} loading={loading && !data} />

                {data && user.role === 'client' && <ClientReviewsView data={data} reload={reload} />}
                {data && user.role === 'lawyer' && <LawyerReviewsView data={data} />}
            </section>
        </main>
    );
}
