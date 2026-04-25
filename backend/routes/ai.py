"""
AI routes — proxy to the CaregiverAgent for health briefs, medication checks, and general queries.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.mongodb import patients_col, medications_col, notes_col, events_col
from services import agent_client
from datetime import date

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

    notes_cursor = notes_col().find({"patient_id": patient_id}, {"_id": 0, "patient_id": 0}).sort("weekOf", -1).limit(3)
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
