import { Fragment } from 'react';
import styles from './CalendarGrid.module.css';

const TIME_ROWS = ['08:00', '09:00', '12:00', '14:00', '18:00', '21:00'];
const TIME_LABELS = { '08:00': '8 AM', '09:00': '9 AM', '12:00': '12 PM', '14:00': '2 PM', '18:00': '6 PM', '21:00': '9 PM' };
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MAX_MONTH_EVENTS = 2;

// Utility: get the Monday of the week containing `date`.
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarGrid({ events, currentDate, todayISO, view = 'week' }) {
  // Index events by `${date}|${time}` for week/day cells, and by `${date}` for month cells.
  const eventsByCell = {};
  const eventsByDate = {};
  events.forEach((e) => {
    (eventsByCell[`${e.date}|${e.time}`] ||= []).push(e);
    (eventsByDate[e.date] ||= []).push(e);
  });

  if (view === 'day') {
    return <DayView eventsByCell={eventsByCell} currentDate={currentDate} todayISO={todayISO} />;
  }
  if (view === 'month') {
    return <MonthView eventsByDate={eventsByDate} currentDate={currentDate} todayISO={todayISO} />;
  }
  return <WeekView eventsByCell={eventsByCell} currentDate={currentDate} todayISO={todayISO} />;
}

function WeekView({ eventsByCell, currentDate, todayISO }) {
  const monday = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  return (
    <div className={styles.grid}>
      <div className={styles.cornerCell} />
      {days.map((d, i) => {
        const iso = isoDate(d);
        return (
          <div
            key={iso}
            className={`${styles.dayHeader} ${iso === todayISO ? styles.today : ''}`}
          >
            <div className={styles.dayName}>{DAY_LABELS[i]}</div>
            <div className={styles.dayNum}>{d.getDate()}</div>
          </div>
        );
      })}

      {TIME_ROWS.map((time) => (
        <Fragment key={time}>
          <div className={styles.timeCell}>{TIME_LABELS[time]}</div>
          {days.map((d) => {
            const iso = isoDate(d);
            const cellEvents = eventsByCell[`${iso}|${time}`] || [];
            return (
              <div
                key={iso}
                className={`${styles.cell} ${iso === todayISO ? styles.todayCol : ''}`}
              >
                {cellEvents.map((e) => (
                  <div key={e.id} className={`${styles.event} ${styles[e.type]}`}>
                    <div className={styles.eventTitle}>{e.title}</div>
                    {e.subtitle && <div className={styles.eventSubtitle}>{e.subtitle}</div>}
                  </div>
                ))}
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

function DayView({ eventsByCell, currentDate, todayISO }) {
  const d = new Date(currentDate);
  d.setHours(0, 0, 0, 0);
  const iso = isoDate(d);
  const isToday = iso === todayISO;
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

  return (
    <div className={`${styles.grid} ${styles.dayGrid}`}>
      <div className={styles.cornerCell} />
      <div className={`${styles.dayHeader} ${isToday ? styles.today : ''}`}>
        <div className={styles.dayName}>{dayName}</div>
        <div className={styles.dayNum}>{d.getDate()}</div>
      </div>

      {TIME_ROWS.map((time) => {
        const cellEvents = eventsByCell[`${iso}|${time}`] || [];
        return (
          <Fragment key={time}>
            <div className={styles.timeCell}>{TIME_LABELS[time]}</div>
            <div className={`${styles.cell} ${isToday ? styles.todayCol : ''}`}>
              {cellEvents.map((e) => (
                <div key={e.id} className={`${styles.event} ${styles[e.type]}`}>
                  <div className={styles.eventTitle}>{e.title}</div>
                  {e.subtitle && <div className={styles.eventSubtitle}>{e.subtitle}</div>}
                </div>
              ))}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function MonthView({ eventsByDate, currentDate, todayISO }) {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfWeek(firstOfMonth);

  // Always render 6 weeks so the grid height is stable; days outside the
  // current month are rendered muted.
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  return (
    <div className={styles.monthGrid}>
      {DAY_LABELS.map((label) => (
        <div key={label} className={styles.monthDayHeader}>{label}</div>
      ))}
      {days.map((d) => {
        const iso = isoDate(d);
        const inMonth = d.getMonth() === month;
        const isToday = iso === todayISO;
        const dayEvents = eventsByDate[iso] || [];
        const visible = dayEvents.slice(0, MAX_MONTH_EVENTS);
        const overflow = dayEvents.length - visible.length;
        return (
          <div
            key={iso}
            className={`${styles.monthCell} ${!inMonth ? styles.outsideMonth : ''} ${isToday ? styles.todayMonthCell : ''}`}
          >
            <div className={styles.monthDayNum}>{d.getDate()}</div>
            <div className={styles.monthEvents}>
              {visible.map((e) => (
                <div
                  key={e.id}
                  className={`${styles.monthEvent} ${styles[e.type]}`}
                  title={e.title}
                >
                  {e.title}
                </div>
              ))}
              {overflow > 0 && (
                <div className={styles.monthMore}>+{overflow} more</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
