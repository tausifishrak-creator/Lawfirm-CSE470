// Formatting helpers shared by the views.
// The API returns dates as "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS" strings in Dhaka time.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value || '');
    if (!match) return null;
    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: Number(match[4] || 0),
        minute: Number(match[5] || 0),
    };
}

/** 5000 -> "৳5,000.00" */
export function money(value) {
    const number = Number(value) || 0;
    return `৳${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "2026-11-14 ..." -> "Nov 14, 2026" */
export function shortDate(value) {
    const p = parts(value);
    if (!p) return '';
    return `${MONTHS[p.month - 1]} ${String(p.day).padStart(2, '0')}, ${p.year}`;
}

/** "14:30:00" -> "02:30 PM" */
export function clockTime(value) {
    const match = /^(\d{2}):(\d{2})/.exec(value || '');
    if (!match) return '';
    const hour = Number(match[1]);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(h12).padStart(2, '0')}:${match[2]} ${suffix}`;
}

/** "2026-11-14 14:30:00" -> "Nov 14, 2026 - 02:30 PM" */
export function dateTime(value) {
    const p = parts(value);
    if (!p) return '';
    const time = clockTime(`${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`);
    return `${shortDate(value)} - ${time}`;
}

/** Today's date in Dhaka as "YYYY-MM-DD" (for <input type="date" min=...>). */
export function todayISO() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
}

/** "In Progress" -> "status_InProgress" (matches the class names in style.css). */
export function statusClass(status) {
    return `status_${String(status || '').replace(/\s+/g, '')}`;
}

/** Bytes -> "12.3 KB" */
export function fileSize(bytes) {
    return `${((Number(bytes) || 0) / 1024).toFixed(1)} KB`;
}

const LONG_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "2026-11-24" -> "2026-11" */
export function monthOf(date) {
    return String(date || '').slice(0, 7);
}

/** ("2026-11", 1) -> "2026-12";  ("2026-01", -1) -> "2025-12" */
export function addMonths(month, delta) {
    const [year, m] = month.split('-').map(Number);
    const index = year * 12 + (m - 1) + delta;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** "2026-11" -> "November 2026" */
export function monthLabel(month) {
    const [year, m] = month.split('-').map(Number);
    return `${LONG_MONTHS[m - 1]} ${year}`;
}

/** "2026-11-24" -> "Tuesday, November 24, 2026" */
export function fullDate(date) {
    const p = parts(date);
    if (!p) return '';
    const weekday = WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];
    return `${weekday}, ${LONG_MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
}
