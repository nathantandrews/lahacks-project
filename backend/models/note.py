from pydantic import BaseModel
from typing import Optional


class DoctorNote(BaseModel):
    id: str
    weekOf: str          # ISO date string for the week start
    author: str
    date: str            # Display date e.g. "04/22"
    body: str            # Original raw text
    structured: dict = {}  # ASI-1 analysis result


class DoctorNoteCreate(BaseModel):
    weekOf: str
    author: str
    date: str
    body: str
