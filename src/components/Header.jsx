import AddMenu from './AddMenu';
import styles from './Header.module.css';

export default function Header({ user, addMenuItems, view, onViewChange, onStartTutorial, ref }) {
  return (
    <header ref={ref} className={styles.header}>
      <div className={styles.left}>
        <span className={styles.plus} aria-hidden>
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2,12 6,12 9,6 12,18 15,9 17,12 22,12" />
          </svg>
        </span>
        <span className={styles.title}>Pulse</span>
      </div>
      <div className={styles.right}>
        <button 
          type="button" 
          className={styles.tutorialBtn} 
          onClick={onStartTutorial}
          title="Start interactive tour"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Help
        </button>
        {onViewChange && (
          <button
            type="button"
            data-tour="history-nav"
            className={`${styles.navLink} ${view === 'history' ? styles.navLinkActive : ''}`}
            onClick={() => onViewChange(view === 'history' ? 'dashboard' : 'history')}
            aria-label={view === 'history' ? 'Back to dashboard' : 'Medical History'}
          >
            <svg
              className={styles.navIcon}
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
            <span className={styles.navLabel}>
              {view === 'history' ? 'Back to dashboard' : 'Medical History'}
            </span>
          </button>
        )}
        {addMenuItems && <AddMenu items={addMenuItems} />}
        <span className={styles.avatar}>{user.initials}</span>
        <span className={styles.userName}>{user.name}</span>
      </div>
    </header>
  );
}
