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
        {note.structured?.summary ? (
          <p className={styles.text}>{note.structured.summary}</p>
        ) : note.body && (
          <p className={styles.text}>{note.body}</p>
        )}
        
        {note.structured && Object.keys(note.structured).filter(k => k !== 'summary').length > 0 && (
          <div className={styles.analysis}>
            <div className={styles.analysisTitle}>AI Insights & Details</div>
            <ul className={styles.analysisList}>
              {Object.entries(note.structured)
                .filter(([key]) => key !== 'summary')
                .map(([key, value]) => (
                  <li key={key}>
                    <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
