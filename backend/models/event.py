from pydantic import BaseModel
from typing import Optional, Literal


EventType = Literal["medication", "appointment", "vitals", "activity", "meal", "lab"]


class Event(BaseModel):
    id: str
    date: str          # ISO date string: "2026-04-24"
    startTime: str     # "HH:MM"
    endTime: str       # "HH:MM"
    title: str
    subtitle: str = ""
    type: EventType = "appointment"
    repeat: Optional[str] = "none"
    repeatIntervalDays: Optional[int] = None
    repeatEndDate: Optional[str] = None


class EventCreate(BaseModel):
    date: str
    startTime: str
    endTime: str
    title: str
    subtitle: str = ""
    type: EventType = "appointment"
    repeat: Optional[str] = "none"
    repeatIntervalDays: Optional[int] = None
    repeatEndDate: Optional[str] = None


class EventUpdate(BaseModel):
    date: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    type: Optional[EventType] = None
    repeat: Optional[str] = None
    repeatIntervalDays: Optional[int] = None
    repeatEndDate: Optional[str] = None
