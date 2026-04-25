import { useMemo, useState } from 'react';
import Header from './components/Header';
import PatientTabs from './components/PatientTabs';
import PatientSummary from './components/PatientSummary';
import MedicationGrid from './components/MedicationGrid';
import CalendarToolbar from './components/CalendarToolbar';
import DoctorNote from './components/DoctorNote';
import CalendarGrid from './components/CalendarGrid';
import Legend from './components/Legend';
import {
  currentUser,
  patients,
  conditions,
  medications,
  events,
  notes,
  eventLegend,
} from './data/mockData';
import './App.css';

const TODAY_ISO = '2026-04-24';

function formatRange(date, view) {
  if (view === 'day') {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (view === 'month') {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  // week: Mon–Sun range
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  if (sameMonth) {
    return `${startStr} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  const endStr = end.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}

export default function App() {
  const [selectedPatientId, setSelectedPatientId] = useState('margaret');
  const [view, setView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date(TODAY_ISO));

  const patient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId),
    [selectedPatientId],
  );

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (view === 'day') d.setDate(d.getDate() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };
  const handleNext = () => {
    const d = new Date(currentDate);
    if (view === 'day') d.setDate(d.getDate() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };
  const handleToday = () => setCurrentDate(new Date(TODAY_ISO));

  return (
    <div className="app">
      <div className="app-card">
        <Header user={currentUser} />
        <PatientTabs
          patients={patients}
          selectedId={selectedPatientId}
          onSelect={setSelectedPatientId}
          onAdd={() => alert('Add patient — not implemented')}
        />
        <PatientSummary
          patient={patient}
          conditions={conditions[selectedPatientId] || []}
        />
        <MedicationGrid medications={medications[selectedPatientId] || []} />
        <CalendarToolbar
          rangeLabel={formatRange(currentDate, view)}
          view={view}
          onViewChange={setView}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
        />
        <DoctorNote note={(notes[selectedPatientId] || [])[0]} />
        <CalendarGrid
          events={events[selectedPatientId] || []}
          currentDate={currentDate}
          todayISO={TODAY_ISO}
        />
        <Legend items={eventLegend} />
      </div>
    </div>
  );
}
