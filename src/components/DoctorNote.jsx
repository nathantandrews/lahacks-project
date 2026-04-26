import { useState } from 'react';
import styles from './DoctorNote.module.css';

/** Mirror of the backend filter — skip filenames and very short text */
function isMeaningful(body) {
  if (!body || body.trim().length < 30) return false;
  const b = body.trim().toLowerCase();
  if (b.endsWith('.pdf') || b.endsWith('.png') || b.endsWith('.jpg') || b.endsWith('.jpeg')) return false;
  if (!b.includes(' ')) return false;
  return true;
}

function guessEventType(text) {
  const t = text.toLowerCase();
  if (t.includes('blood pressure') || t.includes('bp') || t.includes('weight') || t.includes('log') || t.includes('vital')) return 'vitals';
  if (t.includes('walk') || t.includes('exercise') || t.includes('activity')) return 'activity';
  if (t.includes('lab') || t.includes('test') || t.includes('blood work') || t.includes('recheck')) return 'lab';
  if (t.includes('doctor') || t.includes('appointment') || t.includes('follow') || t.includes('visit')) return 'appointment';
  if (t.includes('meal') || t.includes('diet') || t.includes('sodium') || t.includes('eat')) return 'meal';
  return 'vitals';
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Inline "add to calendar" mini-form that appears when the button is clicked */
function AddToCalendar({ title, onAdd, onClose }) {
  const [date, setDate] = useState(todayIso());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [repeat, setRepeat] = useState('once');

  const submit = () => {
    const type = guessEventType(title);
    const dates = [];
    if (repeat === 'once') {
      dates.push(date);
    } else {
      const start = new Date(date);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }
    }
    dates.forEach(d =>
      onAdd({ title, time: startTime, date: d, type, subtitle: `${startTime}–${endTime} · AI summary` })
    );
    onClose();
  };

  return (
    <div className={styles.calendarPopover}>
      <div className={styles.calendarTitle}>📅 Add to calendar</div>
      <div className={styles.calendarTask}>{title}</div>
      <div className={styles.calendarFields}>
        <input type="date" className={styles.calendarInput} value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div className={styles.calendarTimeRow}>
        <div className={styles.calendarTimeGroup}>
          <label className={styles.calendarTimeLabel}>Start</label>
          <input type="time" className={styles.calendarInput} value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <span className={styles.calendarTimeSep}>→</span>
        <div className={styles.calendarTimeGroup}>
          <label className={styles.calendarTimeLabel}>End</label>
          <input type="time" className={styles.calendarInput} value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
      </div>
      <div className={styles.calendarRepeat}>
        <label>
          <input type="radio" name="repeat" value="once" checked={repeat === 'once'} onChange={() => setRepeat('once')} />
          {' '}Once
        </label>
        <label>
          <input type="radio" name="repeat" value="daily" checked={repeat === 'daily'} onChange={() => setRepeat('daily')} />
          {' '}Daily this week
        </label>
      </div>
      <div className={styles.calendarActions}>
        <button className={styles.calendarCancel} onClick={onClose}>Cancel</button>
        <button className={styles.calendarConfirm} onClick={submit}>Add to calendar</button>
      </div>
    </div>
  );
}

function ActionItem({ text, icon, tagLabel, onAddToCalendar, onAdded }) {
  const [open, setOpen] = useState(false);

  const handleAdd = (event) => {
    onAddToCalendar(event);
    onAdded(text);
    setOpen(false);
  };

  return (
    <li className={styles.actionItem}>
      <div className={styles.actionRow}>
        {icon && <span className={styles.checkbox}>{icon}</span>}
        {tagLabel && <span className={styles.tag}>{tagLabel}</span>}
        <span className={styles.actionText}>{text}</span>
        {onAddToCalendar && (
          <button
            className={styles.calBtn}
            onClick={() => setOpen(v => !v)}
            aria-label="Add to calendar"
          >
            📅 Add to calendar
          </button>
        )}
      </div>
      {open && (
        <AddToCalendar
          title={text}
          onAdd={handleAdd}
          onClose={() => setOpen(false)}
        />
      )}
    </li>
  );
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
                  <button className={styles.deleteBtn} onClick={() => onDelete(n.id)} title="Delete" aria-label="Delete note">×</button>
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

/**
 * Returns true if actionText is already represented by an existing calendar event.
 * Matches on exact title (case-insensitive) since AI-added events use the action
 * item text verbatim as the title.
 */
function isAlreadyScheduled(actionText, events) {
  if (!events?.length) return false;
  const needle = actionText.trim().toLowerCase();
  return events.some(ev => ev.title?.trim().toLowerCase() === needle);
}

export default function DoctorNote({ notes = [], summary, loadingSummary, onDeleteNote, onAddToCalendar, events = [] }) {
  // Session-level additions (disappear on refresh, but calendar check covers persistence)
  const [addedItems, setAddedItems] = useState(new Set());
  const markAdded = (text) => setAddedItems(prev => new Set([...prev, text]));

  const isHidden = (text) => addedItems.has(text) || isAlreadyScheduled(text, events);

  const meaningfulNotes = notes.filter(n => isMeaningful(n.body));
  const hasMeaningfulNotes = meaningfulNotes.length > 0;
  const hasSummary = summary?.structured &&
    (summary.structured.summary || summary.structured.action_items?.length);

  if (!hasMeaningfulNotes && !loadingSummary) return null;

  const structured = summary?.structured || {};
  const firstNote = meaningfulNotes[0] || notes[0];
  const authors = [...new Set(meaningfulNotes.map(n => n.author).filter(Boolean))];
  const authorLabel = authors.join(', ') || 'Doctor';
  const dateLabel = firstNote?.date || '';

  return (
    <aside className={styles.note}>
      <span className={styles.icon} aria-hidden>⚕</span>
      <div className={styles.body}>

        <div className={styles.title}>
          Doctor's notes this week
          {authorLabel && (
            <span className={styles.titleMeta}>
              {' · '}{authorLabel}{dateLabel ? `, ${dateLabel}` : ''}
            </span>
          )}
        </div>

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
                  {structured.action_items?.filter(item => !isHidden(item)).map((item, i) => (
                    <ActionItem key={`action-${i}`} text={item} icon="☐" onAddToCalendar={onAddToCalendar} onAdded={markAdded} />
                  ))}
                  {structured.concerns?.filter(item => !isHidden(item)).map((item, i) => (
                    <ActionItem key={`concern-${i}`} text={item} tagLabel="Watch" onAddToCalendar={null} onAdded={markAdded} />
                  ))}
                  {structured.vitals?.filter(item => !isHidden(item)).map((item, i) => (
                    <ActionItem key={`vital-${i}`} text={item} tagLabel="Vitals" onAddToCalendar={onAddToCalendar} onAdded={markAdded} />
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : hasMeaningfulNotes ? (
          <p className={styles.text}>{meaningfulNotes[0].body}</p>
        ) : null}

        <SourceNotes notes={meaningfulNotes} onDelete={onDeleteNote} />
      </div>
    </aside>
  );
}
