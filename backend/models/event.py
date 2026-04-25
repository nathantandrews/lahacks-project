from pydantic import BaseModel
from typing import Optional, Literal


EventType = Literal["medication", "appointment", "vitals", "activity", "meal", "lab"]


class Event(BaseModel):
    id: str
    date: str          # ISO date string: "2026-04-24"
    time: str          # "HH:MM"
    title: str
    subtitle: str = ""
    type: EventType = "appointment"


class EventCreate(BaseModel):
    date: str
    time: str
    title: str
    subtitle: str = ""
    type: EventType = "appointment"
