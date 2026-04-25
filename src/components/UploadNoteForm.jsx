import { useState } from 'react';
import styles from './Form.module.css';

function isoMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function shortDate(date) {
  const d = new Date(date);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export default function UploadNoteForm({ currentDate, onSubmit, onCancel }) {
  const [author, setAuthor] = useState('Dr. Chen');
  const [body, setBody] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    onSubmit({
      id: `n-${Date.now()}`,
      weekOf: isoMondayOf(currentDate),
      author: author.trim() || 'Doctor',
      date: shortDate(new Date()),
      body: body.trim(),
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>Author</label>
        <input
          className={styles.input}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Dr. Chen"
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Note</label>
        <textarea
          className={styles.textarea}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Watch for swelling in ankles..."
          autoFocus
        />
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.submit}>Upload note</button>
      </div>
    </form>
  );
}
