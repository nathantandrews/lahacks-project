import { useState, useEffect, useMemo } from 'react';
import styles from './Tutorial.module.css';

const STEPS = [
  {
    target: '[data-tour="tabs"]',
    title: 'Switch Patients',
    content: 'Quickly toggle between family members or patients to view their specific care plan.',
    position: 'bottom'
  },
  {
    target: '[data-tour="summary-edit"]',
    title: 'Patient Management',
    content: 'Manage profiles, archive records, or delete data through the unified Edit modal.',
    position: 'bottom-left'
  },
  {
    target: '[data-tour="calendar"]',
    title: 'Conflict-Aware Calendar',
    content: 'View the daily care plan. Pulse automatically clusters overlapping events to highlight potential care conflicts.',
    position: 'left'
  },
  {
    target: '[data-tour="history-nav"]',
    title: 'Deep Medical History',
    content: 'Switch to the History view to see a chronological timeline of every visit, note, and medication change.',
    position: 'bottom'
  },
  {
    target: '[data-tour="chat"]',
    title: 'Pulse Chat',
    content: 'Ask natural language questions about the patient\'s record for instant answers.',
    position: 'top-right'
  }
];

export default function Tutorial({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const step = STEPS[currentStep];

  useEffect(() => {
    const updateCoords = () => {
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    return () => window.removeEventListener('resize', updateCoords);
  }, [currentStep, step.target]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => onComplete();

  const tooltipStyle = useMemo(() => {
    if (!coords.width) return { opacity: 0 };

    const margin = 24;
    const padding = 16;
    const tooltipWidth = 300;
    const tooltipHeight = 200; // Estimated max height

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'bottom':
        top = coords.top + coords.height + margin;
        left = coords.left + coords.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom-left':
        top = coords.top + coords.height + margin;
        left = coords.left + coords.width - tooltipWidth;
        break;
      case 'top-right':
        top = coords.top - tooltipHeight - margin;
        left = coords.left + coords.width + margin;
        break;
      case 'left':
        top = coords.top + coords.height / 2 - 80;
        left = coords.left - tooltipWidth - margin;
        break;
      case 'right':
        top = coords.top + coords.height / 2 - 80;
        left = coords.left + coords.width + margin;
        break;
      default:
        top = coords.top + coords.height + margin;
        left = coords.left;
    }

    // Clamp to viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, viewportHeight - 150 - padding));

    return { top, left, opacity: 1 };
  }, [coords, step.position]);

  return (
    <div className={styles.overlay}>
      <div 
        className={styles.spotlight} 
        style={{
          top: coords.top - 8,
          left: coords.left - 8,
          width: coords.width + 16,
          height: coords.height + 16
        }}
      />
      
      <div 
        className={styles.tooltip}
        style={tooltipStyle}
      >
        <div className={styles.stepIndicator}>Step {currentStep + 1} of {STEPS.length}</div>
        <h3 className={styles.title}>{step.title}</h3>
        <p className={styles.content}>{step.content}</p>
        
        <div className={styles.actions}>
          <button className={styles.skip} onClick={handleSkip}>Skip</button>
          <button className={styles.next} onClick={handleNext}>
            {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
