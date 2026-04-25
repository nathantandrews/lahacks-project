import { useMemo, useState, useEffect } from 'react';
import Header from './components/Header';
import PatientTabs from './components/PatientTabs';
import PatientSummary from './components/PatientSummary';
import MedicationGrid from './components/MedicationGrid';
import CalendarToolbar from './components/CalendarToolbar';
import DoctorNote from './components/DoctorNote';
import CalendarGrid from './components/CalendarGrid';
import Legend from './components/Legend';
import PersonalNotes from './components/PersonalNotes';
import Modal from './components/Modal';
import AddMedicationForm from './components/AddMedicationForm';
import AddConditionForm from './components/AddConditionForm';
import UploadNoteForm from './components/UploadNoteForm';
import AddEventForm from './components/AddEventForm';
import {
  currentUser,
  patients,
  conditions as initialConditions,
  medications as initialMedications,
  events as initialEvents,
  notes as initialNotes,
  personalNotes as initialPersonalNotes,
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

  // App state — initialized from mockData, mutable via the four add forms.
  const [medications, setMedications] = useState(initialMedications);
  const [conditions, setConditions] = useState(initialConditions);
  const [events, setEvents] = useState(initialEvents);
  const [notes, setNotes] = useState(initialNotes);
  const [personalNotes, setPersonalNotes] = useState(initialPersonalNotes);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all data for the selected patient
        // Assuming your FastAPI endpoints are: /api/patients/{id}/medications, etc.
        const [medRes, condRes, eventRes] = await Promise.all([
          fetch(`http://localhost:8000/api/patients/${selectedPatientId}/medications`),
          fetch(`http://localhost:8000/api/patients/${selectedPatientId}/conditions`),
          fetch(`http://localhost:8000/api/patients/${selectedPatientId}/events`)
        ]);

        if (medRes.ok && condRes.ok && eventRes.ok) {
          const meds = await medRes.json();
          const conds = await condRes.json();
          const evs = await eventRes.json();

          setMedications(prev => ({ ...prev, [selectedPatientId]: meds }));
          setConditions(prev => ({ ...prev, [selectedPatientId]: conds }));
          setEvents(prev => ({ ...prev, [selectedPatientId]: evs }));
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    }
    fetchData();
  }, [selectedPatientId]);

  // Which modal is open: null | 'medication' | 'condition' | 'note' | 'event'
  const [openModal, setOpenModal] = useState(null);
  // When set, the medication modal opens in edit mode for this medication.
  const [editingMedication, setEditingMedication] = useState(null);
  const closeModal = () => {
    setOpenModal(null);
    setEditingMedication(null);
  };

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

  // Append helpers — each takes the new item and pushes onto the current patient's list.
  const addToPatient = (setter) => (item) => {
    setter((prev) => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), item],
    }));
    closeModal();
  };
  const addMedication = async (newMed) => {
    try {
      const response = await fetch(`http://localhost:8000/api/patients/${selectedPatientId}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMed),
      });
      
      if (response.ok) {
        const savedMed = await response.json();
        // Update local state to reflect the new data from DB
        setMedications((prev) => ({
          ...prev,
          [selectedPatientId]: [...(prev[selectedPatientId] || []), savedMed]
        }));
        closeModal();
      }
    } catch (error) {
      console.error("Error saving medication:", error);
    }
  };
  const addCondition = addToPatient(setConditions);
  const addEvent = addToPatient(setEvents);

  const editMedication = (med) => {
    setMedications((prev) => ({
      ...prev,
      [selectedPatientId]: (prev[selectedPatientId] || []).map((m) =>
        m.id === med.id ? med : m,
      ),
    }));
    closeModal();
  };
  const deleteMedication = (id) => {
    const med = (medications[selectedPatientId] || []).find((m) => m.id === id);
    const label = med?.name ? `"${med.name}"` : 'this medication';
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;
    setMedications((prev) => ({
      ...prev,
      [selectedPatientId]: (prev[selectedPatientId] || []).filter((m) => m.id !== id),
    }));
  };
  const startEditMedication = (med) => {
    setEditingMedication(med);
    setOpenModal('medication');
  };
  const addNote = (note) => {
    setNotes((prev) => ({
      ...prev,
      [selectedPatientId]: [note, ...(prev[selectedPatientId] || [])],
    }));
    closeModal();
  };

  const addPersonalNote = (note) => {
    setPersonalNotes((prev) => ({
      ...prev,
      [selectedPatientId]: [note, ...(prev[selectedPatientId] || [])],
    }));
  };
  const deletePersonalNote = (id) => {
    setPersonalNotes((prev) => ({
      ...prev,
      [selectedPatientId]: (prev[selectedPatientId] || []).filter((n) => n.id !== id),
    }));
  };
  const editPersonalNote = (id, patch) => {
    const fields = typeof patch === 'string' ? { body: patch } : patch;
    setPersonalNotes((prev) => ({
      ...prev,
      [selectedPatientId]: (prev[selectedPatientId] || []).map((n) =>
        n.id === id ? { ...n, ...fields, updatedAt: new Date().toISOString() } : n,
      ),
    }));
  };
  const togglePersonalNoteDone = (id) => {
    setPersonalNotes((prev) => ({
      ...prev,
      [selectedPatientId]: (prev[selectedPatientId] || []).map((n) =>
        n.id === id ? { ...n, done: !n.done } : n,
      ),
    }));
  };

  const addMenuItems = [
    { label: 'Add condition',     onSelect: () => setOpenModal('condition') },
    { label: 'Add medication',    onSelect: () => setOpenModal('medication') },
    { label: "Upload doctor's note", onSelect: () => setOpenModal('note') },
    { label: 'Add event',         onSelect: () => setOpenModal('event') },
  ];

  return (
    <div className="app">
      <div className="app-card">
        <Header user={currentUser} addMenuItems={addMenuItems} />
        <PatientTabs
          patients={patients}
          selectedId={selectedPatientId}
          onSelect={setSelectedPatientId}
          onAdd={() => alert('Add patient — not implemented')}
        />
        <div className="layout">
          <div className="layout-left">
            <PatientSummary
              patient={patient}
              conditions={conditions[selectedPatientId] || []}
              onAddCondition={() => setOpenModal('condition')}
            />
            <MedicationGrid
              medications={medications[selectedPatientId] || []}
              onAddMedication={() => setOpenModal('medication')}
              onEditMedication={startEditMedication}
              onDeleteMedication={deleteMedication}
            />
            <PersonalNotes
              notes={personalNotes[selectedPatientId] || []}
              onAdd={addPersonalNote}
              onDelete={deletePersonalNote}
              onEdit={editPersonalNote}
              onToggleDone={togglePersonalNoteDone}
            />
          </div>
          <div className="layout-right">
            <CalendarToolbar
              rangeLabel={formatRange(currentDate, view)}
              view={view}
              onViewChange={setView}
              onPrev={handlePrev}
              onNext={handleNext}
              onToday={handleToday}
              onAddEvent={() => setOpenModal('event')}
              onUploadNote={() => setOpenModal('note')}
            />
            <DoctorNote note={(notes[selectedPatientId] || [])[0]} />
            <CalendarGrid
              events={events[selectedPatientId] || []}
              currentDate={currentDate}
              todayISO={TODAY_ISO}
              view={view}
            />
            <Legend items={eventLegend} />
          </div>
        </div>
      </div>

      <Modal
        open={openModal === 'medication'}
        title={editingMedication ? 'Edit medication' : 'Add medication'}
        onClose={closeModal}
      >
        <AddMedicationForm
          key={editingMedication?.id || 'new'}
          initial={editingMedication}
          onSubmit={editingMedication ? editMedication : addMedication}
          onCancel={closeModal}
        />
      </Modal>
      <Modal open={openModal === 'condition'} title="Add active condition" onClose={closeModal}>
        <AddConditionForm onSubmit={addCondition} onCancel={closeModal} />
      </Modal>
      <Modal open={openModal === 'note'} title="Upload doctor's note" onClose={closeModal}>
        <UploadNoteForm currentDate={currentDate} onSubmit={addNote} onCancel={closeModal} />
      </Modal>
      <Modal open={openModal === 'event'} title="Add event" onClose={closeModal}>
        <AddEventForm currentDate={currentDate} onSubmit={addEvent} onCancel={closeModal} />
      </Modal>
    </div>
  );
}
