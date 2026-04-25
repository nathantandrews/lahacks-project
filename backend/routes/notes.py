import os
import uuid
import pytesseract
from PIL import Image
from io import BytesIO
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from services.mongodb import doctor_notes_col
from models.note import DoctorNote, DoctorNoteCreate

router = APIRouter(prefix="/patients", tags=["notes"])


async def _trigger_summary(patient_id: str):
    """Background task: regenerate the AI weekly summary after a note is added."""
    try:
        from routes.ai import _build_and_cache_summary
        await _build_and_cache_summary(patient_id)
    except Exception:
        pass  # summary generation is best-effort; don't fail the note upload

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"}


@router.get("/{patient_id}/notes", response_model=list[dict])
async def get_notes(patient_id: str):
    cursor = doctor_notes_col().find({"patient_id": patient_id}, {"_id": 0, "patient_id": 0})
    return await cursor.to_list(length=50)


@router.post("/{patient_id}/notes", response_model=dict, status_code=201)
async def add_note(patient_id: str, body: DoctorNoteCreate, background_tasks: BackgroundTasks):
    doc = {**body.model_dump(), "id": f"n_{uuid.uuid4().hex[:8]}", "patient_id": patient_id, "structured": {}}
    await doctor_notes_col().insert_one(doc)
    doc.pop("_id", None)
    doc.pop("patient_id", None)
    background_tasks.add_task(_trigger_summary, patient_id)
    return doc


@router.post("/{patient_id}/notes/upload", response_model=dict, status_code=201)
async def upload_note_image(
    patient_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    author: str = Form("Unknown Doctor"),
    week_of: str = Form(""),
):
    """
    Accept an image or PDF of a doctor's note, OCR it, then send to CaregiverAgent
    for structured analysis via ASI-1 Mini.
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Upload JPEG, PNG, WebP, or PDF.",
        )

    raw_bytes = await file.read()
    raw_text = ""

    # OCR the image or PDF
    try:
        if file.content_type == "application/pdf":
            import pdf2image
            # Convert PDF pages to images (requires poppler-utils)
            images = pdf2image.convert_from_bytes(raw_bytes)
            for img in images:
                page_text = pytesseract.image_to_string(img).strip()
                if page_text:
                    raw_text += page_text + "\n\n"
        else:
            image = Image.open(BytesIO(raw_bytes))
            raw_text = pytesseract.image_to_string(image).strip()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"OCR failed: {e}")

    if not raw_text:
        raise HTTPException(status_code=422, detail="No text could be extracted from the document.")

    # Send to agent for structured analysis
    from services.agent_client import analyze_note
    try:
        analysis = await analyze_note(raw_text=raw_text, patient_id=patient_id)
        structured = analysis.get("data", {})
    except Exception:
        structured = {}

    from datetime import date
    doc = {
        "id": f"n_{uuid.uuid4().hex[:8]}",
        "patient_id": patient_id,
        "weekOf": week_of or str(date.today()),
        "author": author,
        "date": date.today().strftime("%m/%d"),
        "body": raw_text,
        "structured": structured,
    }
    await doctor_notes_col().insert_one(doc)
    doc.pop("_id", None)
    doc.pop("patient_id", None)
    background_tasks.add_task(_trigger_summary, patient_id)
    return doc
