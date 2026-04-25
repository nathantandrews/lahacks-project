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

function defaultDate(currentDate) {
  return new Date(currentDate).toISOString().slice(0, 10);
}

export default function AddEventForm({ currentDate, onSubmit, onCancel }) {
  const [date, setDate] = useState(defaultDate(currentDate));
  const [time, setTime] = useState('08:00');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [type, setType] = useState('medication');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      id: `e-${Date.now()}`,
      date,
      time,
      title: title.trim(),
      ...(subtitle.trim() ? { subtitle: subtitle.trim() } : {}),
      type,
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
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Date</label>
          <input
            type="date"
            className={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Time</label>
          <select
            className={styles.select}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          >
            {TIMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
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
