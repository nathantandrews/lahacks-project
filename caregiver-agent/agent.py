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
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# How often (seconds) the agent re-syncs patient data from MongoDB in the background
_SYNC_INTERVAL_SECONDS = 30.0
_STALE_THRESHOLD_SECONDS = 60.0

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


@agent.on_event("startup")
async def on_startup(ctx: Context):
    """Sync patient data from MongoDB (via FastAPI backend) on agent start."""
    success = _sync_from_backend()
    if success:
        names = ", ".join(v["fullName"] for v in MOCK_DATA.values())
        ctx.logger.info(f"[Startup] Synced live patient data from MongoDB: {names}")
    else:
        ctx.logger.warning(
            f"[Startup] Backend at {BACKEND_URL} unreachable — using hardcoded patient data. "
            "Start the FastAPI backend to use live MongoDB data."
        )


@agent.on_interval(period=_SYNC_INTERVAL_SECONDS)
async def background_sync(ctx: Context):
    """Re-sync patient data from MongoDB every 30 seconds in the background."""
    import asyncio
    success = await asyncio.to_thread(_sync_from_backend)
    if success:
        ctx.logger.info("[Sync] Patient data refreshed from MongoDB.")
    else:
        ctx.logger.debug("[Sync] Backend unreachable — keeping current data.")


# ---------------------------------------------------------------------------
# Patient data — exact mirror of mockData.js, filtered for clarity
# ---------------------------------------------------------------------------

MOCK_DATA = {
    "margaret": {
        "fullName": "Margaret Williams",
        "displayName": "Mom (Margaret)",
        "age": 72,
        "dob": "03/14/1953",
        "primaryDoctor": "Dr. Chen",
        "conditions": ["Type 2 diabetes", "Hypertension", "Early-stage CKD", "Osteoarthritis"],
        "medications": [
            {"name": "Metformin",    "dose": "500mg",   "schedule": "2x daily",  "withFood": True},
            {"name": "Lisinopril",   "dose": "10mg",    "schedule": "1x morning","withFood": False},
            {"name": "Atorvastatin", "dose": "20mg",    "schedule": "1x evening","withFood": False},
            {"name": "Aspirin",      "dose": "81mg",    "schedule": "1x daily",  "withFood": True},
            {"name": "Vitamin D3",   "dose": "2000 IU", "schedule": "1x daily",  "withFood": True},
            {"name": "Tylenol",      "dose": "500mg",   "schedule": "as needed", "withFood": False},
        ],
        # Only meaningful events (appointments, labs, vitals) — not every medication reminder
        "weekly_events": [
            "Mon Apr 20 — Daily BP check (morning vitals)",
            "Mon Apr 20 — Morning walk (activity)",
            "Tue Apr 21 — PT session 2:00 PM (Ortho · knee)",
            "Wed Apr 22 — Dr. Chen appointment 9:00 AM (Nephrology)",
            "Thu Apr 23 — Morning walk (activity)",
            "Fri Apr 24 — Lab: A1C test 12:00 PM",
            "Sat Apr 25 — Family visit 2:00 PM",
        ],
        "notes": [
            {
                "date": "04/22",
                "author": "Dr. Chen",
                "body": "Watch for swelling in ankles — may indicate fluid retention. Check blood pressure daily this week and log readings. Schedule follow-up if systolic stays above 140."
            }
        ],
    },
    "david": {
        "fullName": "David Williams",
        "displayName": "Dad (David)",
        "age": 74,
        "dob": "07/02/1951",
        "primaryDoctor": "Dr. Patel",
        "conditions": ["Hypertension", "High cholesterol"],
        "medications": [
            {"name": "Lisinopril",   "dose": "20mg", "schedule": "1x morning", "withFood": False},
            {"name": "Rosuvastatin", "dose": "10mg", "schedule": "1x evening", "withFood": False},
        ],
        "weekly_events": [],
        "notes": [],
    },
    "ethan": {
        "fullName": "Ethan Williams",
        "displayName": "Ethan (son)",
        "age": 9,
        "dob": "11/22/2016",
        "primaryDoctor": "Dr. Rivera",
        "conditions": ["Asthma", "Seasonal allergies"],
        "medications": [
            {"name": "Albuterol inhaler", "dose": "90mcg", "schedule": "as needed", "withFood": False},
            {"name": "Cetirizine",        "dose": "5mg",   "schedule": "1x daily",  "withFood": False},
        ],
        "weekly_events": [],
        "notes": [],
    },
}

# Every name/alias a user might say → patient ID
PATIENT_NAME_MAP = {
    "margaret": "margaret", "margarets": "margaret",
    "mom": "margaret", "mother": "margaret",
    "david": "david", "davids": "david",
    "dad": "david", "father": "david",
    "ethan": "ethan", "ethans": "ethan",
    "son": "ethan", "kid": "ethan", "child": "ethan",
}


def _detect_patient(text: str) -> str | None:
    """Return patient ID if any patient name/alias appears in the text."""
    lower = text.lower()
    for keyword, patient_id in PATIENT_NAME_MAP.items():
        if keyword in lower:
            return patient_id
    return None


def _format_patient_block(pid: str) -> str:
    """Format a single patient's full data as a clean text block for ASI-1."""
    d = MOCK_DATA[pid]

    meds = "\n".join(
        f"  • {m['name']} {m['dose']} — {m['schedule']}"
        + (" (take with food)" if m.get("withFood") else "")
        for m in d["medications"]
    ) or "  None on file"

    conditions = "\n".join(f"  • {c}" for c in d["conditions"]) or "  None on file"

    events = "\n".join(f"  • {e}" for e in d["weekly_events"]) or "  No scheduled events this week"

    notes = "\n".join(
        f"  • [{n['date']}] {n['author']}: {n['body']}"
        for n in d["notes"]
    ) or "  No recent doctor notes on file"

    return f"""PATIENT: {d['fullName']} | Age: {d['age']} | DOB: {d['dob']} | Doctor: {d['primaryDoctor']}

CONDITIONS:
{conditions}

CURRENT MEDICATIONS:
{meds}

THIS WEEK'S SCHEDULE (week of Apr 20, 2026):
{events}

RECENT DOCTOR NOTES:
{notes}"""


ABOUT_ME_MESSAGE = (
    "Hi! I'm **CaregiverAI**, an AI health management assistant built to help caregivers "
    "stay on top of their loved ones' health.\n\n"
    "Here's what you can ask me:\n\n"
    "• **Medication schedules** — \"What medications does [patient] take and when?\"\n"
    "• **Weekly health summaries** — \"Summarize [patient]'s health situation this week\"\n"
    "• **Doctor notes** — \"What did the doctor say about [patient] recently?\"\n"
    "• **Upcoming appointments & events** — \"What appointments does [patient] have this week?\"\n"
    "• **Condition overviews** — \"What conditions is [patient] being treated for?\"\n"
    "• **Medication safety** — \"Are there any concerns with [patient]'s current medications?\"\n\n"
    "Just mention the patient's name and what you'd like to know!"
)

# Keywords that signal a health/care-related query
_CARE_KEYWORDS = {
    "medic", "medication", "med", "pill", "dose", "drug", "prescription", "rx",
    "appointment", "appt", "schedule", "event", "visit", "lab", "test",
    "doctor", "dr.", "dr ", "physician", "nurse",
    "note", "notes", "summary", "summari", "brief", "update",
    "condition", "diagnosis", "diagnos", "health", "symptom", "treatment",
    "week", "today", "daily", "morning", "evening",
    "patient", "mom", "dad", "mother", "father", "son", "kid", "child",
    "margaret", "david", "ethan",
    "blood pressure", "bp", "diabetes", "hypertension", "asthma", "cholesterol", "ckd",
    "metformin", "lisinopril", "atorvastatin", "aspirin", "albuterol", "cetirizine",
}


def _is_care_query(text: str) -> bool:
    """Return True if the query is related to caregiving / health topics."""
    lower = text.lower()
    return any(kw in lower for kw in _CARE_KEYWORDS)


def _classify_query(text: str) -> str:
    """
    Classify the user's intent so we can tailor the ASI-1 prompt format.
    Returns one of: 'summary', 'medication', 'schedule', 'notes', 'general'
    """
    lower = text.lower()
    if any(w in lower for w in ("summari", "brief", "overview", "situation", "week", "update", "how is", "how's")):
        return "summary"
    if any(w in lower for w in ("interact", "concern", "safe", "dangerous", "conflict", "drug", "side effect", "reaction")):
        return "medication_safety"
    if any(w in lower for w in ("medic", "pill", "dose", "taking", "prescribed", "prescription", "rx")):
        return "medication"
    if any(w in lower for w in ("appointment", "schedule", "calendar", "upcoming", "visit", "when", "lab", "test")):
        return "schedule"
    if any(w in lower for w in ("note", "doctor said", "dr. said", "what did", "told", "recommend", "instruction")):
        return "notes"
    return "general"


def _build_prompt(patient_id: str | None, query: str = "") -> tuple[str, str]:
    """
    Return (system_prompt, label) for ASI-1 call.
    When a specific patient is detected, ONLY that patient's data is included.
    The prompt format is tailored to the query type for better, more impressive responses.
    """
    query_type = _classify_query(query)

    base = (
        "You are CaregiverAI, an AI health management assistant powered by ASI-1 Mini. "
        "You help caregivers cut through the chaos of managing a loved one's health across multiple providers.\n"
        "RULES: Use ONLY the data provided. Never invent medications, dosages, or diagnoses. "
        "Always surface urgent red flags prominently. End with a one-line reminder to consult the doctor.\n\n"
    )

    # Format instructions change based on what the caregiver is asking
    if query_type == "summary":
        format_instruction = (
            "FORMAT: Write a concise narrative briefing — like a morning report a nurse would give. "
            "Lead with THIS WEEK'S KEY EVENTS and any doctor instructions. "
            "Then briefly cover active conditions and medications. "
            "If doctor notes contain any urgent flags, put them in a ⚠️ ALERT section at the top.\n\n"
        )
    elif query_type == "medication_safety":
        format_instruction = (
            "FORMAT: Perform a medication safety review. "
            "List each medication, then identify any known interaction risks, timing conflicts, or concerns. "
            "Use ✅ for safe, ⚠️ for caution, 🚨 for significant concern. "
            "Be specific — name the drugs involved in any interaction.\n\n"
        )
    elif query_type == "medication":
        format_instruction = (
            "FORMAT: List medications clearly — name, dose, schedule, and any food requirements. "
            "Group by time of day (morning / evening / as needed). Keep it scannable.\n\n"
        )
    elif query_type == "schedule":
        format_instruction = (
            "FORMAT: Present the schedule chronologically by day and time. "
            "Bold appointment types. Flag any labs or specialist visits that require prep.\n\n"
        )
    elif query_type == "notes":
        format_instruction = (
            "FORMAT: Quote the doctor's instructions directly, then explain what the caregiver needs to DO. "
            "Use action items with checkboxes (- [ ]) so the caregiver can act immediately.\n\n"
        )
    else:
        format_instruction = (
            "FORMAT: Answer concisely with bullet points. Lead with the most actionable information.\n\n"
        )

    if patient_id and patient_id in MOCK_DATA:
        d = MOCK_DATA[patient_id]
        system = (
            base
            + format_instruction
            + f"SCOPE: You are ONLY discussing {d['fullName']} ({d['displayName']}). "
            + "Do NOT mention any other patients.\n\n"
            + _format_patient_block(patient_id)
        )
        label = d["fullName"]
    else:
        all_blocks = "\n\n---\n\n".join(_format_patient_block(pid) for pid in MOCK_DATA)
        system = base + format_instruction + "ALL FAMILY PATIENTS:\n\n" + all_blocks
        label = "all patients"

    return system, label


# ---------------------------------------------------------------------------
# MongoDB sync — fetches live data from the FastAPI backend.
# Updates MOCK_DATA in-memory; falls back to hardcoded data if backend is down.
# Runs at startup, every 30 s in the background, and before stale queries.
# ---------------------------------------------------------------------------

# Event types worth surfacing in a weekly brief (skip daily pill reminders)
_MEANINGFUL_EVENT_TYPES = {"appointment", "lab", "vitals", "activity"}

# Tracks the last successful sync so we can detect stale data
_last_sync_time: float = 0.0


def _sync_from_backend() -> bool:
    """
    Pull all patient data from the FastAPI backend (which reads MongoDB) and
    update MOCK_DATA in-place. Returns True on success, False if backend is down.

    NOTE: Backend routes are prefixed with /api (e.g. /api/patients/).
    """
    import requests as req
    from datetime import date, timedelta
    import time

    global _last_sync_time

    try:
        patients_resp = req.get(f"{BACKEND_URL}/api/patients/", timeout=4)
        patients_resp.raise_for_status()
        patients_list = patients_resp.json()
    except Exception:
        return False  # backend not running — keep current MOCK_DATA

    # Current week start (Monday) for event filtering
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_param = week_start.isoformat()

    for p in patients_list:
        pid = p.get("id")
        if not pid:
            continue

        try:
            meds_resp   = req.get(f"{BACKEND_URL}/api/patients/{pid}/medications", timeout=4)
            notes_resp  = req.get(f"{BACKEND_URL}/api/patients/{pid}/notes",       timeout=4)
            events_resp = req.get(
                f"{BACKEND_URL}/api/patients/{pid}/events",
                params={"week": week_param},
                timeout=4,
            )
            meds   = meds_resp.json()   if meds_resp.ok   else []
            notes  = notes_resp.json()  if notes_resp.ok  else []
            events = events_resp.json() if events_resp.ok else []
        except Exception:
            continue  # skip this patient if a sub-request fails

        # Format medications
        formatted_meds = [
            {
                "name":     m.get("name", ""),
                "dose":     m.get("dose", ""),
                "schedule": m.get("schedule", ""),
                "withFood": m.get("withFood", False),
            }
            for m in meds
        ]

        # Format notes
        formatted_notes = [
            {
                "date":   n.get("date", ""),
                "author": n.get("author", ""),
                "body":   n.get("body", ""),
            }
            for n in notes
        ]

        # Filter events — only meaningful types, not daily medication reminders
        formatted_events = []
        for e in events:
            if e.get("type") in _MEANINGFUL_EVENT_TYPES:
                parts = [e.get("date", ""), e.get("time", ""), e.get("title", "")]
                if e.get("subtitle"):
                    parts.append(f"({e['subtitle']})")
                formatted_events.append(" ".join(part for part in parts if part).strip())

        # Update the in-memory store, preserving fallback values if backend returns empty
        if pid not in MOCK_DATA:
            MOCK_DATA[pid] = {}

        existing = MOCK_DATA.get(pid, {})
        MOCK_DATA[pid].update({
            "fullName":      p.get("fullName",      existing.get("fullName",      pid)),
            "displayName":   p.get("displayName",   existing.get("displayName",   pid)),
            "age":           p.get("age",           existing.get("age")),
            "dob":           p.get("dob",           existing.get("dob",           "")),
            "primaryDoctor": p.get("primaryDoctor", existing.get("primaryDoctor", "")),
            "conditions":    [c.get("label") for c in p.get("conditions", [])],
            "medications":   formatted_meds   if formatted_meds   else existing.get("medications",   []),
            "notes":         formatted_notes  if formatted_notes  else existing.get("notes",         []),
            "weekly_events": formatted_events if formatted_events else existing.get("weekly_events", []),
        })

        # Keep PATIENT_NAME_MAP updated for any new patients added through the UI
        first_name = MOCK_DATA[pid]["fullName"].split()[0].lower()
        PATIENT_NAME_MAP[first_name] = pid

    _last_sync_time = time.time()
    return True


def _is_data_stale() -> bool:
    """Return True if patient data hasn't been synced within the stale threshold."""
    import time
    return (time.time() - _last_sync_time) > _STALE_THRESHOLD_SECONDS


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
        await ctx.send(sender, ChatMessage(
            content=[{"type": "text", "text": ABOUT_ME_MESSAGE}],
            msg_id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))
        return
    else:
        ctx.logger.info(f"[ACP] Message from {sender}: {user_text[:120]}")

    # If the query isn't health/care-related at all, explain what this agent does
    if not _is_care_query(user_text):
        ctx.logger.info(f"[ACP] Off-topic query — returning about-me message")
        await ctx.send(sender, ChatMessage(
            content=[{"type": "text", "text": ABOUT_ME_MESSAGE}],
            msg_id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))
        return

    # Refresh data from MongoDB if it's stale before building the response
    if _is_data_stale():
        import asyncio
        refreshed = await asyncio.to_thread(_sync_from_backend)
        ctx.logger.info(f"[ACP] Data was stale — refreshed from MongoDB: {refreshed}")

    # Detect patient and build a scoped, query-aware system prompt
    patient_id = _detect_patient(user_text)
    system_prompt, patient_label = _build_prompt(patient_id, query=user_text)
    ctx.logger.info(f"[ACP] Patient: {patient_label} | Query type: {_classify_query(user_text)}")

    # Add explicit scoping instruction directly in the user turn too
    if patient_id and patient_id in MOCK_DATA:
        patient_name = MOCK_DATA[patient_id]["fullName"]
        augmented_user_text = (
            f"[IMPORTANT: Only discuss {patient_name}. Do not mention any other patients.]\n\n"
            + user_text
        )
    else:
        augmented_user_text = user_text

    try:
        response_text = call_asi1(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": augmented_user_text},
            ],
            max_tokens=700,
            temperature=0.2,
        )
    except Exception as e:
        ctx.logger.error(f"ASI-1 call failed: {e}")
        response_text = ABOUT_ME_MESSAGE

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
