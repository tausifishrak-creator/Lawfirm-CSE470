// Top navigation bar: role-based menu, notification bell and logout.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dateTime } from '../utils/format';

const MENUS = {
    client: [
        { to: '/lawyers', label: 'Find a Lawyer' },
        { to: '/cases', label: 'My Cases' },
        { to: '/appointments', label: 'Appointments' },
        { to: '/documents', label: 'Documents' },
    ],
    lawyer: [
        { to: '/cases?tab=pending', label: 'Pending Approval', pending: true },
        { to: '/cases', label: 'My Cases' },
        { to: '/schedule', label: 'My Schedule' },
        { to: '/appointments', label: 'Appointments' },
        { to: '/documents', label: 'Documents' },
        { to: '/tasks', label: 'Case Tasks' },
    ],
};

const POLL_MS = 30000;

export default function Navbar() {
    const { user, logout } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(null); // 'menu' | 'notifications' | null
    const [info, setInfo] = useState({ notifications: [], unreadCount: 0, pendingCases: 0 });
    const navRef = useRef(null);

    const hasBell = Boolean(user && MENUS[user.role]);

    const loadNotifications = useCallback(() => {
        if (!hasBell) return;
        api.get('/notifications').then(setInfo).catch(() => {});
    }, [hasBell]);

    // Refresh when the page changes, and every 30 seconds.
    useEffect(() => {
        setOpen(null);
        loadNotifications();
    }, [location.pathname, location.search, loadNotifications]);

    useEffect(() => {
        if (!hasBell) return undefined;
        const timer = setInterval(loadNotifications, POLL_MS);
        return () => clearInterval(timer);
    }, [hasBell, loadNotifications]);

    // Close dropdowns when clicking outside the navbar.
    useEffect(() => {
        const onClick = (e) => {
            if (navRef.current && !navRef.current.contains(e.target)) setOpen(null);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const toggle = (name) => setOpen((current) => (current === name ? null : name));

    const openNotification = async (id) => {
        try {
            const { link } = await api.post(`/notifications/${id}/read`);
            setOpen(null);
            navigate(link || '/dashboard');
            loadNotifications();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const markAllRead = async () => {
        await api.post('/notifications/read-all').catch(() => {});
        loadNotifications();
    };

    const handleLogout = async () => {
        await logout();
        toast.success('You have been logged out.');
        navigate('/login');
    };

    const homeLink = user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/';

    return (
        <header>
            <nav ref={navRef}>
                <div className="nav_logo">
                    <h1>
                        <Link to={homeLink}>⚖️ LAW FIRM</Link>
                    </h1>
                </div>

                <ul className="nav_link">
                    {!user && (
                        <>
                            <li><NavLink to="/login">Login</NavLink></li>
                            <li><NavLink to="/register">Register</NavLink></li>
                        </>
                    )}

                    {user && user.role === 'admin' && (
                        <li><NavLink to="/admin">Admin Panel</NavLink></li>
                    )}

                    {user && MENUS[user.role] && (
                        <>
                            <li><NavLink to="/dashboard">Dashboard</NavLink></li>
                            <li className="nav_menu_item">
                                <button type="button" className="nav_button" onClick={() => toggle('menu')}>
                                    ☰ Menu
                                    {info.pendingCases > 0 && <span className="nav_count_inline nav_menu_dot">{info.pendingCases}</span>}
                                </button>
                                {open === 'menu' && (
                                    <div className="dropdown_panel dropdown_menu">
                                        <div className="dropdown_header">
                                            <strong>Navigation</strong>
                                            <button type="button" className="dropdown_close" onClick={() => setOpen(null)}>✕</button>
                                        </div>
                                        {MENUS[user.role].map((item) => (
                                            <Link key={item.to} to={item.to} className="notif_item with_badge">
                                                {item.label}
                                                {item.pending && info.pendingCases > 0 && (
                                                    <span className="nav_count_inline">{info.pendingCases}</span>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </li>
                        </>
                    )}

                    {user && (
                        <li className="nav_user nav_menu_item">
                            {hasBell && (
                                <button type="button" className="nav_button nav_bell" onClick={() => toggle('notifications')}
                                    aria-label={`Notifications (${info.unreadCount} unread)`}>
                                    🔔
                                    {info.unreadCount > 0 && <span className="nav_count">{info.unreadCount}</span>}
                                </button>
                            )}
                            <span className="user_badge">
                                {user.role === 'admin' ? '🛡️' : '👤'} {user.full_name}
                            </span>

                            {open === 'notifications' && (
                                <div className="dropdown_panel dropdown_notifications">
                                    <div className="dropdown_header">
                                        <strong>Notifications</strong>
                                        <span>
                                            {info.unreadCount > 0 && (
                                                <button type="button" className="dropdown_link" onClick={markAllRead}>Mark all read</button>
                                            )}
                                            <button type="button" className="dropdown_close" onClick={() => setOpen(null)}>✕</button>
                                        </span>
                                    </div>
                                    <div className="dropdown_list">
                                        {info.notifications.length === 0 ? (
                                            <p className="notif_empty">No notifications yet</p>
                                        ) : (
                                            info.notifications.map((n) => (
                                                <button type="button" key={n.notification_id}
                                                    className={`notif_item ${n.is_read ? '' : 'unread'}`}
                                                    onClick={() => openNotification(n.notification_id)}>
                                                    <div>{n.message}</div>
                                                    <div className="notif_time">{dateTime(n.created_at)}</div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </li>
                    )}

                    {user && (
                        <li>
                            <a href="#logout" className="btn_logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                                Logout
                            </a>
                        </li>
                    )}
                </ul>
            </nav>
        </header>
    );
}
