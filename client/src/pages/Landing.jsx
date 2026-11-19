// Public landing page.
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useApi from  '../hooks/useApi';

function Counter({ target }) {
    const [value, setValue] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        let timer;
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            let current = 0;
            const step = () => {
                current = Math.min(target, Math.ceil(current + target / 50));
                setValue(current);
                if (current < target) timer = setTimeout(step, 30);
            };
            step();
        });
        if (ref.current) observer.observe(ref.current);
        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, [target]);

    return <strong ref={ref}>{value.toLocaleString()}</strong>;
}

const FEATURES = [
    { icon: '⚡', title: 'Real-Time Chat', text: 'Communicate without reloading the page. Messaging is tied directly to your active case.' },
    { icon: '📅', title: 'Smart Scheduling', text: 'Book time slots that sync instantly across the platform and prevent double-bookings.' },
    { icon: '🖨️', title: 'Printable Invoices', text: 'Generate printable legal invoices and receipts directly from the dashboard.' },
    { icon: '📊', title: 'Live Visual Analytics', text: 'Track your earnings and case statuses with interactive charts.' },
];

export default function Landing() {
    const { user } = useAuth();
    const {data: stats } = useApi('/stats');

    if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;

    return (
        <main className="saas_main">
            <section className="hero_section">
                <div className="hero_content">
                    <div className="hero_badge">✨ The New Standard in Legal Practice</div>
                    <h1>
                        The Modern Operating System for <span className="text_gradient">Law Firms.</span>
                    </h1>
                    <p>
                        Connect with top-tier verified legal professionals. Schedule appointments, manage evidence,
                        and handle billing automatically in one seamless, real-time platform.
                    </p>
                    <div className="hero_actions">
                        <Link to="/register" className="btn_hero_primary">Find a Lawyer</Link>
                        <Link to="/login" className="btn_hero_secondary">Sign In</Link>
                    </div>
                    <div className="hero_stats">
                        <div className="stat"><Counter target={stats ? stats.lawyers : 0} /><span>Registered Lawyers</span></div>
                        <div className="stat"><Counter target={stats ? stats.casesWon : 0} /><span>Cases Won</span></div>
                        <div className="stat"><Counter target={24} />/7<span>Realtime Tracking</span></div>
                    </div>
                </div>
                <div className="hero_visual">
                    <div className="mockup_window">
                        <div className="mockup_header"><span /><span /><span /></div>
                        <div className="mockup_body">
                            <div className="mockup_nav" />
                            <div className="mockup_grid">
                                <div className="mockup_card stat_card" />
                                <div className="mockup_card stat_card" />
                                <div className="mockup_card chart_card" style={{ gridColumn: 'span 2' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features_section">
                <div className="section_header">
                    <h2>Designed for <span>Excellence</span></h2>
                    <p>Everything you need to run your legal practice or manage your case, built into a single elegant interface.</p>
                </div>
                <div className="features_grid">
                    {FEATURES.map((f) => (
                        <div className="feature_card" key={f.title}>
                            <div className="f_icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="cta_section">
                <h2>Ready to transform your practice?</h2>
                <p>Join hundreds of professionals upgrading their workflow.</p>
                <Link to="/register" className="btn_hero_primary">Create a Free Account</Link>
            </section>

            <footer className="saas_footer">
                <p>&copy; {new Date().getFullYear()} Law Firm OS. All rights reserved.</p>
            </footer>
        </main>
    );
}
