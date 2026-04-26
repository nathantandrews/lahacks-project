import styles from './LandingPage.module.css';

export default function LandingPage({ onEnter, onStartTour, isLeaving }) {
  return (
    <div className={`${styles.container} ${isLeaving ? styles.leaving : ''}`}>
      <div className={styles.mesh} />
      
      <main className={styles.hero}>
        <div className={styles.brandContainer}>
          <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span className={styles.brandText}>Pulse</span>
        </div>
        
        <hr className={styles.divider} />

        <h1 className={styles.title}>
          Intelligence for <br />
          <span className={styles.accent}>Family Caregiving.</span>
        </h1>

        <div className={styles.mission}>
          AI-driven coordination for complex family health.
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={onEnter}>
            Enter Dashboard
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <path d="M5 12h14m-7-7 7 7-7 7" />
            </svg>
          </button>
          
          <button className={styles.secondaryBtn} onClick={onStartTour}>
            Take the Interactive Tour
          </button>
        </div>

        <div className={styles.footerText}>
          Empowering families with clinical-grade coordination.
        </div>

        <div className={styles.miniSpacer} />

        <div className={styles.badge}>
          <span className={styles.pulseDot} />
          Powered by Fetch.ai Agentverse
        </div>
      </main>
    </div>
  );
}
