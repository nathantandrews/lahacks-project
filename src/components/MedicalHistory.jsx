import { useState } from 'react';
import styles from './MedicalHistory.module.css';

/** Convert a snake_case or camelCase key into a readable label. */
function formatKey(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

/** Format a medication object into a readable string. */
function formatMedication(med) {
  if (typeof med !== 'object' || !med) return String(med);
  const parts = [];
  if (med.name) parts.push(med.name);
  if (med.dose) parts.push(med.dose);
  if (med.instructions) parts.push(med.instructions.toLowerCase());
  return parts.join(' — ');
}

/** Render a structured value in a human-readable way. */
function StructuredValue({ label, value }) {
  // Skip empty or null values
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value) && value.length === 0) return null;

  return (
    <li className={styles.insightItem}>
      <span className={styles.insightLabel}>{label}</span>
      {Array.isArray(value) ? (
        <ul className={styles.insightSubList}>
          {value.map((v, i) => (
            <li key={i} className={styles.insightSubItem}>
              {typeof v === 'object' ? formatMedication(v) : String(v)}
            </li>
          ))}
        </ul>
      ) : (
        <span className={styles.insightText}>{String(value)}</span>
      )}
    </li>
  );
}

function HistoryItem({ item, i, onDeleteNote, dataTour }) {
  const [insightsOpen, setInsightsOpen] = useState(false);

  const structuredEntries = item.structured
    ? Object.entries(item.structured).filter(([key, value]) => {
      if (key === 'summary') return false;
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
    : [];

  return (
    <li key={item.id || item._id || i} className={styles.item} data-tour={dataTour}>
      <div className={styles.itemHead}>
        <span className={`${styles.icon} ${styles[item._category]}`} aria-hidden>
          {item._category === 'doctor_note' ? 'i' : item._category === 'visit_summary' ? 'V' : 'M'}
        </span>
        <div className={styles.meta}>
          <div className={styles.itemTitle}>
            {item._category === 'doctor_note' ? (item.author || 'Doctor Note') :
              item._category === 'visit_summary' ? `Visit: ${item.reason || 'General'}` :
                `Medication: ${item.name}`}
          </div>
          <div className={styles.itemDate}>
            {item.date || item.weekOf}
            {item.doctor ? ` · ${item.doctor}` : ''}
            {item.location ? ` · ${item.location}` : ''}
          </div>
        </div>
        {item._category === 'doctor_note' && onDeleteNote && (
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => onDeleteNote(item.id || item._id)}
            aria-label="Delete doctor's note"
            title="Delete"
          >
            ×
          </button>
        )}
      </div>

      {item.imageUrl && (
        <img src={item.imageUrl} alt="" className={styles.attachment} />
      )}

      {item.structured?.summary ? (
        <p className={styles.body}>{item.structured.summary}</p>
      ) : item.summary ? (
        <p className={styles.body}>{item.summary}</p>
      ) : item.body ? (
        <p className={styles.body}>{item.body}</p>
      ) : item._category === 'medication' ? (
        <div className={styles.body}>
          <div className={styles.medDetail}>{item.dose} · {item.schedule}</div>
          {(item.startDate || item.endDate) && (
            <div className={styles.medDates}>
              {item.startDate && <span>Started: {item.startDate}</span>}
              {item.startDate && item.endDate && <span className={styles.dateSep}> · </span>}
              {item.endDate && <span>Ended: {item.endDate}</span>}
            </div>
          )}
        </div>
      ) : null}

      {structuredEntries.length > 0 && (
        <div className={styles.analysis}>
          <button
            className={styles.analysisToggle}
            onClick={() => setInsightsOpen(v => !v)}
            aria-expanded={insightsOpen}
          >
            <span>{insightsOpen ? '▾' : '▸'}</span>
            AI Insights & Details
          </button>
          {insightsOpen && (
            <ul className={styles.analysisList}>
              {structuredEntries.map(([key, value]) => (
                <StructuredValue key={key} label={formatKey(key)} value={value} />
              ))}
            </ul>
          )}
        </div>
      )}

      {item.followUp && (
        <div className={styles.followUp}>
          <strong>Follow-up:</strong> {item.followUp}
        </div>
      )}
    </li>
  );
}

export default function MedicalHistory({ patient, items, onDeleteNote }) {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <h2 className={styles.title}>Medical History</h2>
        {patient && (
          <p className={styles.subtitle}>
            All historical records for {patient.fullName || patient.displayName}
          </p>
        )}
      </header>

      {!items || items.length === 0 ? (
        <div className={styles.empty}>No historical records yet.</div>
      ) : (
        <ul className={styles.list}>
          {(items || []).map((item, i) => (
            <HistoryItem
              key={item.id || item._id || i}
              item={item}
              i={i}
              onDeleteNote={onDeleteNote}
              dataTour={i === 0 ? "history-first" : undefined}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
