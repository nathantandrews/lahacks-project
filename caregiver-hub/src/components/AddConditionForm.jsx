import { useState } from 'react';
import styles from './Form.module.css';

const TONES = [
  { value: 'diabetes', label: 'Red' },
  { value: 'hypertension', label: 'Amber' },
  { value: 'ckd', label: 'Lavender' },
  { value: 'ortho', label: 'Mint' },
];

export default function AddConditionForm({ onSubmit, onCancel }) {
  const [label, setLabel] = useState('');
  const [tone, setTone] = useState('diabetes');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSubmit({
      id: `c-${Date.now()}`,
      label: label.trim(),
      tone,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>Condition</label>
        <input
          className={styles.input}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Hypothyroidism"
          autoFocus
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Color</label>
        <select
          className={styles.select}
          value={tone}
          onChange={(e) => setTone(e.target.value)}
        >
          {TONES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.submit}>Add condition</button>
      </div>
    </form>
  );
}
