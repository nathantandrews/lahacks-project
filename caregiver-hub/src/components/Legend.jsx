import styles from './Legend.module.css';

export default function Legend({ items }) {
  return (
    <div className={styles.legend}>
      {items.map((item) => (
        <span key={item.type} className={styles.item}>
          <span className={`${styles.swatch} ${styles[item.type]}`} />
          <span className={styles.label}>{item.label}</span>
        </span>
      ))}
    </div>
  );
}
