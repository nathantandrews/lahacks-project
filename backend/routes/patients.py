from fastapi import APIRouter, HTTPException, Body
from services.mongodb import (
    patients_col, medications_col, events_col, 
    doctor_notes_col, personal_notes_col, visit_summaries_col
)
from models.patient import Patient, PatientCreate, Condition
import uuid

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/", response_model=list[dict])
async def list_patients():
    cursor = patients_col().find({}, {"_id": 0})
    return await cursor.to_list(length=100)


@router.get("/{patient_id}", response_model=dict)
async def get_patient(patient_id: str):
    doc = await patients_col().find_one({"id": patient_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return doc


@router.patch("/{patient_id}/status", response_model=dict)
async def update_patient_status(patient_id: str, status: str = Body(..., embed=True)):
    """Archive or activate a patient."""
    if status not in ["active", "archived"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await patients_col().update_one(
        {"id": patient_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"id": patient_id, "status": status}


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(patient_id: str):
    """Permanently delete a patient and all their associated data."""
    # 1. Delete associated data first
    query = {"patient_id": patient_id}
    await medications_col().delete_many(query)
    await events_col().delete_many(query)
    await doctor_notes_col().delete_many(query)
    await personal_notes_col().delete_many(query)
    await visit_summaries_col().delete_many(query)
    
    # 2. Delete the patient record
    result = await patients_col().delete_one({"id": patient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")


@router.get("/{patient_id}/conditions", response_model=list[dict])
async def get_patient_conditions(patient_id: str):
    doc = await patients_col().find_one({"id": patient_id}, {"_id": 0, "conditions": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return doc.get("conditions", [])


@router.post("/{patient_id}/conditions", response_model=dict, status_code=201)
async def add_patient_condition(patient_id: str, condition: Condition):
    result = await patients_col().update_one(
        {"id": patient_id},
        {"$push": {"conditions": condition.model_dump()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return condition.model_dump()


@router.post("/", response_model=dict, status_code=201)
async def create_patient(body: PatientCreate):
    new_id = body.fullName.lower().replace(" ", "_") + "_" + uuid.uuid4().hex[:4]
    doc = {**body.model_dump(), "id": new_id, "conditions": []}
    await patients_col().insert_one(doc)
    doc.pop("_id", None)
    return doc
