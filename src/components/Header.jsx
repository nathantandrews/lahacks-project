import AddMenu from './AddMenu';
import styles from './Header.module.css';

export default function Header({ user, addMenuItems, view, onViewChange, ref }) {
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
        {onViewChange && (
          <button
            type="button"
            className={`${styles.navLink} ${view === 'history' ? styles.navLinkActive : ''}`}
            onClick={() => onViewChange(view === 'history' ? 'dashboard' : 'history')}
          >
            {view === 'history' ? 'Back to dashboard' : 'Medical History'}
          </button>
        )}
        {addMenuItems && <AddMenu items={addMenuItems} />}
        <span className={styles.avatar}>{user.initials}</span>
        <span className={styles.userName}>{user.name}</span>
      </div>
    </header>
  );
}
