// A month grid used by the booking calendar and the lawyer's availability calendar.
// `days` comes from GET /api/appointments/calendar: [{ date, weekday, slots: [{ id, state }] }].
import { addMonths, monthLabel, monthOf, todayISO } from '../utils/format';

// Weeks start on Saturday (Friday is the weekly holiday).
const WEEK = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEK_INDEX = { Saturday: 0, Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6 };

/**
 * mode "book":   a day can be picked only if it has at least one free slot.
 * mode "manage": any day from today on can be picked (except Fridays), to open or close slots.
 */
export default function MonthCalendar({ month, days, selected, onSelect, onMonthChange, mode = 'book' }) {
    const today = todayISO();
    const firstOffset = days.length ? WEEK_INDEX[days[0].weekday] : 0;
    const canGoBack = month > monthOf(today);

    return (
        <div>
            <div className="calendar_head">
                <button type="button" className="calendar_nav" onClick={() => onMonthChange(addMonths(month, -1))}
                    disabled={!canGoBack} aria-label="Previous month">‹</button>
                <h3>{monthLabel(month)}</h3>
                <button type="button" className="calendar_nav" onClick={() => onMonthChange(addMonths(month, 1))}
                    aria-label="Next month">›</button>
            </div>

            <div className="calendar_grid">
                {WEEK.map((name) => <div key={name} className="calendar_weekday">{name}</div>)}
                {Array.from({ length: firstOffset }, (_, i) => <div key={`blank_${i}`} />)}

                {days.map((day) => {
                    const open = day.slots.filter((s) => s.state === 'available').length;
                    const booked = day.slots.filter((s) => s.state === 'booked').length;
                    const past = day.date < today;
                    const pickable = mode === 'manage'
                        ? !past && day.weekday !== 'Friday'
                        : open > 0;

                    const classes = ['calendar_day'];
                    if (open > 0) classes.push('has_open');
                    if (!pickable) classes.push('is_closed');
                    if (day.date === today) classes.push('is_today');
                    if (day.date === selected) classes.push('is_selected');

                    let label = `${day.date}: ${open} free`;
                    if (booked) label += `, ${booked} booked`;

                    return (
                        <button type="button" key={day.date} className={classes.join(' ')} disabled={!pickable}
                            onClick={() => onSelect(day.date)} aria-label={label} aria-pressed={day.date === selected}>
                            {Number(day.date.slice(8))}
                            <span className="day_dots">
                                {open > 0 && <span className="dot dot_open" />}
                                {booked > 0 && mode === 'manage' && <span className="dot dot_booked" />}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="calendar_legend">
                <span><i className="dot dot_open" /> Has free slots</span>
                {mode === 'manage' && <span><i className="dot dot_booked" /> Has appointments</span>}
                <span>Fridays are holidays</span>
            </div>
        </div>
    );
}
