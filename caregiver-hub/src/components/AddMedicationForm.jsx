import { useState } from 'react';
import styles from './Form.module.css';

export default function AddMedicationForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [schedule, setSchedule] = useState('');
  const [withFood, setWithFood] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      id: `m-${Date.now()}`,
      name: name.trim(),
      dose: dose.trim(),
      schedule: schedule.trim(),
      ...(withFood ? { withFood: true } : {}),
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
        <button type="submit" className={styles.submit}>Add medication</button>
      </div>
    </form>
  );
}
