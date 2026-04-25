import styles from './MedicationGrid.module.css';

export default function MedicationGrid({ medications }) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        CURRENT MEDICATIONS · {medications.length}
      </div>
      <div className={styles.grid}>
        {medications.map((m) => (
          <article key={m.id} className={styles.card}>
            <div className={styles.name}>{m.name}</div>
            <div className={styles.detail}>
              {m.dose} · {m.schedule}
            </div>
            {m.withFood && (
              <div className={styles.withFood}>
                <span className={styles.foodDot} aria-hidden /> With food
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
