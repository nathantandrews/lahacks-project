from pydantic import BaseModel
from typing import Optional


class VisitSummary(BaseModel):
    id: str
    date: str              # ISO date e.g. "2026-04-22"
    doctor: str
    location: Optional[str] = None
    reason: str            # e.g. "Routine checkup", "Follow-up"
    summary: str           # Body text of the visit summary
    followUp: Optional[str] = None  # Next steps / follow-up instructions
    createdAt: str         # ISO timestamp


class VisitSummaryCreate(BaseModel):
    date: str
    doctor: str
    location: Optional[str] = None
    reason: str
    summary: str
    followUp: Optional[str] = None
