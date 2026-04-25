import { useState } from 'react';
import styles from './DoctorNote.module.css';

/** Mirror of the backend filter — skip filenames and very short text */
function isMeaningful(body) {
  if (!body || body.trim().length < 30) return false;
  const b = body.trim().toLowerCase();
  if (b.endsWith('.pdf') || b.endsWith('.png') || b.endsWith('.jpg') || b.endsWith('.jpeg')) return false;
  if (!b.includes(' ')) return false; // filenames have no spaces
  return true;
}

function SourceNotes({ notes, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  if (!notes.length) return null;
  return (
    <div className={styles.sources}>
      <button className={styles.sourcesToggle} onClick={() => setExpanded(v => !v)}>
        {expanded ? '▾' : '▸'} {notes.length} source note{notes.length > 1 ? 's' : ''}
      </button>
      {expanded && (
        <ul className={styles.sourceList}>
          {notes.map((n, i) => (
            <li key={n.id || i} className={styles.sourceItem}>
              <div className={styles.sourceHeader}>
                <span className={styles.sourceMeta}>{n.author}{n.date ? ` · ${n.date}` : ''}</span>
                {onDelete && (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => onDelete(n.id)}
                    title="Delete this note"
                    aria-label="Delete note"
                  >×</button>
                )}
              </div>
              <span className={styles.sourceBody}>{n.body}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DoctorNote({ notes = [], summary, loadingSummary, onDeleteNote }) {
  // Filter to only notes with real clinical text — skip filename-only entries
  const meaningfulNotes = notes.filter(n => isMeaningful(n.body));

  const hasMeaningfulNotes = meaningfulNotes.length > 0;
  const hasSummary = summary?.structured &&
    (summary.structured.summary || summary.structured.action_items?.length);

  // Nothing to show at all
  if (!hasMeaningfulNotes && !loadingSummary) return null;

  const structured = summary?.structured || {};

  // Header uses first meaningful note for author/date
  const firstNote = meaningfulNotes[0] || notes[0];
  const authors = [...new Set(meaningfulNotes.map(n => n.author).filter(Boolean))];
  const authorLabel = authors.join(', ') || 'Doctor';
  const dateLabel = firstNote?.date || '';

  return (
    <aside className={styles.note}>
      <span className={styles.icon} aria-hidden>⚕</span>
      <div className={styles.body}>

        {/* Title */}
        <div className={styles.title}>
          Doctor's notes this week
          {authorLabel && (
            <span className={styles.titleMeta}>
              {' · '}{authorLabel}{dateLabel ? `, ${dateLabel}` : ''}
            </span>
          )}
        </div>

        {/* AI Summary or fallback */}
        {loadingSummary ? (
          <div className={styles.generating}>
            <span className={styles.pulse} /> Generating AI summary…
          </div>
        ) : hasSummary ? (
          <>
            {structured.summary && (
              <p className={styles.text}>{structured.summary}</p>
            )}
            {(structured.action_items?.length > 0 ||
              structured.concerns?.length > 0 ||
              structured.vitals?.length > 0) && (
              <div className={styles.analysis}>
                <div className={styles.analysisTitle}>AI Insights & Action Items</div>
                <ul className={styles.analysisList}>
                  {structured.action_items?.map((item, i) => (
                    <li key={`action-${i}`}>
                      <span className={styles.checkbox}>☐</span> {item}
                    </li>
                  ))}
                  {structured.concerns?.map((item, i) => (
                    <li key={`concern-${i}`}>
                      <span className={styles.tag}>Watch</span> {item}
                    </li>
                  ))}
                  {structured.vitals?.map((item, i) => (
                    <li key={`vital-${i}`}>
                      <span className={styles.tag}>Vitals</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : hasMeaningfulNotes ? (
          <p className={styles.text}>{meaningfulNotes[0].body}</p>
        ) : null}

        {/* Source notes with delete buttons */}
        <SourceNotes notes={meaningfulNotes} onDelete={onDeleteNote} />
      </div>
    </aside>
  );
}
