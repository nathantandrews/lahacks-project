# CareGiver Hub

![tag:innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)

> Unified health management for family caregivers — powered by Fetch.ai ASI-1 Mini.

---

## The Problem

Family caregivers managing a parent's or child's health across multiple providers face extreme fragmentation: appointments live in one portal, medications in another, doctor notes on paper, and insurance paperwork everywhere. Caregivers are drowning in friction around health-critical tasks.

## The Solution

CareGiver Hub is a domain-specific AI agent that unifies all of this into a single dashboard. The **CaregiverAgent** (a Fetch.ai uAgent) uses **ASI-1 Mini** to:

- Generate daily health briefs summarizing what the caregiver needs to know
- Analyze scanned doctor's notes and extract structured action items, warnings, and medication changes
- Check medication lists for dangerous drug interactions
- Answer natural-language questions about any patient's health situation

---

## Agent Details

| Field | Value |
|---|---|
| **Agent Name** | `caregiver-agent` |
| **Framework** | Fetch.ai uAgents |
| **LLM** | ASI-1 Mini (`asi1` model via `https://api.asi1.ai/v1`) |
| **Agentverse** | Registered via External Integration → Agent Chat Protocol |
| **Agent Address** | _(paste your `agent1qtqwfh2uv6jgc2u56ytl6vhwp6n8xa85cdvdhjfa3aza77y85eh5zl7g0xf` address here after first run)_ |

### Input / Output Models

| Protocol | Input | Output |
|---|---|---|
| `HealthQuery` | `{ text: str, patient_id: str }` | `{ text: str, data: {}, request_type: "general" }` |
| `HealthBriefRequest` | `{ patient_data: dict }` | `{ text: str, data: { summary, todays_focus, warnings, ... } }` |
| `DocumentAnalysisRequest` | `{ raw_text: str, patient_id: str }` | `{ text: str, data: { diagnosis, medications_prescribed, follow_up_actions, warning_signs } }` |
| `MedicationCheckRequest` | `{ medications: list }` | `{ text: str, data: { safe, interaction_warnings, recommendations } }` |

---

## Architecture

```
React Frontend (caregiver-hub, port 5173)
        │  REST JSON
        ▼
FastAPI Backend (port 8000)
    ├── MongoDB Atlas    ← patient data, events, medications, notes
    └── CaregiverAgent (port 8001)
              │
              ▼
         ASI-1 Mini API
         (https://api.asi1.ai/v1)
```

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+ (for frontend)
- [MongoDB Atlas](https://cloud.mongodb.com) free cluster (or local MongoDB)
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) installed locally
- [ngrok](https://ngrok.com) (for Agentverse endpoint)

---

### 1. CaregiverAgent

```bash
cd caregiver-agent
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Copy and fill in your keys
copy .env.example .env
# Set ASI1_API_KEY to your key from https://asi1.ai/dashboard/api-keys

python agent.py
```

The agent logs its address (`agent1q...`) on startup — copy this for Agentverse registration.

### 2. Expose with ngrok (for Agentverse)

```bash
ngrok http 8001
```

Copy the `https://xxxx.ngrok-free.app` URL. In the Agentverse External Integration form:
- **Agent Name:** `caregiver-agent`
- **Endpoint URL:** `https://xxxx.ngrok-free.app/submit`

### 3. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

copy .env.example .env
# Set MONGO_URI to your MongoDB Atlas connection string

uvicorn main:app --reload --port 8000
```

### 4. Frontend

```bash
cd caregiver-hub
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/patients` | List all patients |
| GET | `/patients/{id}/medications` | Patient medications |
| GET | `/patients/{id}/events?week=YYYY-MM-DD` | Calendar events |
| GET | `/patients/{id}/notes` | Doctor notes |
| POST | `/patients/{id}/notes/upload` | Upload + OCR + analyze a doctor's note image |
| POST | `/ai/health-brief/{id}` | Generate daily health brief via ASI-1 Mini |
| POST | `/ai/medication-check/{id}` | Check for drug interactions via ASI-1 Mini |
| POST | `/ai/query/{id}` | Natural-language query about a patient |

---

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** FastAPI (Python)
- **Database:** MongoDB Atlas + Motor
- **AI Agent:** Fetch.ai uAgents framework
- **LLM:** ASI-1 Mini (`https://api.asi1.ai/v1`)
- **OCR:** Tesseract via pytesseract
- **Agent Registry:** Agentverse (Agent Chat Protocol)

---

## Team

Built at LA Hacks 2026.
