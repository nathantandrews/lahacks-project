import { useState } from 'react';
import styles from './DoctorNote.module.css';

function SourceNotes({ sources }) {
  const [expanded, setExpanded] = useState(false);
  // Only show sources that have real text content
  const readable = (sources || []).filter(s => s.body && s.body.trim().length >= 30);
  if (!readable.length) return null;
  return (
    <div className={styles.sources}>
      <button className={styles.sourcesToggle} onClick={() => setExpanded(v => !v)}>
        {expanded ? '▾' : '▸'} {readable.length} source note{readable.length > 1 ? 's' : ''}
      </button>
      {expanded && (
        <ul className={styles.sourceList}>
          {readable.map((s, i) => (
            <li key={i} className={styles.sourceItem}>
              <span className={styles.sourceMeta}>{s.author}{s.date ? ` · ${s.date}` : ''}</span>
              <span className={styles.sourceBody}>{s.body}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DoctorNote({ notes = [], summary, loadingSummary }) {
  const hasNotes = notes.length > 0;
  const hasSummary = summary?.structured && Object.keys(summary.structured).length > 0;

  if (!hasNotes && !loadingSummary) return null;

  const structured = summary?.structured || {};
  const sources = summary?.sources || notes.map(n => ({
    author: n.author, date: n.date, body: n.body,
  }));

  // Header label
  const authors = [...new Set(notes.map(n => n.author).filter(Boolean))];
  const authorLabel = authors.length > 0 ? authors.join(', ') : 'Doctor';
  const dateLabel = notes[0]?.date || '';

  return (
    <aside className={styles.note}>
      <span className={styles.icon} aria-hidden>⚕</span>
      <div className={styles.body}>

        {/* Title */}
        <div className={styles.title}>
          Doctor's notes this week
          {authorLabel && <span className={styles.titleMeta}> · {authorLabel}{dateLabel ? `, ${dateLabel}` : ''}</span>}
        </div>

        {/* AI Summary */}
        {loadingSummary ? (
          <div className={styles.generating}>
            <span className={styles.pulse} /> Generating AI summary…
          </div>
        ) : hasSummary ? (
          <>
            {structured.summary && (
              <p className={styles.text}>{structured.summary}</p>
            )}

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
          </>
        ) : (
          /* Fallback: raw note text when no summary yet */
          notes[0]?.body && <p className={styles.text}>{notes[0].body}</p>
        )}

        <SourceNotes sources={sources} />
      </div>
    </aside>
  );
}
