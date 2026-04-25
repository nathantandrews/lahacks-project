import styles from './MedicalHistory.module.css';

export default function MedicalHistory({ patient, items }) {
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
            <li key={item.id || item._id || i} className={styles.item}>
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
                <p className={styles.body}>{item.dose} · {item.schedule}</p>
              ) : null}

              {item.structured && Object.keys(item.structured).filter(k => k !== 'summary').length > 0 && (
                <div className={styles.analysis}>
                  <div className={styles.analysisTitle}>AI Insights & Details</div>
                  <ul className={styles.analysisList}>
                    {Object.entries(item.structured)
                      .filter(([key]) => key !== 'summary')
                      .map(([key, value]) => (
                        <li key={key}>
                          <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}:</strong>{' '}
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {item.followUp && (
                <div className={styles.followUp}>
                  <strong>Follow-up:</strong> {item.followUp}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
