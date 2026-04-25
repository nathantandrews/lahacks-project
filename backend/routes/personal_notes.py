import uuid
from fastapi import APIRouter, HTTPException
from services.mongodb import personal_notes_col
from models.personal_note import PersonalNoteCreate, PersonalNoteUpdate

router = APIRouter(prefix="/patients", tags=["personal-notes"])


@router.get("/{patient_id}/personal-notes", response_model=list[dict])
async def get_personal_notes(patient_id: str):
    cursor = personal_notes_col().find(
        {"patient_id": patient_id}, {"_id": 0, "patient_id": 0}
    )
    return await cursor.to_list(length=200)


@router.post("/{patient_id}/personal-notes", response_model=dict, status_code=201)
async def add_personal_note(patient_id: str, body: PersonalNoteCreate):
    doc = {
        **body.model_dump(),
        "id": f"pn_{uuid.uuid4().hex[:8]}",
        "patient_id": patient_id,
        "done": False,
    }
    await personal_notes_col().insert_one(doc)
    doc.pop("_id", None)
    doc.pop("patient_id", None)
    return doc


@router.patch("/{patient_id}/personal-notes/{note_id}", response_model=dict)
async def update_personal_note(patient_id: str, note_id: str, body: PersonalNoteUpdate):
    update_fields = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    from datetime import datetime
    update_fields["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    result = await personal_notes_col().update_one(
        {"patient_id": patient_id, "id": note_id},
        {"$set": update_fields},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    doc = await personal_notes_col().find_one(
        {"patient_id": patient_id, "id": note_id}, {"_id": 0, "patient_id": 0}
    )
    return doc


@router.delete("/{patient_id}/personal-notes/{note_id}", status_code=204)
async def delete_personal_note(patient_id: str, note_id: str):
    result = await personal_notes_col().delete_one(
        {"patient_id": patient_id, "id": note_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
