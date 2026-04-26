import styles from './PatientSummary.module.css';

export default function PatientSummary({ patient, conditions, onAddCondition, onArchive, onDelete }) {
  const isArchived = patient.status === 'archived';

  return (
    <section className={`${styles.summary} ${isArchived ? styles.archived : ''}`}>
      <div className={styles.identity}>
        <div className={styles.label}>PATIENT</div>
        <h2 className={styles.name}>
          {patient.fullName}
          {isArchived && <span className={styles.archivedBadge}>ARCHIVED</span>}
        </h2>
        <div className={styles.meta}>
          {patient.age} years · DOB {patient.dob} · Primary: {patient.primaryDoctor}
        </div>
        <div className={styles.patientActions}>
          <button className={styles.actionBtn} onClick={onArchive}>
            {isArchived ? 'Restore Patient' : 'Archive Patient'}
          </button>
          <button className={`${styles.actionBtn} ${styles.danger}`} onClick={onDelete}>
            Delete All Data
          </button>
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
