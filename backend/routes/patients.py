from fastapi import APIRouter, HTTPException
from services.mongodb import patients_col
from models.patient import Patient, PatientCreate
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


@router.get("/{patient_id}/conditions", response_model=list[dict])
async def get_patient_conditions(patient_id: str):
    doc = await patients_col().find_one({"id": patient_id}, {"_id": 0, "conditions": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return doc.get("conditions", [])


@router.post("/", response_model=dict, status_code=201)
async def create_patient(body: PatientCreate):
    new_id = body.fullName.lower().replace(" ", "_") + "_" + uuid.uuid4().hex[:4]
    doc = {**body.model_dump(), "id": new_id, "conditions": []}
    await patients_col().insert_one(doc)
    doc.pop("_id", None)
    return doc
