import styles from './MedicationGrid.module.css';

export default function MedicationGrid({
  medications,
  onAddMedication,
  onEditMedication,
  onDeleteMedication,
}) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.label}>CURRENT MEDICATIONS · {medications.length}</span>
        <button className={styles.addBtn} onClick={onAddMedication}>+ Add medication</button>
      </div>
      <div className={styles.grid}>
        {medications.map((m) => (
          <article key={m.id} className={styles.card}>
            <div className={styles.cardActions}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => onEditMedication(m)}
                aria-label={`Edit ${m.name}`}
              >
                ✎
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => onDeleteMedication(m.id)}
                aria-label={`Delete ${m.name}`}
              >
                ×
              </button>
            </div>
            <div className={styles.name}>{m.name}</div>
            <div className={styles.detailRow}>
              <span className={styles.detail}>
                {m.dose} · {m.schedule}
              </span>
              {m.withFood && (
                <span className={styles.withFood}>
                  <span className={styles.foodDot} aria-hidden /> With food
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
