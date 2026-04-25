"""
ASI-1 Mini client for the FastAPI backend.
Mirrors the logic in caregiver-agent/asi1_client.py but uses httpx (async).
"""
import os
import httpx
from datetime import date, timedelta
from dotenv import load_dotenv

load_dotenv()

ASI1_API_KEY = os.getenv("ASI1_API_KEY", "")
ASI1_BASE_URL = "https://api.asi1.ai/v1"
MODEL = "asi1"

# Event types worth surfacing (skip daily pill reminders)
_MEANINGFUL_EVENT_TYPES = {"appointment", "lab", "vitals", "activity"}


def _headers() -> dict:
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {ASI1_API_KEY}",
    }


async def call_asi1(messages: list[dict], max_tokens: int = 700, temperature: float = 0.2) -> str:
    """Async call to ASI-1 Mini. Returns the response text."""
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
        "stream": False,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{ASI1_BASE_URL}/chat/completions",
            headers=_headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


def _classify(text: str) -> str:
    lower = text.lower()
    if any(w in lower for w in ("summari", "brief", "overview", "situation", "week", "update", "how is", "how's")):
        return "summary"
    if any(w in lower for w in ("interact", "concern", "safe", "dangerous", "drug", "side effect", "reaction")):
        return "medication_safety"
    if any(w in lower for w in ("medic", "pill", "dose", "taking", "prescribed")):
        return "medication"
    if any(w in lower for w in ("appointment", "schedule", "calendar", "upcoming", "lab", "test", "when")):
        return "schedule"
    if any(w in lower for w in ("note", "doctor said", "what did", "told", "recommend", "instruction")):
        return "notes"
    return "general"


def _detect_patient(text: str, patients: list[dict]) -> dict | None:
    """Return the patient dict if a patient name/alias is mentioned."""
    lower = text.lower()
    aliases = {"mom": None, "mother": None, "dad": None, "father": None, "son": None, "kid": None}
    for p in patients:
        first = p.get("fullName", "").split()[0].lower()
        if first in lower:
            return p
        display = p.get("displayName", "").lower()
        if any(alias in display and alias in lower for alias in aliases):
            return p
    return None


def _format_block(patient: dict, meds: list, notes: list, events: list) -> str:
    """Format a patient's full data as a context block for ASI-1."""
    conditions = "\n".join(
        f"  • {c.get('label', c) if isinstance(c, dict) else c}"
        for c in patient.get("conditions", [])
    ) or "  None on file"

    meds_text = "\n".join(
        f"  • {m.get('name')} {m.get('dose')} — {m.get('schedule')}"
        + (" (take with food)" if m.get("withFood") else "")
        for m in meds
    ) or "  None on file"

    notes_text = "\n".join(
        f"  • [{n.get('date', '')}] {n.get('author', '')}: {n.get('body', '')}"
        for n in notes
    ) or "  No recent doctor notes"

    # Filter to meaningful events only
    filtered = [
        f"  • {e.get('date','')} {e.get('time','')} — {e.get('title','')} {('(' + e['subtitle'] + ')') if e.get('subtitle') else ''}".strip()
        for e in events
        if e.get("type") in _MEANINGFUL_EVENT_TYPES
    ]
    events_text = "\n".join(filtered) or "  No scheduled events this week"

    return (
        f"PATIENT: {patient.get('fullName')} | Age: {patient.get('age')} | "
        f"Doctor: {patient.get('primaryDoctor')}\n\n"
        f"CONDITIONS:\n{conditions}\n\n"
        f"CURRENT MEDICATIONS:\n{meds_text}\n\n"
        f"THIS WEEK'S SCHEDULE:\n{events_text}\n\n"
        f"RECENT DOCTOR NOTES:\n{notes_text}"
    )


def _is_meaningful_note_body(body: str) -> bool:
    """
    Return True only if the note body contains real clinical text.
    Rejects: empty strings, bare filenames (e.g. "note.pdf"), very short blobs.
    """
    body = body.strip()
    if len(body) < 30:
        return False
    # Looks like just a filename
    if body.lower().endswith((".pdf", ".png", ".jpg", ".jpeg", ".webp")):
        return False
    # Contains at least one space (filenames usually don't)
    if " " not in body:
        return False
    return True


async def generate_weekly_summary(patient: dict, notes: list[dict]) -> dict:
    """
    Synthesize a patient's doctor notes into a structured weekly summary.
    Returns: { summary, action_items, concerns, vitals }
    """
    import re as _re
    import json as _json

    if not notes:
        return {}

    name = patient.get("fullName", "the patient")
    conditions = ", ".join(
        c.get("label", c) if isinstance(c, dict) else c
        for c in patient.get("conditions", [])
    ) or "not specified"

    # Only include notes with real clinical content — skip PDF-upload failures,
    # empty bodies, and bare filenames
    valid_notes = [
        n for n in notes
        if _is_meaningful_note_body(n.get("body", ""))
    ]

    if not valid_notes:
        return {}

    notes_block = "\n\n".join(
        f"=== Note {i+1} | {n.get('author', 'Doctor')} | {n.get('date', 'this week')} ===\n{n.get('body', '').strip()}"
        for i, n in enumerate(valid_notes)
    )

    # Single-note vs multi-note prompts — single note needs different framing
    # to avoid the model just paraphrasing the whole thing
    if len(valid_notes) == 1:
        task = (
            "Extract the 3-5 most important caregiver actions and warnings from this note. "
            "Write the summary as ONE sentence describing the patient's overall health focus this week "
            "(do NOT list or repeat the instructions — just give the big picture). "
            "Then list the specific actions, concerns, and vitals separately."
        )
    else:
        task = (
            f"Synthesize these {len(valid_notes)} notes into a unified summary. "
            "The summary should be 2 sentences capturing the overall health picture across ALL notes. "
            "Do NOT focus on just one note. Combine and deduplicate the action items and concerns."
        )

    system = (
        "You are a medical note summarization engine for caregivers. "
        "Your output is a JSON object. You must follow the rules exactly.\n\n"
        "RULES:\n"
        "1. The 'summary' field must be your OWN sentence(s) — never copy text from the notes.\n"
        "2. 'action_items' = concrete tasks for the caregiver to do this week.\n"
        "3. 'concerns' = symptoms or warning signs to watch for.\n"
        "4. 'vitals' = specific measurements to track (include thresholds if given).\n"
        "5. Each list item must be one clear sentence — no bullet symbols, no dashes.\n"
        "6. Return ONLY the raw JSON object. No markdown, no code fences, no preamble.\n\n"
        'OUTPUT FORMAT: {"summary":"...","action_items":["..."],"concerns":["..."],"vitals":["..."]}'
    )

    user = (
        f"Patient: {name}\n"
        f"Active conditions: {conditions}\n\n"
        f"Doctor notes:\n{notes_block}\n\n"
        f"{task}"
    )

    raw = await call_asi1(
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        max_tokens=450,
        temperature=0.2,
    )

    # Strip markdown fences if present
    clean = _re.sub(r"```(?:json)?|```", "", raw).strip()

    # Extract just the JSON object in case the model added preamble text
    json_match = _re.search(r'\{.*\}', clean, _re.DOTALL)
    if json_match:
        clean = json_match.group(0)

    try:
        result = _json.loads(clean)
        return {
            "summary":      result.get("summary", ""),
            "action_items": [a for a in result.get("action_items", []) if a],
            "concerns":     [c for c in result.get("concerns", []) if c],
            "vitals":       [v for v in result.get("vitals", []) if v],
        }
    except Exception:
        return {
            "summary": f"Review the {len(valid_notes)} doctor note(s) below for this week's care instructions.",
            "action_items": [],
            "concerns": [],
            "vitals": [],
        }


def build_system_prompt(
    message: str,
    target_patient: dict | None,
    all_context_blocks: list[str],
    viewed_patient_name: str | None = None,
) -> str:
    """Build a query-type-aware system prompt for the chat endpoint."""
    qt = _classify(message)

    base = (
        "You are CaregiverAI, an AI health management assistant powered by ASI-1 Mini. "
        "You help caregivers manage their loved ones' health across multiple providers.\n"
        "RULES: Use ONLY the patient data provided. Never invent medications or diagnoses. "
        "Surface urgent red flags prominently. End with a brief reminder to consult the doctor.\n\n"
    )

    fmt = {
        "summary": (
            "FORMAT: Write a concise narrative briefing like a morning report. "
            "Lead with THIS WEEK'S KEY EVENTS and doctor instructions. "
            "If doctor notes contain urgent flags, show a ⚠️ ALERT section first.\n\n"
        ),
        "medication_safety": (
            "FORMAT: Perform a medication safety review. "
            "Use ✅ safe, ⚠️ caution, 🚨 concern. Name specific drugs in any interaction.\n\n"
        ),
        "medication": (
            "FORMAT: List medications by time of day (morning / evening / as needed). "
            "Include name, dose, schedule, and food requirements.\n\n"
        ),
        "schedule": (
            "FORMAT: List events chronologically by date and time. "
            "Flag labs or specialist visits that may require prep.\n\n"
        ),
        "notes": (
            "FORMAT: Quote doctor instructions directly, then list caregiver action items "
            "as checkboxes (- [ ]) so they can act immediately.\n\n"
        ),
        "general": "FORMAT: Answer concisely with bullet points. Lead with the most actionable info.\n\n",
    }.get(qt, "FORMAT: Answer concisely with bullet points.\n\n")

    if target_patient:
        scope = (
            f"SCOPE: You are ONLY discussing {target_patient.get('fullName')}. "
            "Do NOT mention any other patients.\n\n"
        )
        data = all_context_blocks[0] if all_context_blocks else ""
        return base + fmt + scope + data
    else:
        context = viewed_patient_name or "the family"
        hint = f"The caregiver is currently viewing {context}'s profile.\n\n" if viewed_patient_name else ""
        return base + fmt + hint + "ALL FAMILY PATIENTS:\n\n" + "\n\n---\n\n".join(all_context_blocks)
