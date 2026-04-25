from pydantic import BaseModel, Field
from typing import Optional
from bson import ObjectId


class Condition(BaseModel):
    id: str
    label: str
    tone: str = "default"


class Patient(BaseModel):
    id: str
    displayName: str
    fullName: str
    initials: str
    avatarColor: str = "var(--avatar-default)"
    age: int
    dob: str
    primaryDoctor: str
    conditions: list[Condition] = []


class PatientCreate(BaseModel):
    displayName: str
    fullName: str
    initials: str
    avatarColor: str = "var(--avatar-default)"
    age: int
    dob: str
    primaryDoctor: str
