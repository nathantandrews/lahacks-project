import { useEffect, useRef, useState } from 'react';
import styles from './PersonalNotes.module.css';

function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatReminder(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
}

// datetime-local needs "YYYY-MM-DDTHH:mm" in the *local* timezone.
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function NoteItem({ note, onDelete, onEdit, onToggleDone, now }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [draftRemindAt, setDraftRemindAt] = useState(isoToLocalInput(note.remindAt));
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(note.body);
    setDraftRemindAt(isoToLocalInput(note.remindAt));
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(note.body);
    setDraftRemindAt(isoToLocalInput(note.remindAt));
    setEditing(false);
  };

  const saveEdit = () => {
    const text = draft.trim();
    if (!text) return;
    const nextRemindAt = localInputToIso(draftRemindAt);
    const bodyChanged = text !== note.body;
    const remindChanged = (nextRemindAt || null) !== (note.remindAt || null);
    if (bodyChanged || remindChanged) onEdit(note.id, { body: text, remindAt: nextRemindAt });
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    }
  };

  if (editing) {
    return (
      <li className={styles.item}>
        <div className={styles.itemBody}>
          <div className={styles.noteBox}>
            <textarea
              ref={textareaRef}
              className={styles.boxedInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />
            <div className={styles.noteBoxFooter}>
              <label className={styles.reminderLabel}>
                <span className={styles.reminderIcon}>⏰</span>
                <span className={styles.reminderText}>Remind me</span>
                <input
                  type="datetime-local"
                  className={styles.reminderInput}
                  value={draftRemindAt}
                  onChange={(e) => setDraftRemindAt(e.target.value)}
                />
              </label>
              {draftRemindAt && (
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => setDraftRemindAt('')}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className={styles.editActions}>
            <button type="button" className={styles.secondaryButton} onClick={cancelEdit}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.addButton}
              onClick={saveEdit}
              disabled={!draft.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </li>
    );
  }

  const remindMs = note.remindAt ? new Date(note.remindAt).getTime() : null;
  const isDue = remindMs != null && remindMs <= now && !note.done;

  const isTask = note.type === 'task';

  return (
    <li className={`${styles.item} ${note.done ? styles.itemDone : ''} ${isTask ? styles.itemTask : styles.itemNote}`}>
      {isTask ? (
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={!!note.done}
          onChange={() => onToggleDone(note.id)}
          aria-label={note.done ? 'Mark as not done' : 'Mark as done'}
        />
      ) : (
        <span className={styles.noteIcon} aria-hidden>📝</span>
      )}
      <div className={styles.itemBody}>
        <p className={styles.itemText}>{note.body}</p>
        <span className={styles.itemMeta}>
          {formatTimestamp(note.updatedAt || note.createdAt)}
          {note.updatedAt && ' · edited'}
          {note.done && ' · done'}
          {note.remindAt && (
            <span className={isDue ? styles.reminderBadgeDue : styles.reminderBadge}>
              ⏰ {isDue ? 'Due' : 'Reminder'} {formatReminder(note.remindAt)}
            </span>
          )}
        </span>
      </div>
      <div className={styles.itemActions}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={startEdit}
          aria-label="Edit note"
        >
          ✎
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => onDelete(note.id)}
          aria-label="Delete note"
        >
          ×
        </button>
      </div>
    </li>
  );
}

export default function PersonalNotes({ notes, onAdd, onDelete, onEdit, onToggleDone }) {
  const [draft, setDraft] = useState('');
  const [draftRemindAt, setDraftRemindAt] = useState('');
  const notifiedRef = useRef(new Set());
  const [now, setNow] = useState(() => Date.now());
  const supportsNotifications =
    typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState(() =>
    supportsNotifications ? Notification.permission : 'unsupported',
  );

  const requestPermission = () => {
    if (!supportsNotifications) return;
    Notification.requestPermission()
      .then((p) => setPermission(p))
      .catch(() => {});
  };

  // Tick every 5s so "Due" badges flip and reminder notifications fire promptly.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  // Fire a browser notification once when a reminder becomes due.
  useEffect(() => {
    if (!supportsNotifications) return;
    for (const n of notes) {
      if (!n.remindAt || n.done || notifiedRef.current.has(n.id)) continue;
      if (new Date(n.remindAt).getTime() > now) continue;

      if (Notification.permission === 'granted') {
        try {
          new Notification('Reminder', { body: n.body });
        } catch {
          // ignore notification errors (e.g. unsupported in iframe)
        }
        notifiedRef.current.add(n.id);
      } else if (Notification.permission === 'denied') {
        // Won't be able to fire — stop retrying.
        notifiedRef.current.add(n.id);
      }
      // 'default': leave unmarked so we retry once the user decides.
    }
  });

  const dueReminders = notes.filter(
    (n) => !n.done && n.remindAt && new Date(n.remindAt).getTime() <= now,
  );

  const [entryType, setEntryType] = useState('note'); // 'note' | 'task'

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    const remindAtIso = localInputToIso(draftRemindAt);
    if (
      remindAtIso &&
      supportsNotifications &&
      Notification.permission === 'default'
    ) {
      requestPermission();
    }
    onAdd({
      id: `pn-${Date.now()}`,
      body: text,
      type: entryType,
      createdAt: new Date().toISOString(),
      remindAt: remindAtIso,
    });
    setDraft('');
    setDraftRemindAt('');
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Personal notes & reminders</h2>
      </div>
      {supportsNotifications && permission === 'default' && (
        <div className={styles.permissionBanner}>
          <span>Allow desktop notifications to get a banner when a reminder is due.</span>
          <button
            type="button"
            className={styles.linkButton}
            onClick={requestPermission}
          >
            Enable
          </button>
        </div>
      )}
      {supportsNotifications && permission === 'denied' && dueReminders.length > 0 && (
        <div className={styles.permissionBanner}>
          <span>
            Desktop notifications are blocked for this site. Due reminders still show below.
          </span>
        </div>
      )}
      {dueReminders.length > 0 && (
        <div className={styles.dueBanner}>
          <strong className={styles.dueBannerTitle}>
            ⏰ {dueReminders.length === 1 ? 'Reminder due' : `${dueReminders.length} reminders due`}
          </strong>
          <ul className={styles.dueList}>
            {dueReminders.map((n) => (
              <li key={n.id} className={styles.dueRow}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={false}
                  onChange={() => onToggleDone(n.id)}
                  aria-label="Mark reminder as done"
                />
                <span className={styles.dueRowText}>{n.body}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={styles.composer}>
        {/* Note vs Task toggle */}
        <div className={styles.typeToggle}>
          <button
            type="button"
            className={`${styles.typeBtn} ${entryType === 'note' ? styles.typeBtnActive : ''}`}
            onClick={() => setEntryType('note')}
          >
            📝 Note
          </button>
          <button
            type="button"
            className={`${styles.typeBtn} ${entryType === 'task' ? styles.typeBtnActive : ''}`}
            onClick={() => setEntryType('task')}
          >
            ✅ Task
          </button>
        </div>
        <div className={styles.noteBox}>
          <textarea
            className={styles.boxedInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={entryType === 'task' ? 'Add a task or to-do…' : 'Add a note or observation…'}
            rows={2}
          />
          <div className={styles.noteBoxFooter}>
            <label className={styles.reminderLabel}>
              <span className={styles.reminderIcon}>⏰</span>
              <span className={styles.reminderText}>Remind me</span>
              <input
                type="datetime-local"
                className={styles.reminderInput}
                value={draftRemindAt}
                onChange={(e) => setDraftRemindAt(e.target.value)}
              />
            </label>
            {draftRemindAt && (
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setDraftRemindAt('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={submit}
          disabled={!draft.trim()}
        >
          Add
        </button>
      </div>
      {notes.length === 0 ? (
        <p className={styles.empty}>No notes yet — jot down anything you want to remember.</p>
      ) : (
        <ul className={styles.list}>
          {notes.map((n) => (
            <NoteItem
              key={n.id}
              note={n}
              onDelete={onDelete}
              onEdit={onEdit}
              onToggleDone={onToggleDone}
              now={now}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
