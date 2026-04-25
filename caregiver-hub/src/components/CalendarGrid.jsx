import styles from './CalendarGrid.module.css';

const TIME_ROWS = ['08:00', '09:00', '12:00', '14:00', '18:00', '21:00'];
const TIME_LABELS = { '08:00': '8 AM', '09:00': '9 AM', '12:00': '12 PM', '14:00': '2 PM', '18:00': '6 PM', '21:00': '9 PM' };
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

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

export default function CalendarGrid({ events, currentDate, todayISO }) {
  const monday = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  // Index events by `${date}|${time}` for O(1) lookup per cell.
  const eventsByCell = {};
  events.forEach((e) => {
    const key = `${e.date}|${e.time}`;
    (eventsByCell[key] ||= []).push(e);
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
        <RowFragment
          key={time}
          time={time}
          days={days}
          eventsByCell={eventsByCell}
          todayISO={todayISO}
        />
      ))}
    </div>
  );
}

function RowFragment({ time, days, eventsByCell, todayISO }) {
  return (
    <>
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
    </>
  );
}
