"""
AI routes — proxy to the CaregiverAgent for health briefs, medication checks, and general queries.
Also exposes /chat for the frontend chat widget, calling ASI-1 Mini directly.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.mongodb import patients_col, medications_col, doctor_notes_col, events_col, visit_summaries_col
from services import agent_client
from services.asi1 import call_asi1, build_system_prompt, _detect_patient, _format_block, generate_weekly_summary
from datetime import date, timedelta, datetime, timezone

router = APIRouter(prefix="/ai", tags=["ai"])


class QueryRequest(BaseModel):
    text: str


@router.post("/query/{patient_id}")
async def ai_query(patient_id: str, body: QueryRequest):
    """Send a natural-language question to the CaregiverAgent about a patient."""
    try:
        result = await agent_client.general_query(body.text, patient_id=patient_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agent unavailable: {e}")


@router.post("/health-brief/{patient_id}")
async def health_brief(patient_id: str):
    """
    Fetch patient context from MongoDB and generate a daily health brief via ASI-1 Mini.
    """
    patient = await patients_col().find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    meds_cursor = medications_col().find({"patient_id": patient_id}, {"_id": 0, "patient_id": 0})
    medications = await meds_cursor.to_list(length=50)

    today = str(date.today())
    events_cursor = events_col().find({"patient_id": patient_id, "date": today}, {"_id": 0, "patient_id": 0})
    todays_events = await events_cursor.to_list(length=50)

    notes_cursor = doctor_notes_col().find({"patient_id": patient_id}, {"_id": 0, "patient_id": 0}).sort("weekOf", -1).limit(3)
    recent_notes = await notes_cursor.to_list(length=3)

    patient_context = {
        "name": patient.get("displayName", patient_id),
        "age": patient.get("age"),
        "primaryDoctor": patient.get("primaryDoctor"),
        "conditions": patient.get("conditions", []),
        "medications": medications,
        "todays_events": todays_events,
        "recent_notes": [{"author": n.get("author"), "date": n.get("date"), "body": n.get("body")} for n in recent_notes],
    }

    try:
        result = await agent_client.get_health_brief(patient_context)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agent unavailable: {e}")


@router.post("/medication-check/{patient_id}")
async def medication_check(patient_id: str):
    """Run a medication safety/interaction check for a patient's current medication list."""
    cursor = medications_col().find({"patient_id": patient_id}, {"_id": 0, "patient_id": 0})
    medications = await cursor.to_list(length=50)

    if not medications:
        raise HTTPException(status_code=404, detail="No medications found for this patient")

    try:
        result = await agent_client.check_medications(medications)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agent unavailable: {e}")


# ---------------------------------------------------------------------------
# Chat endpoint — used by the frontend chat widget
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    viewed_patient_id: Optional[str] = None  # patient the user is currently viewing


@router.post("/chat")
async def chat(body: ChatRequest):
    """
    Frontend chat widget → ASI-1 Mini.
    Fetches live patient data from MongoDB, builds context, calls ASI-1 Mini,
    and returns the response. Patient context is scoped to whoever is mentioned
    in the message (or all patients if none is specified).
    """
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Load all patients from MongoDB
    try:
        patients_list = await patients_col().find({}, {"_id": 0}).to_list(length=20)
    except Exception:
        patients_list = []

    # Current week for event filtering
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    # Detect which patient the message is about
    target_patient = _detect_patient(message, patients_list)

    # If no patient mentioned in message, default to the one being viewed
    if not target_patient and body.viewed_patient_id:
        target_patient = next(
            (p for p in patients_list if p.get("id") == body.viewed_patient_id), None
        )

    # Fetch context blocks (only for target patient if detected, otherwise all)
    scope = [target_patient] if target_patient else patients_list
    context_blocks = []
    for p in scope:
        pid = p.get("id")
        try:
            meds = await medications_col().find(
                {"patient_id": pid}, {"_id": 0, "patient_id": 0}
            ).to_list(length=30)
            patient_notes = await doctor_notes_col().find(
                {"patient_id": pid}, {"_id": 0, "patient_id": 0}
            ).sort("weekOf", -1).limit(3).to_list(length=3)
            events = await events_col().find(
                {
                    "patient_id": pid,
                    "date": {"$gte": str(week_start), "$lte": str(week_end)},
                },
                {"_id": 0, "patient_id": 0},
            ).to_list(length=100)
        except Exception:
            meds, patient_notes, events = [], [], []

        context_blocks.append(_format_block(p, meds, patient_notes, events))

    # Get the name of the currently-viewed patient for context hinting
    viewed_name = None
    if body.viewed_patient_id and not target_patient:
        vp = next((p for p in patients_list if p.get("id") == body.viewed_patient_id), None)
        viewed_name = vp.get("fullName") if vp else None

    system_prompt = build_system_prompt(
        message=message,
        target_patient=target_patient,
        all_context_blocks=context_blocks,
        viewed_patient_name=viewed_name,
    )

    try:
        response_text = await call_asi1(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
            max_tokens=700,
            temperature=0.2,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ASI-1 Mini unavailable: {e}")

    return {
        "response": response_text,
        "patient_used": target_patient.get("fullName") if target_patient else "all patients",
    }


# ---------------------------------------------------------------------------
# Weekly notes summary — AI-generated summary of all doctor's notes
# ---------------------------------------------------------------------------

async def _build_and_cache_summary(patient_id: str) -> dict:
    """
    Internal helper: fetch all notes for a patient, generate an AI summary,
    store it in visit_summaries_col, and return it.
    """
    patient = await patients_col().find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        return {}

    cursor = doctor_notes_col().find(
        {"patient_id": patient_id}, {"_id": 0, "patient_id": 0}
    ).sort("weekOf", -1).limit(10)
    notes = await cursor.to_list(length=10)

    if not notes:
        return {}

    structured = await generate_weekly_summary(patient, notes)

    record = {
        "patient_id": patient_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "note_count": len(notes),
        "structured": structured,
        # Only include sources with real text — skip PDF uploads that failed OCR
        "sources": [
            {"author": n.get("author", ""), "date": n.get("date", ""), "body": n.get("body", "")[:300]}
            for n in notes
            if n.get("body", "").strip() and len(n.get("body", "").strip()) >= 30
        ],
    }

    # Upsert — replace the existing summary for this patient
    await visit_summaries_col().replace_one(
        {"patient_id": patient_id},
        record,
        upsert=True,
    )
    record.pop("_id", None)
    return record


@router.get("/weekly-summary/{patient_id}")
async def get_weekly_summary(patient_id: str):
    """
    Return the cached AI summary for a patient's doctor notes.
    If no cache exists yet, generates one on the spot.
    """
    cached = await visit_summaries_col().find_one(
        {"patient_id": patient_id}, {"_id": 0}
    )
    if cached:
        return cached

    # No cache — generate now
    try:
        result = await _build_and_cache_summary(patient_id)
        return result or {"structured": {}, "sources": []}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Summary generation failed: {e}")


@router.post("/weekly-summary/{patient_id}")
async def regenerate_weekly_summary(patient_id: str):
    """
    Force-regenerate the AI weekly summary for a patient.
    Called automatically after a new doctor's note is added.
    """
    try:
        result = await _build_and_cache_summary(patient_id)
        return result or {"structured": {}, "sources": []}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Summary generation failed: {e}")
