from pydantic import BaseModel
from typing import Optional


class Medication(BaseModel):
    id: str
    name: str
    dose: str
    schedule: str
    withFood: bool = False
    startDate: Optional[str] = None
    refillDate: Optional[str] = None
    endDate: Optional[str] = None


class MedicationCreate(BaseModel):
    name: str
    dose: str
    schedule: str
    withFood: bool = False
    startDate: Optional[str] = None
    refillDate: Optional[str] = None
    endDate: Optional[str] = None
