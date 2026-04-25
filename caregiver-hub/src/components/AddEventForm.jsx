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

const TIMES = ['08:00', '09:00', '12:00', '14:00', '18:00', '21:00'];

const REPEAT_OPTIONS = [
  { value: 'none',   label: 'Does not repeat' },
  { value: 'daily',  label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
];

function defaultDate(currentDate) {
  return new Date(currentDate).toISOString().slice(0, 10);
}

function nextTimeAfter(start) {
  const i = TIMES.indexOf(start);
  return TIMES[Math.min(i + 1, TIMES.length - 1)] || start;
}

export default function AddEventForm({ currentDate, onSubmit, onCancel }) {
  const [date, setDate] = useState(defaultDate(currentDate));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [type, setType] = useState('medication');
  const [repeat, setRepeat] = useState('none');
  const [repeatInterval, setRepeatInterval] = useState(2);
  const [repeatEndDate, setRepeatEndDate] = useState('');

  const handleStartChange = (v) => {
    setStartTime(v);
    // Keep end time strictly after start.
    if (TIMES.indexOf(v) >= TIMES.indexOf(endTime)) {
      setEndTime(nextTimeAfter(v));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      id: `e-${Date.now()}`,
      date,
      time: startTime,
      endTime,
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
          <select
            className={styles.select}
            value={startTime}
            onChange={(e) => handleStartChange(e.target.value)}
          >
            {TIMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>End time</label>
          <select
            className={styles.select}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          >
            {TIMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
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
        <button type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.submit}>Add event</button>
      </div>
    </form>
  );
}
