# Pulse — CareGiver Hub

![tag:innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)

> Unified health management for caregivers — powered by Fetch.ai ASI-1 Mini.

---

## The Problem

Caregivers managing a patient's health across multiple providers face extreme fragmentation: appointments live in one portal, medications in another, doctor's notes on paper, and critical follow-up tasks fall through the cracks. Caregivers are drowning in friction around health-critical information.

## The Solution

Pulse is a caregiver dashboard that unifies patient data into one place. The **CaregiverAgent** (a Fetch.ai uAgent) uses **ASI-1 Mini** to:

- Generate structured AI summaries of doctor's notes — synthesizing diagnoses, action items, vitals to monitor, and concerns to watch
- Let caregivers send AI-generated action items directly to the patient's calendar or personal notes with one click
- Answer natural-language questions about any patient's health situation via a floating chat widget
- Process uploaded doctor's notes (text, PDF, or photos) using OCR and extract structured insights automatically

---

## Agent Details

| Field | Value |
|---|---|
| **Agent Name** | `caregiver-agent` |
| **Framework** | Fetch.ai uAgents |
| **LLM** | ASI-1 Mini (`asi1-mini` via `https://api.asi1.ai/v1`) |
| **Agentverse** | Registered via External Integration → Agent Chat Protocol v0.3.0 |
| **Protocol** | `AgentChatProtocol:0.3.0` |

---

## Architecture

```
React Frontend (port 5173)
        │  REST JSON
        ▼
FastAPI Backend (port 8000)
    ├── /api/patients         ← CRUD for patients, medications, events, notes
    ├── /api/ai               ← Weekly summary & chat endpoints (ASI-1 Mini)
    ├── /api/notes            ← Upload + OCR (pytesseract / pypdf)
    ├── MongoDB Atlas         ← persistent patient data
    └── CaregiverAgent (port 8001)
              │  Agent Chat Protocol
              ▼
         ASI-1 Mini API
         (https://api.asi1.ai/v1)
              │
           ngrok tunnel
              │
         Agentverse
```

---

## Features

- **Patient dashboard** — medications, conditions, calendar, and doctor's notes per patient
- **AI weekly summary** — ASI-1 Mini synthesizes all recent doctor's notes into a structured briefing with action items, concerns, and vitals
- **Calendar integration** — add any AI action item to the patient calendar with a start/end time picker; already-scheduled items are hidden automatically after refresh
- **Personal notes** — add AI insights directly to the personal notes & reminders section
- **Medical history** — full timeline of doctor's notes, visit summaries, and medications with collapsible AI insights
- **OCR document upload** — upload a photo or PDF of a doctor's note; text is extracted and automatically summarized
- **AI chat widget** — floating chat panel backed by the Fetch.ai agent with live patient context
- **Sticky patient tabs** — quickly switch between patients without losing scroll position

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- [MongoDB Atlas](https://cloud.mongodb.com) free cluster (or local MongoDB)
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) installed (Windows: `winget install UB-Mannheim.TesseractOCR`)
- [ngrok](https://ngrok.com) account + authtoken (for Agentverse endpoint)

---

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

copy .env.example .env
# Fill in:
#   MONGO_URI      — MongoDB Atlas connection string
#   ASI1_API_KEY   — from https://asi1.ai/dashboard/api-keys

uvicorn main:app --reload --port 8000
```

### 2. CaregiverAgent

```bash
cd caregiver-agent
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

copy .env.example .env
# Fill in:
#   ASI1_API_KEY   — same key as above
#   BACKEND_URL    — http://localhost:8000/api

python agent.py
```

The agent logs its address (`agent1q...`) on startup.

### 3. Expose agent with ngrok (for Agentverse)

```bash
ngrok http 8001
```

Copy the `https://xxxx.ngrok-free.app` URL. In Agentverse → External Integration:
- **Endpoint URL:** `https://xxxx.ngrok-free.app/submit`
- **Protocol:** Agent Chat Protocol v0.3.0

### 4. Frontend

```bash
# From the project root (lahacks-project/)
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/patients` | List all patients |
| POST | `/api/patients` | Add a new patient |
| GET | `/api/patients/{id}/medications` | Patient medications |
| POST | `/api/patients/{id}/medications` | Add medication |
| GET | `/api/patients/{id}/events` | Calendar events |
| POST | `/api/patients/{id}/events` | Add calendar event |
| GET | `/api/patients/{id}/notes` | Doctor's notes |
| POST | `/api/patients/{id}/notes/upload` | Upload + OCR a doctor's note (image or PDF) |
| DELETE | `/api/patients/{id}/notes/{note_id}` | Delete a doctor's note |
| GET | `/api/patients/{id}/personal-notes` | Personal notes & reminders |
| POST | `/api/patients/{id}/personal-notes` | Add personal note |
| GET | `/api/patients/{id}/history` | Full medical history timeline |
| GET | `/api/ai/weekly-summary/{id}` | Get cached AI summary of doctor's notes |
| POST | `/api/ai/weekly-summary/{id}` | Force-regenerate AI summary |
| POST | `/api/ai/chat` | Chat with the AI agent (used by chat widget) |

---

## Tech Stack

- **Frontend:** React 18, Vite, CSS Modules
- **Backend:** FastAPI, Uvicorn, Motor (async MongoDB driver)
- **Database:** MongoDB Atlas
- **AI Agent:** Fetch.ai uAgents framework, Agent Chat Protocol v0.3.0
- **LLM:** ASI-1 Mini (`https://api.asi1.ai/v1`)
- **OCR:** pytesseract (Tesseract), pypdf, Pillow
- **Agent Registry:** Agentverse
- **Tunneling:** ngrok

---

## Team
Ryan Sahyoun
Nathan Andrews
Kaya Lash

Built at LA Hacks 2026.
