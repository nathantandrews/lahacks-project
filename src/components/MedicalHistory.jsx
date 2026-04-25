import styles from './MedicalHistory.module.css';

export default function MedicalHistory({ patient, notes }) {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <h2 className={styles.title}>Medical History</h2>
        {patient && (
          <p className={styles.subtitle}>
            All doctor's notes for {patient.fullName || patient.displayName}
          </p>
        )}
      </header>

      {notes.length === 0 ? (
        <div className={styles.empty}>No doctor's notes yet.</div>
      ) : (
        <ul className={styles.list}>
          {notes.map((note) => (
            <li key={note.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.icon} aria-hidden>i</span>
                <div className={styles.meta}>
                  <div className={styles.itemTitle}>{note.author || 'Doctor'}</div>
                  <div className={styles.itemDate}>
                    {note.date}
                    {note.weekOf ? ` · week of ${note.weekOf}` : ''}
                  </div>
                </div>
              </div>
              {note.imageUrl && (
                <img
                  src={note.imageUrl}
                  alt={note.fileName || ''}
                  className={styles.attachment}
                />
              )}
              {note.fileName && !note.imageUrl && (
                <div className={styles.fileRow}>
                  <span aria-hidden>📄</span>
                  <span>{note.fileName}</span>
                </div>
              )}
              {note.body && <p className={styles.body}>{note.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
