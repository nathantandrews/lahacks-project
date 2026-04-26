import styles from './PatientTabs.module.css';

export default function PatientTabs({ patients, selectedId, onSelect, onAdd, ref }) {
  return (
    <nav ref={ref} className={styles.tabs}>
      {patients.map((p) => (
        <button
          key={p.id}
          className={`${styles.tab} ${p.id === selectedId ? styles.active : ''}`}
          onClick={() => onSelect(p.id)}
        >
          <span
            className={styles.avatar}
            style={{ background: p.avatarColor }}
          >
            {p.initials}
          </span>
          <span className={styles.label}>{p.displayName}</span>
        </button>
      ))}
      <button className={styles.add} onClick={onAdd}>+ Add</button>
    </nav>
  );
}
