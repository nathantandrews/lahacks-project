from fastapi import APIRouter, HTTPException
from services.mongodb import medications_col
from models.medication import Medication, MedicationCreate
import uuid

router = APIRouter(prefix="/patients", tags=["medications"])


@router.get("/{patient_id}/medications", response_model=list[dict])
async def get_medications(patient_id: str):
    cursor = medications_col().find({"patient_id": patient_id}, {"_id": 0, "patient_id": 0})
    return await cursor.to_list(length=100)


@router.post("/{patient_id}/medications", response_model=dict, status_code=201)
async def add_medication(patient_id: str, body: MedicationCreate):
    doc = {**body.model_dump(), "id": f"m_{uuid.uuid4().hex[:8]}", "patient_id": patient_id}
    await medications_col().insert_one(doc)
    doc.pop("_id", None)
    doc.pop("patient_id", None)
    return doc


@router.delete("/{patient_id}/medications/{med_id}", status_code=204)
async def delete_medication(patient_id: str, med_id: str):
    result = await medications_col().delete_one({"patient_id": patient_id, "id": med_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
