from fastapi import APIRouter, HTTPException, Query
from services.mongodb import events_col
from models.event import Event, EventCreate, EventUpdate
import uuid

router = APIRouter(prefix="/patients", tags=["events"])


@router.get("/{patient_id}/events", response_model=list[dict])
async def get_events(patient_id: str, week: str = Query(None, description="ISO date for week start (YYYY-MM-DD)")):
    query: dict = {"patient_id": patient_id}
    if week:
        from datetime import date, timedelta
        try:
            start = date.fromisoformat(week)
            end = start + timedelta(days=6)
            query["date"] = {"$gte": str(start), "$lte": str(end)}
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid week date format. Use YYYY-MM-DD.")
    cursor = events_col().find(query, {"_id": 0, "patient_id": 0})
    return await cursor.to_list(length=500)


@router.post("/{patient_id}/events", response_model=dict, status_code=201)
async def add_event(patient_id: str, body: EventCreate):
    doc = {**body.model_dump(), "id": f"e_{uuid.uuid4().hex[:8]}", "patient_id": patient_id}
    await events_col().insert_one(doc)
    doc.pop("_id", None)
    doc.pop("patient_id", None)
    return doc


@router.patch("/{patient_id}/events/{event_id}", response_model=dict)
async def update_event(patient_id: str, event_id: str, body: EventUpdate):
    update_fields = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await events_col().update_one(
        {"patient_id": patient_id, "id": event_id},
        {"$set": update_fields},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    doc = await events_col().find_one(
        {"patient_id": patient_id, "id": event_id}, {"_id": 0, "patient_id": 0}
    )
    return doc


@router.delete("/{patient_id}/events/{event_id}", status_code=204)
async def delete_event(patient_id: str, event_id: str):
    result = await events_col().delete_one({"patient_id": patient_id, "id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
