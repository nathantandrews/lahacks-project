from pydantic import BaseModel
from typing import Optional


class PersonalNote(BaseModel):
    id: str
    body: str
    createdAt: str
    updatedAt: Optional[str] = None
    remindAt: Optional[str] = None
    done: bool = False


class PersonalNoteCreate(BaseModel):
    body: str
    createdAt: str
    remindAt: Optional[str] = None


class PersonalNoteUpdate(BaseModel):
    body: Optional[str] = None
    remindAt: Optional[str] = None
    done: Optional[bool] = None
