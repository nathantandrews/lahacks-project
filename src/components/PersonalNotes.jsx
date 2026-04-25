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

function NoteItem({ note, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
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
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(note.body);
    setEditing(false);
  };

  const saveEdit = () => {
    const text = draft.trim();
    if (!text) return;
    if (text !== note.body) onEdit(note.id, text);
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
          <textarea
            ref={textareaRef}
            className={styles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
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

  return (
    <li className={styles.item}>
      <div className={styles.itemBody}>
        <p className={styles.itemText}>{note.body}</p>
        <span className={styles.itemMeta}>
          {formatTimestamp(note.updatedAt || note.createdAt)}
          {note.updatedAt && ' · edited'}
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

export default function PersonalNotes({ notes, onAdd, onDelete, onEdit }) {
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd({
      id: `pn-${Date.now()}`,
      body: text,
      createdAt: new Date().toISOString(),
    });
    setDraft('');
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
      <div className={styles.composer}>
        <textarea
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note or reminder…"
          rows={2}
        />
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
            <NoteItem key={n.id} note={n} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </ul>
      )}
    </section>
  );
}
