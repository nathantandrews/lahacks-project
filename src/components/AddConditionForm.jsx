import { useState } from 'react';
import styles from './Form.module.css';

const TONES = [
  { value: 'diabetes', label: 'Red' },
  { value: 'hypertension', label: 'Amber' },
  { value: 'ckd', label: 'Lavender' },
  { value: 'ortho', label: 'Mint' },
];

export default function AddConditionForm({ onSubmit, onCancel, onDelete, initial }) {
  const isEdit = !!initial;
  const [label, setLabel] = useState(initial?.label || '');
  const [tone, setTone] = useState(initial?.tone || 'diabetes');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSubmit({
      id: initial?.id || `c-${Date.now()}`,
      label: label.trim(),
      tone,
    });
  };

  const handleDelete = () => {
    if (!initial) return;
    if (!window.confirm(`Delete "${initial.label}"? This can't be undone.`)) return;
    onDelete?.(initial.id);
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
        {isEdit && onDelete && (
          <button type="button" className={styles.danger} onClick={handleDelete}>
            Delete
          </button>
        )}
        <button type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.submit}>
          {isEdit ? 'Save changes' : 'Add condition'}
        </button>
      </div>
    </form>
  );
}
