import os
import uuid
import pytesseract
from PIL import Image

# Point directly at the Tesseract executable on Windows so PATH doesn't matter
if os.name == "nt":
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
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


@router.delete("/{patient_id}/notes/{note_id}", status_code=204)
async def delete_note(patient_id: str, note_id: str, background_tasks: BackgroundTasks):
    result = await doctor_notes_col().delete_one({"patient_id": patient_id, "id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    background_tasks.add_task(_trigger_summary, patient_id)


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

    try:
        if file.content_type == "application/pdf":
            # First try direct text extraction (works for normal PDFs, no system deps)
            try:
                from pypdf import PdfReader
                reader = PdfReader(BytesIO(raw_bytes))
                for page in reader.pages:
                    page_text = page.extract_text() or ""
                    if page_text.strip():
                        raw_text += page_text.strip() + "\n\n"
            except Exception:
                pass

            # If no text found (scanned PDF), fall back to OCR via pdf2image
            if not raw_text.strip():
                try:
                    import pdf2image
                    images = pdf2image.convert_from_bytes(raw_bytes)
                    for img in images:
                        page_text = pytesseract.image_to_string(img).strip()
                        if page_text:
                            raw_text += page_text + "\n\n"
                except Exception as e:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Could not extract text from PDF. Try uploading a non-scanned PDF or a JPG/PNG image instead. ({e})"
                    )
        else:
            image = Image.open(BytesIO(raw_bytes))
            raw_text = pytesseract.image_to_string(image).strip()
    except HTTPException:
        raise
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
