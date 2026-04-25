import styles from './Header.module.css';

export default function Header({ user }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.plus}>+</span>
        <span className={styles.title}>Caregiver hub</span>
      </div>
      <div className={styles.right}>
        <span className={styles.avatar}>{user.initials}</span>
        <span className={styles.userName}>{user.name}</span>
      </div>
    </header>
  );
}
