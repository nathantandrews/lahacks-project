import { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './Tutorial.module.css';

const STEPS = [
  {
    target: '[data-tour="second-patient"]',
    title: 'Switch Patients',
    content: 'Click on a patient to instantly view their specific care plan and records.',
    position: 'bottom',
    requireAction: 'click'
  },
  {
    target: '[data-tour="summary-edit"]',
    title: 'Manage Records',
    content: 'Try clicking the Edit pencil to see how you can update Margaret\'s profile or archive her data.',
    position: 'bottom-left',
    requireAction: 'click'
  },
  {
    target: '[data-tour="edit-form"]',
    title: 'Profile Details',
    content: 'Update the patient\'s clinical profile here. You can change their name, age, or primary physician at any time.',
    position: 'right'
  },
  {
    target: '[data-tour="edit-save"]',
    title: 'Save & Close',
    content: 'Click "Save Changes" to commit your updates and return to the main dashboard.',
    position: 'left',
    requireAction: 'click'
  },
  {
    target: '[data-tour="upload-note"]',
    title: 'Upload Clinical Notes',
    content: 'Digitize paper records instantly. Upload PDFs or photos of doctor\'s notes, and our AI will extract key medical insights.',
    position: 'right'
  },
  {
    target: '[data-tour="doctor-notes"]',
    title: 'AI Clinical Summary',
    content: 'Pulse automatically cross-references all notes to provide a cohesive summary of the patient\'s clinical status.',
    position: 'right'
  },
  {
    target: '[data-tour="calendar"]',
    title: 'Smart Calendar',
    content: 'Observe the clustered events. Pulse helps you spot overlapping appointments at a glance.',
    position: 'left'
  },
  {
    target: '[data-tour="history-nav"]',
    title: 'Visit History',
    content: 'Click "Medical History" to explore the chronological timeline of all clinical interactions.',
    position: 'bottom',
    requireAction: 'click'
  },
  {
    target: '[data-tour="chat"]',
    title: 'Ask Pulse AI',
    content: 'Open the chat and ask a question like "What is her blood pressure history?" for instant clinical answers.',
    position: 'top-right',
    requireAction: 'click'
  }
];

export default function Tutorial({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);

  const step = STEPS[currentStep];

  const updateCoords = useCallback(() => {
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [step.target]);

  useEffect(() => {
    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    
    // Auto-advance on required action
    const handleInteraction = (e) => {
      const el = document.querySelector(step.target);
      if (step.requireAction === 'click' && el && el.contains(e.target)) {
        // Delay slightly to let the UI action happen first
        setTimeout(() => {
          if (currentStep < STEPS.length - 1) {
            setCurrentStep(s => s + 1);
          } else {
            onComplete();
          }
        }, 300);
      }
    };

    if (step.requireAction) {
      document.addEventListener('mousedown', handleInteraction);
    }

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
      document.removeEventListener('mousedown', handleInteraction);
    };
  }, [currentStep, step.target, step.requireAction, updateCoords, onComplete]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => onComplete();

  const tooltipStyle = useMemo(() => {
    if (!coords.width || !isVisible) return { opacity: 0, transform: 'translateY(10px)' };

    const margin = 24;
    const padding = 20;
    const tooltipWidth = 320;
    const tooltipHeight = 220;

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
        top = coords.top + coords.height / 2 - 100;
        left = coords.left - tooltipWidth - margin;
        break;
      case 'right':
        top = coords.top + coords.height / 2 - 100;
        left = coords.left + coords.width + margin;
        break;
      default:
        top = coords.top + coords.height + margin;
        left = coords.left;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    left = Math.max(padding, Math.min(left, vw - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, vh - tooltipHeight - padding));

    return { top, left, opacity: 1, transform: 'translateY(0)' };
  }, [coords, isVisible, step.position]);

  return (
    <div className={styles.overlay}>
      <div 
        className={styles.spotlight} 
        style={{
          top: coords.top - 8,
          left: coords.left - 8,
          width: coords.width + 16,
          height: coords.height + 16,
          opacity: isVisible ? 1 : 0
        }}
      >
        <div className={styles.pulseRing} />
      </div>
      
      <div 
        className={styles.tooltip}
        style={tooltipStyle}
      >
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} 
          />
        </div>
        
        <div className={styles.stepHeader}>
          <span className={styles.stepCount}>Interaction {currentStep + 1}</span>
          {step.requireAction && <span className={styles.actionBadge}>Action Required</span>}
        </div>
        
        <h3 className={styles.title}>{step.title}</h3>
        <p className={styles.content}>{step.content}</p>
        
        <div className={styles.actions}>
          <button className={styles.skip} onClick={handleSkip}>Skip Tour</button>
          {!step.requireAction && (
            <button className={styles.next} onClick={handleNext}>
              {currentStep === STEPS.length - 1 ? 'Finish' : 'Got it'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
