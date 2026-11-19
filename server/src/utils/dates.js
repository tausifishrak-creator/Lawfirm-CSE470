// Date helpers. Dates are plain "YYYY-MM-DD" strings in Dhaka time.
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TIMEZONE = 'Asia/Dhaka';

function parse(dateStr) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    // Rejects impossible dates such as 2026-02-31.
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateStr) return null;
    return date;
}

/** "2026-11-14" -> "Saturday" (null if the date is invalid). */
function dayOfWeek(dateStr) {
    const date = parse(dateStr);
    return date ? DAY_NAMES[date.getUTCDay()] : null;
}

/** Today's date, "YYYY-MM-DD", in Dhaka. */
function today() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
}

/** Current time in Dhaka as "HH:MM:SS". */
function nowTime() {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).format(new Date());
}

/** Every date of a month: "2026-11" -> ["2026-11-01", ..., "2026-11-30"]. Null if invalid. */
function monthDates(month) {
    const match = /^(\d{4})-(\d{2})$/.exec(month || '');
    if (!match) return null;
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) return null;
    const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    return Array.from({ length: days }, (_, i) => `${match[1]}-${match[2]}-${String(i + 1).padStart(2, '0')}`);
}

/** True if this slot on this date has already started (or the date is in the past). */
function isPast(dateStr, slotTime) {
    const todayStr = today();
    if (dateStr < todayStr) return true;
    return dateStr === todayStr && slotTime <= nowTime();
}

/** "2026-11-24" -> "Tue, 24 Nov 2026" (for notification messages). */
function prettyDate(dateStr) {
    const date = parse(dateStr);
    if (!date) return dateStr;
    return `${DAY_NAMES[date.getUTCDay()].slice(0, 3)}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

module.exports = { dayOfWeek, today, nowTime, monthDates, isPast, prettyDate };
