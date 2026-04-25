"""
CaregiverAgent — Fetch.ai uAgent
Registered on Agentverse via External Integration > Agent Chat Protocol.

Run:
    python agent.py

Then expose with ngrok:
    ngrok http 8001

Paste the ngrok URL as the Agentverse endpoint.
"""
import os
import json
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from uagents import Agent, Context, Model, Protocol

# Official AgentChatProtocol from uagents_core (required for Agentverse "Add Chat Protocol")
try:
    from uagents_core.contrib.protocols.chat import (
        ChatAcknowledgement,
        ChatMessage,
        TextContent,
        chat_protocol_spec,
    )
    chat_protocol = Protocol(spec=chat_protocol_spec)
    _OFFICIAL_ACP = True
except ImportError:
    _OFFICIAL_ACP = False
    class TextContent(Model):
        type: str = "text"
        text: str
    class ChatMessage(Model):
        content: list
        msg_id: str
        timestamp: str
    class ChatAcknowledgement(Model):
        acknowledged_msg_id: str
        metadata: dict = {}
        timestamp: str
    chat_protocol = Protocol(name="AgentChatProtocol", version="0.3.0")

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
AGENT_NAME = "caregiver-agent"
AGENT_SEED = os.getenv("AGENT_SEED_PHRASE") or os.getenv("AGENT_SEED", "caregiver-agent-unique-seed-phrase-lahacks-2026")
AGENT_PORT = int(os.getenv("AGENT_PORT", "8001"))
AGENT_ENDPOINT = os.getenv("AGENT_ENDPOINT", f"http://localhost:{AGENT_PORT}/submit")
AGENTVERSE_KEY = os.getenv("AGENTVERSE_KEY", "")

# ---------------------------------------------------------------------------
# Agent setup
# ---------------------------------------------------------------------------
_agentverse_config = {"api_key": AGENTVERSE_KEY} if AGENTVERSE_KEY else "https://agentverse.ai"

agent = Agent(
    name=AGENT_NAME,
    seed=AGENT_SEED,
    port=AGENT_PORT,
    endpoint=[AGENT_ENDPOINT],
    agentverse=_agentverse_config,
)

# ---------------------------------------------------------------------------
# Official AgentChatProtocol handlers (ASI:One / Agentverse chat)
# This protocol is locked — only ChatMessage and ChatAcknowledgement allowed.
# ---------------------------------------------------------------------------

# Backend API base URL — agent fetches live patient data from here
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Fallback static data used when the backend is unreachable
FALLBACK_PATIENTS = {
    "margaret": {
        "displayName": "Mom (Margaret)", "fullName": "Margaret Williams", "age": 72,
        "primaryDoctor": "Dr. Chen",
        "conditions": ["Type 2 diabetes", "Hypertension", "Early-stage CKD", "Osteoarthritis"],
        "medications": [
            {"name": "Metformin", "dose": "500mg", "schedule": "2x daily", "withFood": True},
            {"name": "Lisinopril", "dose": "10mg", "schedule": "1x morning"},
            {"name": "Atorvastatin", "dose": "20mg", "schedule": "1x evening"},
            {"name": "Aspirin", "dose": "81mg", "schedule": "1x daily"},
            {"name": "Vitamin D3", "dose": "2000 IU", "schedule": "1x daily"},
            {"name": "Tylenol", "dose": "500mg", "schedule": "as needed"},
        ],
        "notes": [{"author": "Dr. Chen", "date": "04/22", "body": "Watch for swelling in ankles — may indicate fluid retention. Check blood pressure daily this week and log readings. Schedule follow-up if systolic stays above 140."}],
        "events": ["Daily BP check (morning)", "PT session Tue 2pm - Ortho/knee", "Nephrology appt Wed 9am with Dr. Chen", "Lab: A1C - Fri 12pm"],
    },
    "david": {
        "displayName": "Dad (David)", "fullName": "David Williams", "age": 74,
        "primaryDoctor": "Dr. Patel",
        "conditions": ["Hypertension", "High cholesterol"],
        "medications": [
            {"name": "Lisinopril", "dose": "20mg", "schedule": "1x morning"},
            {"name": "Rosuvastatin", "dose": "10mg", "schedule": "1x evening"},
        ],
        "notes": [], "events": [],
    },
    "ethan": {
        "displayName": "Ethan (son)", "fullName": "Ethan Williams", "age": 9,
        "primaryDoctor": "Dr. Rivera",
        "conditions": ["Asthma", "Seasonal allergies"],
        "medications": [
            {"name": "Albuterol inhaler", "dose": "90mcg", "schedule": "as needed"},
            {"name": "Cetirizine", "dose": "5mg", "schedule": "1x daily"},
        ],
        "notes": [], "events": [],
    },
}

# Maps name variants a user might say → patient ID in the database
PATIENT_NAME_MAP = {
    "margaret": "margaret", "mom": "margaret", "mother": "margaret",
    "david": "david", "dad": "david", "father": "david",
    "ethan": "ethan", "son": "ethan", "kid": "ethan",
}


def _detect_patient(text: str) -> str | None:
    """Return the patient ID if a patient name is mentioned in the text."""
    lower = text.lower()
    for keyword, patient_id in PATIENT_NAME_MAP.items():
        if keyword in lower:
            return patient_id
    return None


def _fetch_patient_context(patient_id: str) -> dict:
    """
    Fetch live patient data from the FastAPI backend.
    Falls back to static data if the backend is not running.
    """
    import requests as req
    try:
        base = BACKEND_URL
        patient = req.get(f"{base}/patients/{patient_id}", timeout=3).json()
        meds = req.get(f"{base}/patients/{patient_id}/medications", timeout=3).json()
        notes = req.get(f"{base}/patients/{patient_id}/notes", timeout=3).json()
        events = req.get(f"{base}/patients/{patient_id}/events", timeout=3).json()
        return {
            "displayName": patient.get("displayName", patient_id),
            "fullName": patient.get("fullName", patient_id),
            "age": patient.get("age"),
            "primaryDoctor": patient.get("primaryDoctor"),
            "conditions": [c.get("label") for c in patient.get("conditions", [])],
            "medications": meds,
            "notes": [{"author": n.get("author"), "date": n.get("date"), "body": n.get("body")} for n in notes],
            "events": [f"{e.get('time', '')} {e.get('title', '')} {e.get('subtitle', '')}".strip() for e in events],
        }
    except Exception:
        # Backend not running — use fallback static data
        return FALLBACK_PATIENTS.get(patient_id, {})


def _fetch_all_patients_context() -> str:
    """Build a context string for all patients (used when no specific patient is mentioned)."""
    import requests as req
    try:
        patients = req.get(f"{BACKEND_URL}/patients", timeout=3).json()
        patient_ids = [p.get("id") for p in patients]
    except Exception:
        patient_ids = list(FALLBACK_PATIENTS.keys())

    sections = []
    for pid in patient_ids:
        data = _fetch_patient_context(pid)
        meds = ", ".join(f"{m.get('name')} {m.get('dose')} ({m.get('schedule')})" for m in data.get("medications", []))
        conditions = ", ".join(data.get("conditions", []))
        sections.append(
            f"PATIENT: {data.get('fullName')} ({data.get('displayName')})\n"
            f"  Age: {data.get('age')} | Doctor: {data.get('primaryDoctor')}\n"
            f"  Conditions: {conditions or 'None listed'}\n"
            f"  Medications: {meds or 'None listed'}"
        )
    return "\n\n".join(sections)


def _build_system_prompt(patient_id: str | None, query: str = "") -> str:
    """Build a rich, data-driven system prompt for ASI-1 Mini."""

    if patient_id:
        data = _fetch_patient_context(patient_id)
        name = data.get("fullName", patient_id)
        meds = "\n".join(
            f"  - {m.get('name')} {m.get('dose')} ({m.get('schedule')})"
            + (" [take with food]" if m.get("withFood") else "")
            for m in data.get("medications", [])
        ) or "  None listed"
        conditions = "\n".join(f"  - {c}" for c in data.get("conditions", [])) or "  None listed"
        notes = "\n".join(
            f"  - [{n.get('date')}] {n.get('author')}: {n.get('body')}"
            for n in data.get("notes", [])
        ) or "  No recent notes on file."
        events = "\n".join(f"  - {e}" for e in data.get("events", [])) or "  No upcoming events."

        return f"""You are CaregiverAI, an AI health assistant powered by ASI-1.

STRICT RULES:
- You are ONLY answering about {name}. Do NOT mention any other patients.
- Use ONLY the data below. Never invent medications, test results, or diagnoses.
- For weekly summaries: lead with THIS WEEK'S SCHEDULE and DOCTOR NOTES, then conditions and meds.
- Be specific and actionable. Use bullet points. Keep it concise.
- End with one brief reminder to consult the doctor for medical decisions.

━━━ PATIENT: {name} ({data.get('displayName')}) ━━━
Age: {data.get('age')} | Primary Doctor: {data.get('primaryDoctor')}

CONDITIONS:
{conditions}

CURRENT MEDICATIONS:
{meds}

THIS WEEK'S SCHEDULE:
{events}

RECENT DOCTOR NOTES:
{notes}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""

    else:
        return f"""You are CaregiverAI, an AI health assistant powered by ASI-1.
Answer the caregiver's question using the patient data below.
Use ONLY this data. Be specific, concise, and use bullet points.

ALL PATIENTS:
{_fetch_all_patients_context()}"""


@chat_protocol.on_message(model=ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    """Handle ASI:One natural-language queries via the official ACP."""
    from asi1_client import call_asi1

    now = datetime.now(timezone.utc).isoformat()

    # Acknowledge immediately
    await ctx.send(sender, ChatAcknowledgement(
        acknowledged_msg_id=msg.msg_id,
        metadata={"agent": "CaregiverAgent"},
        timestamp=now,
    ))

    # Extract plain text from content blocks — handle dict, Pydantic model, or raw string
    text_parts = []
    for block in msg.content:
        if isinstance(block, dict):
            # Standard ACP dict format: {"type": "text", "text": "..."}
            if block.get("type") == "text" and block.get("text"):
                text_parts.append(block["text"])
            # Fallback: any dict with a text field
            elif block.get("text"):
                text_parts.append(block["text"])
            # Last resort: stringify the whole block value
            elif block.get("content"):
                text_parts.append(str(block["content"]))
        elif hasattr(block, "text") and block.text:
            # Pydantic TextContent model object from uagents_core
            text_parts.append(block.text)
        elif isinstance(block, str) and block.strip():
            text_parts.append(block.strip())

    user_text = " ".join(text_parts).strip()

    # Log the raw content for debugging if extraction fails
    if not user_text:
        ctx.logger.warning(f"[ACP] Could not extract text. Raw content: {msg.content}")
        user_text = "Give me a brief health summary for all patients this week."
    else:
        ctx.logger.info(f"[ACP] Message from {sender}: {user_text[:120]}")

    # Detect which patient is being asked about and fetch their live data
    patient_id = _detect_patient(user_text)
    system_prompt = _build_system_prompt(patient_id, query=user_text)
    ctx.logger.info(f"[ACP] Patient detected: {patient_id or 'none — showing all patients'}")

    try:
        response_text = call_asi1(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
            max_tokens=700,
            temperature=0.3,
        )
    except Exception as e:
        ctx.logger.error(f"ASI-1 call failed: {e}")
        response_text = (
            "I'm CaregiverAI managing health for Margaret (Mom, 72), David (Dad, 74), "
            "and Ethan (son, 9). Ask me about their medications, this week's schedule, "
            "doctor notes, or health summaries. For example: 'Summarize Margaret's health this week.'"
        )

    # Send response as a new outbound ChatMessage
    await ctx.send(sender, ChatMessage(
        content=[{"type": "text", "text": response_text}],
        msg_id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat(),
    ))


@chat_protocol.on_message(model=ChatAcknowledgement)
async def handle_acknowledgement(ctx: Context, sender: str, msg: ChatAcknowledgement):
    """Log acknowledgements — no reply needed."""
    ctx.logger.info(f"[ACP] Ack from {sender} for msg {msg.acknowledged_msg_id}")


# ---------------------------------------------------------------------------
# Custom CaregiverProtocol — for structured health requests from the backend
# Separate from ACP so it doesn't conflict with the locked official protocol.
# ---------------------------------------------------------------------------

class HealthQuery(Model):
    text: str
    patient_id: str = ""

class HealthBriefRequest(Model):
    patient_data: str  # JSON-encoded patient context dict

class DocumentAnalysisRequest(Model):
    raw_text: str
    patient_id: str = ""

class MedicationCheckRequest(Model):
    medications: str  # JSON-encoded list of {name, dose, schedule}

class AgentResponse(Model):
    text: str
    data: str = "{}"
    request_type: str = "general"

caregiver_protocol = Protocol(name="CaregiverProtocol", version="1.0.0")


@caregiver_protocol.on_message(model=HealthQuery, replies=AgentResponse)
async def handle_health_query(ctx: Context, sender: str, msg: HealthQuery):
    from asi1_client import call_asi1_with_system
    ctx.logger.info(f"[Query] from {sender}: {msg.text[:80]}")
    try:
        response_text = call_asi1_with_system(msg.text, max_tokens=600)
        await ctx.send(sender, AgentResponse(text=response_text, request_type="general"))
    except Exception as e:
        await ctx.send(sender, AgentResponse(text=f"Error: {e}", request_type="error"))


@caregiver_protocol.on_message(model=HealthBriefRequest, replies=AgentResponse)
async def handle_health_brief(ctx: Context, sender: str, msg: HealthBriefRequest):
    from protocols.health_brief import generate_health_brief
    ctx.logger.info(f"[Brief] Request from {sender}")
    try:
        patient_data = json.loads(msg.patient_data)
        brief = generate_health_brief(patient_data)
        await ctx.send(sender, AgentResponse(
            text=brief.get("summary", "Brief generated."),
            data=json.dumps(brief),
            request_type="brief",
        ))
    except Exception as e:
        await ctx.send(sender, AgentResponse(text=f"Error: {e}", request_type="error"))


@caregiver_protocol.on_message(model=DocumentAnalysisRequest, replies=AgentResponse)
async def handle_document_analysis(ctx: Context, sender: str, msg: DocumentAnalysisRequest):
    from protocols.document_analysis import analyze_document
    ctx.logger.info(f"[DocAnalysis] patient={msg.patient_id}")
    try:
        result = analyze_document(msg.raw_text, stream=False)
        await ctx.send(sender, AgentResponse(
            text=result.get("summary", "Analysis complete."),
            data=json.dumps(result),
            request_type="analyze",
        ))
    except Exception as e:
        await ctx.send(sender, AgentResponse(text=f"Error: {e}", request_type="error"))


@caregiver_protocol.on_message(model=MedicationCheckRequest, replies=AgentResponse)
async def handle_medication_check(ctx: Context, sender: str, msg: MedicationCheckRequest):
    from protocols.medication_check import check_medications
    ctx.logger.info(f"[MedCheck] Request from {sender}")
    try:
        medications = json.loads(msg.medications)
        result = check_medications(medications)
        await ctx.send(sender, AgentResponse(
            text=result.get("summary", "Medication check complete."),
            data=json.dumps(result),
            request_type="medication",
        ))
    except Exception as e:
        await ctx.send(sender, AgentResponse(text=f"Error: {e}", request_type="error"))


# Include both protocols
agent.include(chat_protocol, publish_manifest=True)      # Official ACP for Agentverse
agent.include(caregiver_protocol, publish_manifest=True)  # Custom protocol for backend

# ---------------------------------------------------------------------------
# REST endpoints (called directly by the FastAPI backend over HTTP)
# ---------------------------------------------------------------------------

class RestHealthQuery(Model):
    text: str
    patient_id: str = ""

class RestHealthBriefRequest(Model):
    patient_data: dict

class RestDocumentRequest(Model):
    raw_text: str
    patient_id: str = ""
    stream: bool = False

class RestMedicationRequest(Model):
    medications: list

class RestResponse(Model):
    text: str
    data: dict = {}
    request_type: str


@agent.on_rest_post("/query", RestHealthQuery, RestResponse)
async def rest_query(ctx: Context, req: RestHealthQuery) -> RestResponse:
    from asi1_client import call_asi1_with_system
    text = call_asi1_with_system(req.text)
    return RestResponse(text=text, request_type="general")


@agent.on_rest_post("/health-brief", RestHealthBriefRequest, RestResponse)
async def rest_health_brief(ctx: Context, req: RestHealthBriefRequest) -> RestResponse:
    from protocols.health_brief import generate_health_brief
    brief = generate_health_brief(req.patient_data)
    return RestResponse(text=brief.get("summary", ""), data=brief, request_type="brief")


@agent.on_rest_post("/analyze-note", RestDocumentRequest, RestResponse)
async def rest_analyze_note(ctx: Context, req: RestDocumentRequest) -> RestResponse:
    from protocols.document_analysis import analyze_document
    result = analyze_document(req.raw_text, stream=False)
    return RestResponse(text=result.get("summary", ""), data=result, request_type="analyze")


@agent.on_rest_post("/medication-check", RestMedicationRequest, RestResponse)
async def rest_medication_check(ctx: Context, req: RestMedicationRequest) -> RestResponse:
    from protocols.medication_check import check_medications
    result = check_medications(req.medications)
    return RestResponse(text=result.get("summary", ""), data=result, request_type="medication")


# ---------------------------------------------------------------------------
# Startup log
# ---------------------------------------------------------------------------
@agent.on_event("startup")
async def on_startup(ctx: Context):
    ctx.logger.info("=" * 60)
    ctx.logger.info(f"CaregiverAgent started  (official ACP: {_OFFICIAL_ACP})")
    ctx.logger.info(f"Agent address : {ctx.agent.address}")
    ctx.logger.info(f"Listening on  : port {AGENT_PORT}")
    ctx.logger.info(f"Endpoint      : {AGENT_ENDPOINT}")
    ctx.logger.info("=" * 60)


if __name__ == "__main__":
    agent.run()
