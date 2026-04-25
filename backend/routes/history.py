"""
History routes — aggregated timeline of doctor's notes, visit summaries, and medications
for a patient's history page.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.mongodb import doctor_notes_col, visit_summaries_col, medications_col
from models.visit_summary import VisitSummaryCreate

router = APIRouter(prefix="/patients", tags=["history"])


# ──────────────────────────────────────────────
# Doctor's Notes History
# ──────────────────────────────────────────────

@router.get("/{patient_id}/history/notes", response_model=list[dict])
async def get_notes_history(
    patient_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sort: str = Query("desc", regex="^(asc|desc)$"),
):
    """Return all doctor's notes for a patient, sorted by date, with pagination."""
    sort_dir = -1 if sort == "desc" else 1
    cursor = (
        doctor_notes_col()
        .find({"patient_id": patient_id}, {"_id": 0, "patient_id": 0})
        .sort("weekOf", sort_dir)
        .skip(skip)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


# ──────────────────────────────────────────────
# After-Visit Summaries
# ──────────────────────────────────────────────

@router.get("/{patient_id}/history/visits", response_model=list[dict])
async def get_visit_summaries(
    patient_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sort: str = Query("desc", regex="^(asc|desc)$"),
):
    """Return all visit summaries for a patient, sorted by date, with pagination."""
    sort_dir = -1 if sort == "desc" else 1
    cursor = (
        visit_summaries_col()
        .find({"patient_id": patient_id}, {"_id": 0, "patient_id": 0})
        .sort("date", sort_dir)
        .skip(skip)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


@router.post("/{patient_id}/history/visits", response_model=dict, status_code=201)
async def create_visit_summary(patient_id: str, body: VisitSummaryCreate):
    """Create a new after-visit summary."""
    doc = {
        **body.model_dump(),
        "id": f"vs_{uuid.uuid4().hex[:8]}",
        "patient_id": patient_id,
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }
    await visit_summaries_col().insert_one(doc)
    doc.pop("_id", None)
    doc.pop("patient_id", None)
    return doc


@router.get("/{patient_id}/history/visits/{visit_id}", response_model=dict)
async def get_visit_summary(patient_id: str, visit_id: str):
    """Get a single visit summary by ID."""
    doc = await visit_summaries_col().find_one(
        {"patient_id": patient_id, "id": visit_id}, {"_id": 0, "patient_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Visit summary not found")
    return doc


@router.delete("/{patient_id}/history/visits/{visit_id}", status_code=204)
async def delete_visit_summary(patient_id: str, visit_id: str):
    """Delete a visit summary."""
    result = await visit_summaries_col().delete_one(
        {"patient_id": patient_id, "id": visit_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Visit summary not found")


# ──────────────────────────────────────────────
# Medications History
# ──────────────────────────────────────────────

@router.get("/{patient_id}/history/medications", response_model=list[dict])
async def get_medications_history(
    patient_id: str,
    status: Optional[str] = Query(None, regex="^(active|discontinued)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Return medications for a patient.
    Optionally filter by status: 'active' or 'discontinued'.
    """
    query: dict = {"patient_id": patient_id}
    if status:
        query["status"] = status
    cursor = (
        medications_col()
        .find(query, {"_id": 0, "patient_id": 0})
        .skip(skip)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


# ──────────────────────────────────────────────
# Unified Timeline
# ──────────────────────────────────────────────

@router.get("/{patient_id}/history", response_model=list[dict])
async def get_full_history(
    patient_id: str,
    limit: int = Query(50, ge=1, le=200),
):
    """
    Return a merged, reverse-chronological timeline of all history items
    (doctor's notes, visit summaries, and medication changes) for a patient.
    """
    # Fetch all three in parallel
    import asyncio

    notes_task = doctor_notes_col().find(
        {"patient_id": patient_id}, {"_id": 0, "patient_id": 0}
    ).sort("weekOf", -1).limit(limit).to_list(length=limit)

    visits_task = visit_summaries_col().find(
        {"patient_id": patient_id}, {"_id": 0, "patient_id": 0}
    ).sort("date", -1).limit(limit).to_list(length=limit)

    meds_task = medications_col().find(
        {"patient_id": patient_id}, {"_id": 0, "patient_id": 0}
    ).limit(limit).to_list(length=limit)

    notes, visits, meds = await asyncio.gather(notes_task, visits_task, meds_task)

    # Tag each item with a category and normalize a sortable date
    timeline = []
    for n in notes:
        n["_category"] = "doctor_note"
        n["_sortDate"] = n.get("weekOf", "")
        timeline.append(n)
    for v in visits:
        v["_category"] = "visit_summary"
        v["_sortDate"] = v.get("date", "")
        timeline.append(v)
    for m in meds:
        m["_category"] = "medication"
        m["_sortDate"] = m.get("startedAt", m.get("createdAt", ""))
        timeline.append(m)

    # Sort newest first, then trim
    timeline.sort(key=lambda x: x.get("_sortDate", ""), reverse=True)
    return timeline[:limit]
