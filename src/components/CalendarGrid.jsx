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

// Pull the start time off an event, regardless of whether it's stored as
// `time` (older shape) or `startTime` (current shape).
function eventStart(event) {
  return event?.time || event?.startTime || '';
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

function timeToMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getDuration(start, end) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end || start);
  // Default to 15 mins if no end time or zero duration
  return Math.max(15, e - s);
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

// Expand recurring events into per-day instances within `visibleIsoSet`.
// Each clone keeps the original `id` so click-to-edit edits the source event;
// React keys must combine `id + date` to stay unique across instances.
function expandRecurring(events, visibleIsoSet) {
  const out = [];
  events.forEach((e) => {
    if (!e.date) return;
    const repeat = e.repeat || 'none';
    if (repeat === 'none') {
      if (visibleIsoSet.has(e.date)) out.push(e);
      return;
    }
    const baseDate = new Date(`${e.date}T00:00:00`);
    const endISO = e.repeatEndDate || null;
    const interval =
      repeat === 'custom' ? Math.max(1, Number(e.repeatIntervalDays) || 1) : null;
    visibleIsoSet.forEach((iso) => {
      if (iso < e.date) return;
      if (endISO && iso > endISO) return;
      const isoDateObj = new Date(`${iso}T00:00:00`);
      const diffDays = Math.round((isoDateObj - baseDate) / 86400000);
      if (diffDays < 0) return;
      let match = false;
      if (repeat === 'daily') match = true;
      else if (repeat === 'weekly') match = diffDays % 7 === 0;
      else if (repeat === 'custom') match = diffDays % interval === 0;
      if (match) out.push({ ...e, date: iso });
    });
  });
  return out;
}

function visibleIsosFor(view, currentDate) {
  if (view === 'day') {
    const d = new Date(currentDate);
    d.setHours(0, 0, 0, 0);
    return new Set([isoDate(d)]);
  }
  if (view === 'month') {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const firstOfMonth = new Date(year, month, 1);
    const gridStart = startOfWeek(firstOfMonth);
    const isos = new Set();
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      isos.add(isoDate(d));
    }
    return isos;
  }
  // week
  const monday = startOfWeek(currentDate);
  const isos = new Set();
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    isos.add(isoDate(d));
  }
  return isos;
}

/**
 * Assigns events to lanes (columns) based on overlaps within collision clusters.
 */
function layoutDayEvents(dayEvents, gridStartHour, totalHours) {
  if (!dayEvents.length) return [];
  
  // 1. Sort by start time
  const sorted = [...dayEvents].sort((a, b) => 
    timeToMinutes(eventStart(a)) - timeToMinutes(eventStart(b)) ||
    getDuration(eventStart(a), a.endTime) - getDuration(eventStart(b), b.endTime)
  );

  // 2. Group into overlapping clusters
  const clusters = [];
  let currentCluster = null;
  let clusterEnd = -1;

  sorted.forEach(event => {
    const start = timeToMinutes(eventStart(event));
    const end = start + getDuration(eventStart(event), event.endTime);

    if (start >= clusterEnd) {
      currentCluster = [];
      clusters.push(currentCluster);
      clusterEnd = end;
    } else {
      clusterEnd = Math.max(clusterEnd, end);
    }
    currentCluster.push(event);
  });

  // 3. Layout each cluster
  const positioned = [];
  clusters.forEach(cluster => {
    const lanes = []; // Array of end times for each lane in this cluster
    const clusterEvents = [];

    cluster.forEach(event => {
      const start = timeToMinutes(eventStart(event));
      const duration = getDuration(eventStart(event), event.endTime);
      const end = start + duration;
      
      let laneIndex = lanes.findIndex(laneEnd => laneEnd <= start);
      if (laneIndex === -1) {
        laneIndex = lanes.length;
        lanes.push(end);
      } else {
        lanes[laneIndex] = end;
      }

      const totalMins = totalHours * 60;
      positioned.push({
        ...event,
        lane: laneIndex,
        top: ((start - gridStartHour * 60) / totalMins) * 100,
        height: (duration / totalMins) * 100
      });
    });

    // Assign totalLanes only to events in this cluster
    const clusterSlice = positioned.slice(-cluster.length);
    clusterSlice.forEach(p => {
      p.totalLanes = lanes.length;
    });
  });

  return positioned;
}

function computeHourRange(events) {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  events.forEach((e) => {
    const h = parseHour(eventStart(e));
    if (h == null) return;
    if (h < startHour) startHour = h;
    if (h > endHour) endHour = h;
  });
  return { startHour, endHour };
}

export default function CalendarGrid({ events, currentDate, todayISO, view = 'week', onEventClick }) {
  const visibleIsoSet = visibleIsosFor(view, currentDate);
  const expandedEvents = expandRecurring(events, visibleIsoSet);

  const eventsByDate = {};
  expandedEvents.forEach((e) => {
    (eventsByDate[e.date] ||= []).push(e);
  });

  if (view === 'day') {
    return <DayView eventsByDate={eventsByDate} currentDate={currentDate} todayISO={todayISO} onEventClick={onEventClick} />;
  }
  if (view === 'month') {
    return <MonthView eventsByDate={eventsByDate} currentDate={currentDate} todayISO={todayISO} onEventClick={onEventClick} />;
  }
  return <WeekView eventsByDate={eventsByDate} currentDate={currentDate} todayISO={todayISO} onEventClick={onEventClick} />;
}

function WeekView({ eventsByDate, currentDate, todayISO, onEventClick }) {
  const monday = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  
  const allVisibleEvents = Object.values(eventsByDate).flat();
  const { startHour, endHour } = computeHourRange(allVisibleEvents);
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  return (
    <div data-tour="calendar" className={styles.grid}>
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

      {hours.map((h, i) => (
        <Fragment key={h}>
          <div className={styles.timeCell} style={{ gridRow: i + 2 }}>{hourLabel(h)}</div>
          {i === 0 && days.map((d, j) => {
            const iso = isoDate(d);
            const dayEvents = eventsByDate[iso] || [];
            const positioned = layoutDayEvents(dayEvents, startHour, hours.length);
            return (
              <div
                key={iso}
                className={`${styles.dayColumn} ${iso === todayISO ? styles.todayCol : ''}`}
                style={{ gridColumn: j + 2, gridRow: `2 / span ${hours.length}` }}
              >
                {positioned.map((e) => (
                  <button
                    type="button"
                    key={`${e.id}-${e.date}`}
                    className={`${styles.event} ${styles[e.type]}`}
                    style={{
                      top: `${e.top}%`,
                      height: `${e.height}%`,
                      width: `${100 / e.totalLanes}%`,
                      left: `${(e.lane / e.totalLanes) * 100}%`
                    }}
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
      ))}
    </div>
  );
}

function DayView({ eventsByDate, currentDate, todayISO, onEventClick }) {
  const d = new Date(currentDate);
  d.setHours(0, 0, 0, 0);
  const iso = isoDate(d);
  const isToday = iso === todayISO;
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  
  const dayEvents = eventsByDate[iso] || [];
  const { startHour, endHour } = computeHourRange(dayEvents);
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const positioned = layoutDayEvents(dayEvents, startHour, hours.length);

  return (
    <div data-tour="calendar" className={`${styles.grid} ${styles.dayGrid}`}>
      <div className={styles.cornerCell} />
      <div className={`${styles.dayHeader} ${isToday ? styles.today : ''}`}>
        <div className={styles.dayName}>{dayName}</div>
        <div className={styles.dayNum}>{d.getDate()}</div>
      </div>

      {hours.map((h, i) => (
        <Fragment key={h}>
          <div className={styles.timeCell} style={{ gridRow: i + 2 }}>{hourLabel(h)}</div>
          {i === 0 && (
            <div
              className={`${styles.dayColumn} ${isToday ? styles.todayCol : ''}`}
              style={{ gridColumn: 2, gridRow: `2 / span ${hours.length}` }}
            >
              {positioned.map((e) => (
                <button
                  type="button"
                  key={`${e.id}-${e.date}`}
                  className={`${styles.event} ${styles[e.type]}`}
                  style={{
                    top: `${e.top}%`,
                    height: `${e.height}%`,
                    width: `${100 / e.totalLanes}%`,
                    left: `${(e.lane / e.totalLanes) * 100}%`
                  }}
                  onClick={() => onEventClick?.(e)}
                >
                  <div className={styles.eventTitle}>{e.title}</div>
                  {e.subtitle && <div className={styles.eventSubtitle}>{e.subtitle}</div>}
                </button>
              ))}
            </div>
          )}
        </Fragment>
      ))}
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
