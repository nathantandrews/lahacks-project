// Mock data shaped to match the caregiver-hub mockup.
// Replace with real API calls later — keep the shape stable.

export const currentUser = {
  name: 'Jamie L.',
  initials: 'JL',
};

export const patients = [
  {
    id: 'margaret',
    displayName: 'Mom (Margaret)',
    fullName: 'Margaret Williams',
    initials: 'MW',
    avatarColor: 'var(--avatar-margaret)',
    age: 72,
    dob: '03/14/1953',
    primaryDoctor: 'Dr. Chen',
  },
  {
    id: 'david',
    displayName: 'Dad (David)',
    fullName: 'David Williams',
    initials: 'DW',
    avatarColor: 'var(--avatar-david)',
    age: 74,
    dob: '07/02/1951',
    primaryDoctor: 'Dr. Patel',
  },
  {
    id: 'ethan',
    displayName: 'Ethan (son)',
    fullName: 'Ethan Williams',
    initials: 'EL',
    avatarColor: 'var(--avatar-ethan)',
    age: 9,
    dob: '11/22/2016',
    primaryDoctor: 'Dr. Rivera',
  },
];

export const conditions = {
  margaret: [
    { id: 'c1', label: 'Type 2 diabetes', tone: 'diabetes' },
    { id: 'c2', label: 'Hypertension', tone: 'hypertension' },
    { id: 'c3', label: 'Early-stage CKD', tone: 'ckd' },
    { id: 'c4', label: 'Osteoarthritis', tone: 'ortho' },
  ],
  david: [
    { id: 'c5', label: 'Hypertension', tone: 'hypertension' },
    { id: 'c6', label: 'High cholesterol', tone: 'diabetes' },
  ],
  ethan: [
    { id: 'c7', label: 'Asthma', tone: 'ckd' },
    { id: 'c8', label: 'Seasonal allergies', tone: 'ortho' },
  ],
};

export const medications = {
  margaret: [
    { id: 'm1', name: 'Metformin',    dose: '500mg',   schedule: '2x daily',    withFood: true, startDate: '2026-01-15', refillDate: '2026-05-10' },
    { id: 'm2', name: 'Lisinopril',   dose: '10mg',    schedule: '1x morning', startDate: '2025-11-20', refillDate: '2026-05-15' },
    { id: 'm3', name: 'Atorvastatin', dose: '20mg',    schedule: '1x evening', startDate: '2025-06-01', refillDate: '2026-06-01' },
    { id: 'm4', name: 'Aspirin',      dose: '81mg',    schedule: '1x daily',    withFood: true, startDate: '2024-03-10', refillDate: '2026-09-10' },
    { id: 'm5', name: 'Vitamin D3',   dose: '2000 IU', schedule: '1x daily',    withFood: true, startDate: '2023-10-05', refillDate: '2026-10-05' },
    { id: 'm6', name: 'Tylenol',      dose: '500mg',   schedule: 'as needed', startDate: '2026-04-10', refillDate: '2026-07-10', endDate: '2026-05-10' },
  ],
  david: [
    { id: 'm7', name: 'Lisinopril', dose: '20mg', schedule: '1x morning' },
    { id: 'm8', name: 'Rosuvastatin', dose: '10mg', schedule: '1x evening' },
  ],
  ethan: [
    { id: 'm9', name: 'Albuterol inhaler', dose: '90mcg', schedule: 'as needed' },
    { id: 'm10', name: 'Cetirizine', dose: '5mg', schedule: '1x daily' },
  ],
};

// Event types map to colors defined in tokens.css:
// 'medication' | 'appointment' | 'vitals' | 'activity' | 'meal' | 'lab'
export const events = {
  margaret: [
    // Mon Apr 14
    { id: 'e1',  date: '2026-04-20', time: '08:00', title: 'Metformin',    type: 'medication' },
    { id: 'e2',  date: '2026-04-20', time: '08:00', title: 'BP check',     type: 'vitals' },
    { id: 'e3',  date: '2026-04-20', time: '09:00', title: 'Morning walk', type: 'activity' },
    { id: 'e4',  date: '2026-04-20', time: '12:00', title: 'Lunch + log',  type: 'meal' },
    { id: 'e5',  date: '2026-04-20', time: '18:00', title: 'Dinner meds',  type: 'medication' },
    { id: 'e6',  date: '2026-04-20', time: '21:00', title: 'Atorvastatin', type: 'medication' },
    // Tue Apr 15
    { id: 'e7',  date: '2026-04-21', time: '08:00', title: 'Metformin',    type: 'medication' },
    { id: 'e8',  date: '2026-04-21', time: '08:00', title: 'BP check',     type: 'vitals' },
    { id: 'e9',  date: '2026-04-21', time: '12:00', title: 'Lunch + log',  type: 'meal' },
    { id: 'e10', date: '2026-04-21', time: '14:00', title: 'PT session',   subtitle: 'Ortho · knee', type: 'appointment' },
    { id: 'e11', date: '2026-04-21', time: '18:00', title: 'Dinner meds',  type: 'medication' },
    { id: 'e12', date: '2026-04-21', time: '21:00', title: 'Atorvastatin', type: 'medication' },
    // Wed Apr 16
    { id: 'e13', date: '2026-04-22', time: '08:00', title: 'Metformin',    type: 'medication' },
    { id: 'e14', date: '2026-04-22', time: '08:00', title: 'BP check',     type: 'vitals' },
    { id: 'e15', date: '2026-04-22', time: '09:00', title: 'Dr. Chen',     subtitle: 'Nephrology', type: 'appointment' },
    { id: 'e16', date: '2026-04-22', time: '12:00', title: 'Lunch + log',  type: 'meal' },
    { id: 'e17', date: '2026-04-22', time: '18:00', title: 'Dinner meds',  type: 'medication' },
    { id: 'e18', date: '2026-04-22', time: '21:00', title: 'Atorvastatin', type: 'medication' },
    // Thu Apr 17
    { id: 'e19', date: '2026-04-23', time: '08:00', title: 'Metformin',    type: 'medication' },
    { id: 'e20', date: '2026-04-23', time: '08:00', title: 'BP check',     type: 'vitals' },
    { id: 'e21', date: '2026-04-23', time: '09:00', title: 'Morning walk', type: 'activity' },
    { id: 'e22', date: '2026-04-23', time: '12:00', title: 'Lunch + log',  type: 'meal' },
    { id: 'e23', date: '2026-04-23', time: '18:00', title: 'Dinner meds',  type: 'medication' },
    { id: 'e24', date: '2026-04-23', time: '21:00', title: 'Atorvastatin', type: 'medication' },
    // Fri Apr 18
    { id: 'e25', date: '2026-04-24', time: '08:00', title: 'Metformin',    type: 'medication' },
    { id: 'e26', date: '2026-04-24', time: '08:00', title: 'BP check',     type: 'vitals' },
    { id: 'e27', date: '2026-04-24', time: '12:00', title: 'Lunch + log',  type: 'meal' },
    { id: 'e28', date: '2026-04-24', time: '12:00', title: 'Lab: A1C',     type: 'lab' },
    { id: 'e29', date: '2026-04-24', time: '18:00', title: 'Dinner meds',  type: 'medication' },
    { id: 'e30', date: '2026-04-24', time: '21:00', title: 'Atorvastatin', type: 'medication' },
    // Sat Apr 19
    { id: 'e31', date: '2026-04-25', time: '08:00', title: 'Metformin',    type: 'medication' },
    { id: 'e32', date: '2026-04-25', time: '12:00', title: 'Lunch + log',  type: 'meal' },
    { id: 'e33', date: '2026-04-25', time: '14:00', title: 'Family visit', type: 'appointment' },
    { id: 'e34', date: '2026-04-25', time: '18:00', title: 'Dinner meds',  type: 'medication' },
    { id: 'e35', date: '2026-04-25', time: '21:00', title: 'Atorvastatin', type: 'medication' },
    // Sun Apr 20
    { id: 'e36', date: '2026-04-26', time: '08:00', title: 'Metformin',    type: 'medication' },
    { id: 'e37', date: '2026-04-26', time: '12:00', title: 'Lunch + log',  type: 'meal' },
    { id: 'e38', date: '2026-04-26', time: '18:00', title: 'Dinner meds',  type: 'medication' },
    { id: 'e39', date: '2026-04-26', time: '21:00', title: 'Atorvastatin', type: 'medication' },
  ],
  david: [],
  ethan: [],
};

export const notes = {
  margaret: [
    {
      id: 'n1',
      weekOf: '2026-04-20',
      author: 'Dr. Chen',
      date: '04/22',
      body:
        'Watch for swelling in ankles — may indicate fluid retention. Check blood pressure daily this week and log readings. Schedule follow-up if systolic stays above 140.',
    },
  ],
  david: [],
  ethan: [],
};

export const personalNotes = {
  margaret: [],
  david: [],
  ethan: [],
};

export const eventLegend = [
  { type: 'medication',  label: 'Medication' },
  { type: 'appointment', label: 'Appointment' },
  { type: 'vitals',      label: 'Vitals check' },
  { type: 'activity',    label: 'Activity' },
  { type: 'meal',        label: 'Meal/log' },
  { type: 'lab',         label: 'Lab/test' },
];
