import styles from './DoctorNote.module.css';

export default function DoctorNote({ note }) {
  if (!note) return null;
  return (
    <aside className={styles.note}>
      <span className={styles.icon} aria-hidden>i</span>
      <div className={styles.body}>
        <div className={styles.title}>
          Doctor's note this week · {note.author}, {note.date}
        </div>
        {note.imageUrl && (
          <img src={note.imageUrl} alt={note.fileName || ''} className={styles.attachment} />
        )}
        {note.fileName && !note.imageUrl && (
          <div className={styles.fileRow}>
            <span aria-hidden>📄</span>
            <span>{note.fileName}</span>
          </div>
        )}
        {note.body && <p className={styles.text}>{note.body}</p>}
      </div>
    </aside>
  );
}
