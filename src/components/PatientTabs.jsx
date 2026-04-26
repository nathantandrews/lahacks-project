import styles from './PatientTabs.module.css';

export default function PatientTabs({ patients, selectedId, onSelect, onAdd }) {
  const active = patients.filter(p => p.status !== 'archived');
  const archived = patients.filter(p => p.status === 'archived');

  const renderTab = (p) => (
    <button
      key={p.id}
      className={`${styles.tab} ${p.id === selectedId ? styles.active : ''} ${p.status === 'archived' ? styles.archived : ''}`}
      onClick={() => onSelect(p.id)}
    >
      <span
        className={styles.avatar}
        style={{ background: p.avatarColor }}
      >
        {p.initials}
      </span>
      <span className={styles.label}>
        {p.displayName}
        {p.status === 'archived' && <span className={styles.archivedIndicator}> (A)</span>}
      </span>
    </button>
  );

  return (
    <nav data-tour="tabs" className={styles.tabs}>
      <div className={styles.sectionLabel}>ACTIVE</div>
      {active.map(renderTab)}

      {archived.length > 0 && (
        <>
          <div className={`${styles.sectionLabel} ${styles.archivedLabel}`}>ARCHIVED</div>
          {archived.map(renderTab)}
        </>
      )}

      <button className={styles.add} onClick={onAdd}>+ Add patient</button>
    </nav>
  );
}
