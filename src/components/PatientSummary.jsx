import styles from './PatientSummary.module.css';

export default function PatientSummary({ patient, conditions, onAddCondition, onEdit }) {
  const isArchived = patient.status === 'archived';

  return (
    <section className={`${styles.summary} ${isArchived ? styles.archived : ''}`}>
      <div className={styles.identity}>
        <div className={styles.headerRow}>
          <div className={styles.label}>PATIENT</div>
          <button className={styles.editBtn} onClick={onEdit} title="Edit patient details">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
        </div>
        <h2 className={styles.name}>
          {patient.fullName}
          {isArchived && <span className={styles.archivedBadge}>ARCHIVED</span>}
        </h2>
        <div className={styles.meta}>
          {patient.age} years · DOB {patient.dob} · Primary: {patient.primaryDoctor}
        </div>
      </div>
      <div className={styles.conditions}>
        <div className={styles.conditionsHeader}>
          <span className={styles.label}>ACTIVE CONDITIONS</span>
          <button className={styles.addBtn} onClick={onAddCondition}>+ Add condition</button>
        </div>
        <div className={styles.chips}>
          {conditions.map((c) => (
            <span key={c.id} className={`${styles.chip} ${styles[c.tone]}`}>
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
