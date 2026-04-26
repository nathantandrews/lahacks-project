import { useState } from 'react';
import styles from './Form.module.css';

const TYPES = [
  { value: 'medication',  label: 'Medication' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'vitals',      label: 'Vitals check' },
  { value: 'activity',    label: 'Activity' },
  { value: 'meal',        label: 'Meal/log' },
  { value: 'lab',         label: 'Lab/test' },
];

const pad = (n) => String(n).padStart(2, '0');

// 96 entries: 12:00 AM, 12:15 AM, ..., 11:45 PM. `value` is canonical 24h "HH:MM".
const TIME_OPTIONS = (() => {
  const out = [];
  for (let mins = 0; mins < 24 * 60; mins += 15) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h24 < 12 ? 'AM' : 'PM';
    const h12 = ((h24 + 11) % 12) + 1;
    out.push({
      label: `${h12}:${pad(m)} ${period}`,
      value: `${pad(h24)}:${pad(m)}`,
    });
  }
  return out;
})();

const formatTime = (value) => {
  if (!value) return '';
  const [hStr, mStr] = value.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${pad(m)} ${period}`;
};

// Accepts "8:00 AM", "8am", "08:00", "20:30", "8" → returns "HH:MM" or null.
const parseTime = (input) => {
  if (!input) return null;
  const m = input.trim().toUpperCase().match(/^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const period = m[3];
  if (Number.isNaN(h) || min < 0 || min > 59) return null;
  if (period) {
    if (h < 1 || h > 12) return null;
    h = period === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  } else if (h < 0 || h > 23) {
    return null;
  }
  return `${pad(h)}:${pad(min)}`;
};

const REPEAT_OPTIONS = [
  { value: 'none',   label: 'Does not repeat' },
  { value: 'daily',  label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
];

function defaultDate(currentDate) {
  return new Date(currentDate).toISOString().slice(0, 10);
}

function addMinutes(value, delta) {
  const [h, m] = value.split(':').map(Number);
  const total = Math.min(23 * 60 + 45, h * 60 + m + delta);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export default function AddEventForm({ currentDate, onSubmit, onCancel, onDelete, initial }) {
  const isEdit = !!initial;
  const initialStart = initial?.startTime || initial?.time || '';
  const initialEnd = initial?.endTime || '';
  const [date, setDate] = useState(initial?.date || defaultDate(currentDate));
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [startInput, setStartInput] = useState(initialStart ? formatTime(initialStart) : '');
  const [endInput, setEndInput] = useState(initialEnd ? formatTime(initialEnd) : '');
  const [title, setTitle] = useState(initial?.title || '');
  const [subtitle, setSubtitle] = useState(initial?.subtitle || '');
  const [type, setType] = useState(initial?.type || 'medication');
  const [repeat, setRepeat] = useState(initial?.repeat || 'none');
  const [repeatInterval, setRepeatInterval] = useState(initial?.repeatIntervalDays || 2);
  const [repeatEndDate, setRepeatEndDate] = useState(initial?.repeatEndDate || '');

  const commitStart = (raw) => {
    if (!raw.trim()) {
      setStartTime('');
      setStartInput('');
      return;
    }
    const parsed = parseTime(raw);
    if (parsed === null) {
      setStartInput(startTime ? formatTime(startTime) : '');
      return;
    }
    setStartTime(parsed);
    setStartInput(formatTime(parsed));
    // Keep end time strictly after start, only if end is already set.
    if (endTime && parsed >= endTime) {
      const next = addMinutes(parsed, 15);
      setEndTime(next);
      setEndInput(formatTime(next));
    }
  };

  const commitEnd = (raw) => {
    if (!raw.trim()) {
      setEndTime('');
      setEndInput('');
      return;
    }
    const parsed = parseTime(raw);
    if (parsed === null) {
      setEndInput(endTime ? formatTime(endTime) : '');
      return;
    }
    setEndTime(parsed);
    setEndInput(formatTime(parsed));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const start = parseTime(startInput) ?? startTime;
    const end = parseTime(endInput) ?? endTime;
    onSubmit({
      id: initial?.id || `e-${Date.now()}`,
      date,
      startTime: start,
      endTime: end,
      title: title.trim(),
      ...(subtitle.trim() ? { subtitle: subtitle.trim() } : {}),
      type,
      repeat,
      ...(repeat === 'custom'
        ? { repeatIntervalDays: Math.max(1, Number(repeatInterval) || 1) }
        : {}),
      ...(repeat !== 'none' && repeatEndDate ? { repeatEndDate } : {}),
    });
  };

  const handleDelete = () => {
    if (!initial) return;
    if (!window.confirm(`Delete "${initial.title}"? This can't be undone.`)) return;
    onDelete?.(initial.id);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>Title</label>
        <input
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. BP check"
          autoFocus
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Type</label>
        <select
          className={styles.select}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Date</label>
        <input
          type="date"
          className={styles.input}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Start time</label>
          <input
            className={styles.input}
            list="time-options"
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            onBlur={(e) => commitStart(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitStart(e.currentTarget.value); } }}
            placeholder="e.g. 8:00 AM"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>End time</label>
          <input
            className={styles.input}
            list="time-options"
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
            onBlur={(e) => commitEnd(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitEnd(e.currentTarget.value); } }}
            placeholder="e.g. 9:00 AM"
          />
        </div>
        <datalist id="time-options">
          {TIME_OPTIONS.map((t) => (
            <option key={t.value} value={t.label} />
          ))}
        </datalist>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Repeat</label>
        <select
          className={styles.select}
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        >
          {REPEAT_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      {repeat === 'custom' && (
        <div className={styles.field}>
          <label className={styles.label}>Every (days)</label>
          <input
            type="number"
            min="1"
            className={styles.input}
            value={repeatInterval}
            onChange={(e) => setRepeatInterval(e.target.value)}
          />
        </div>
      )}
      {repeat !== 'none' && (
        <div className={styles.field}>
          <label className={styles.label}>End date (optional)</label>
          <input
            type="date"
            className={styles.input}
            min={date}
            value={repeatEndDate}
            onChange={(e) => setRepeatEndDate(e.target.value)}
          />
        </div>
      )}
      <div className={styles.field}>
        <label className={styles.label}>Subtitle (optional)</label>
        <input
          className={styles.input}
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="e.g. Ortho · knee"
        />
      </div>
      <div className={styles.actions}>
        {isEdit && onDelete && (
          <button type="button" className={styles.danger} onClick={handleDelete}>
            Delete
          </button>
        )}
        <button type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.submit}>
          {isEdit ? 'Save changes' : 'Add event'}
        </button>
      </div>
    </form>
  );
}
