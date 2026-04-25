import { useState } from 'react';
import styles from './Form.module.css';

export default function AddPatientForm({ onSubmit, onCancel }) {
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [primaryDoctor, setPrimaryDoctor] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim() || !displayName.trim()) return;

    // Generate initials from full name
    const initials = fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    onSubmit({
      fullName: fullName.trim(),
      displayName: displayName.trim(),
      initials: initials,
      age: parseInt(age, 10) || 0,
      dob: dob.trim(),
      primaryDoctor: primaryDoctor.trim(),
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>Full Name</label>
        <input
          className={styles.input}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Margaret Williams"
          required
          autoFocus
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Display Name</label>
        <input
          className={styles.input}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Mom (Margaret)"
          required
        />
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Age</label>
          <input
            className={styles.input}
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="e.g. 72"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Date of Birth</label>
          <input
            className={styles.input}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            placeholder="MM/DD/YYYY"
            required
          />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Primary Doctor</label>
        <input
          className={styles.input}
          value={primaryDoctor}
          onChange={(e) => setPrimaryDoctor(e.target.value)}
          placeholder="e.g. Dr. Chen"
          required
        />
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.submit}>Add patient</button>
      </div>
    </form>
  );
}
