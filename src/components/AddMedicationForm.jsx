import { useState } from 'react';
import styles from './Form.module.css';

export default function AddMedicationForm({ onSubmit, onCancel, initial }) {
  const [name, setName] = useState(initial?.name || '');
  const [dose, setDose] = useState(initial?.dose || '');
  const [schedule, setSchedule] = useState(initial?.schedule || '');
  const [withFood, setWithFood] = useState(!!initial?.withFood);
  const [startDate, setStartDate] = useState(initial?.startDate || '');
  const [refillDate, setRefillDate] = useState(initial?.refillDate || '');
  const [endDate, setEndDate] = useState(initial?.endDate || '');
  const isEdit = !!initial;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      id: initial?.id || `m-${Date.now()}`,
      name: name.trim(),
      dose: dose.trim(),
      schedule: schedule.trim(),
      withFood,
      startDate,
      refillDate,
      endDate: endDate || null,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>Name</label>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Metformin"
          autoFocus
        />
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Dose</label>
          <input
            className={styles.input}
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="500mg"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Schedule</label>
          <input
            className={styles.input}
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="2x daily"
          />
        </div>
      </div>
      
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Start Date</label>
          <input
            type="date"
            className={styles.input}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Refill Date</label>
          <input
            type="date"
            className={styles.input}
            value={refillDate}
            onChange={(e) => setRefillDate(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>End Date (Optional)</label>
        <input
          type="date"
          className={styles.input}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={withFood}
          onChange={(e) => setWithFood(e.target.checked)}
        />
        Must be taken with food
      </label>
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.submit}>
          {isEdit ? 'Save changes' : 'Add medication'}
        </button>
      </div>
    </form>
  );
}
