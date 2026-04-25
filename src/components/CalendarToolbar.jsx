import styles from './CalendarToolbar.module.css';

export default function CalendarToolbar({
  rangeLabel,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onAddEvent,
  onUploadNote,
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <button className={styles.navBtn} onClick={onPrev} aria-label="Previous">‹</button>
        <span className={styles.range}>{rangeLabel}</span>
        <button className={styles.navBtn} onClick={onNext} aria-label="Next">›</button>
        <button className={styles.todayBtn} onClick={onToday}>Today</button>
      </div>
      <div className={styles.right}>
        <button className={styles.actionBtn} onClick={onUploadNote}>Upload doctor's note</button>
        <button className={styles.actionBtn} onClick={onAddEvent}>+ Add Event</button>
        <div className={styles.viewSwitch}>
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              className={`${styles.viewBtn} ${view === v ? styles.active : ''}`}
              onClick={() => onViewChange(v)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
