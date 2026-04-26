import { Fragment } from 'react';
import styles from './CalendarGrid.module.css';

const DEFAULT_START_HOUR = 8;   // 8 AM
const DEFAULT_END_HOUR = 21;    // 9 PM
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MAX_MONTH_EVENTS = 2;

const pad2 = (n) => String(n).padStart(2, '0');

function hourLabel(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function parseHour(time) {
  if (!time) return null;
  const [h] = time.split(':');
  const n = Number(h);
  return Number.isFinite(n) ? n : null;
}

function parseMinute(time) {
  if (!time) return 0;
  const [, m] = time.split(':');
  const n = Number(m);
  return Number.isFinite(n) ? n : 0;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function computeHourRange(events) {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  events.forEach((e) => {
    const h = parseHour(e.time);
    if (h == null) return;
    if (h < startHour) startHour = h;
    if (h > endHour) endHour = h;
  });
  return { startHour, endHour };
}

export default function CalendarGrid({ events, currentDate, todayISO, view = 'week', onEventClick }) {
  const eventsByCell = {};
  const eventsByDate = {};
  events.forEach((e) => {
    const h = parseHour(e.time);
    if (h != null) {
      (eventsByCell[`${e.date}|${pad2(h)}`] ||= []).push(e);
    }
    (eventsByDate[e.date] ||= []).push(e);
  });
  Object.values(eventsByCell).forEach((list) =>
    list.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  );

  if (view === 'day') {
    return <DayView events={events} eventsByCell={eventsByCell} currentDate={currentDate} todayISO={todayISO} onEventClick={onEventClick} />;
  }
  if (view === 'month') {
    return <MonthView eventsByDate={eventsByDate} currentDate={currentDate} todayISO={todayISO} onEventClick={onEventClick} />;
  }
  return <WeekView events={events} eventsByCell={eventsByCell} currentDate={currentDate} todayISO={todayISO} onEventClick={onEventClick} />;
}

function WeekView({ events, eventsByCell, currentDate, todayISO, onEventClick }) {
  const monday = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const visibleIsos = new Set(days.map(isoDate));
  const visibleEvents = events.filter((e) => visibleIsos.has(e.date));
  const { startHour, endHour } = computeHourRange(visibleEvents);
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

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

      {hours.map((h) => {
        const hourKey = pad2(h);
        return (
          <Fragment key={hourKey}>
            <div className={styles.timeCell}>{hourLabel(h)}</div>
            {days.map((d) => {
              const iso = isoDate(d);
              const cellEvents = eventsByCell[`${iso}|${hourKey}`] || [];
              return (
                <div
                  key={iso}
                  className={`${styles.cell} ${iso === todayISO ? styles.todayCol : ''}`}
                >
                  {cellEvents.map((e) => (
                    <button
                      type="button"
                      key={e.id}
                      className={`${styles.event} ${styles[e.type]}`}
                      style={{ top: `${(parseMinute(e.time) / 60) * 100}%` }}
                      onClick={() => onEventClick?.(e)}
                    >
                      <div className={styles.eventTitle}>{e.title}</div>
                      {e.subtitle && <div className={styles.eventSubtitle}>{e.subtitle}</div>}
                    </button>
                  ))}
                </div>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}

function DayView({ events, eventsByCell, currentDate, todayISO, onEventClick }) {
  const d = new Date(currentDate);
  d.setHours(0, 0, 0, 0);
  const iso = isoDate(d);
  const isToday = iso === todayISO;
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dayEvents = events.filter((e) => e.date === iso);
  const { startHour, endHour } = computeHourRange(dayEvents);
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  return (
    <div className={`${styles.grid} ${styles.dayGrid}`}>
      <div className={styles.cornerCell} />
      <div className={`${styles.dayHeader} ${isToday ? styles.today : ''}`}>
        <div className={styles.dayName}>{dayName}</div>
        <div className={styles.dayNum}>{d.getDate()}</div>
      </div>

      {hours.map((h) => {
        const hourKey = pad2(h);
        const cellEvents = eventsByCell[`${iso}|${hourKey}`] || [];
        return (
          <Fragment key={hourKey}>
            <div className={styles.timeCell}>{hourLabel(h)}</div>
            <div className={`${styles.cell} ${isToday ? styles.todayCol : ''}`}>
              {cellEvents.map((e) => (
                <button
                  type="button"
                  key={e.id}
                  className={`${styles.event} ${styles[e.type]}`}
                  style={{ top: `${(parseMinute(e.time) / 60) * 100}%` }}
                  onClick={() => onEventClick?.(e)}
                >
                  <div className={styles.eventTitle}>{e.title}</div>
                  {e.subtitle && <div className={styles.eventSubtitle}>{e.subtitle}</div>}
                </button>
              ))}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function MonthView({ eventsByDate, currentDate, todayISO, onEventClick }) {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfWeek(firstOfMonth);

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
                <button
                  type="button"
                  key={e.id}
                  className={`${styles.monthEvent} ${styles[e.type]}`}
                  title={e.title}
                  onClick={() => onEventClick?.(e)}
                >
                  {e.title}
                </button>
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
