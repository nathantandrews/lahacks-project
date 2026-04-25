"""
MongoDB connection and collection helpers using Motor (async driver).
Collections mirror the mockData.js shape so the frontend needs minimal changes.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "caregiver_hub")

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    return _client


def get_db():
    return get_client()[DB_NAME]


def get_collection(name: str):
    return get_db()[name]


# Collection accessors
def patients_col():
    return get_collection("patients")

def medications_col():
    return get_collection("medications")

def events_col():
    return get_collection("events")

def notes_col():
    return get_collection("notes")


async def seed_mock_data():
    """
    Seed the database with the mock data from the frontend if collections are empty.
    Run once on startup.
    """
    db = get_db()

    if await db.patients.count_documents({}) == 0:
        await db.patients.insert_many([
            {
                "id": "margaret",
                "displayName": "Mom (Margaret)",
                "fullName": "Margaret Williams",
                "initials": "MW",
                "avatarColor": "var(--avatar-margaret)",
                "age": 72,
                "dob": "03/14/1953",
                "primaryDoctor": "Dr. Chen",
                "conditions": [
                    {"id": "c1", "label": "Type 2 diabetes", "tone": "diabetes"},
                    {"id": "c2", "label": "Hypertension", "tone": "hypertension"},
                    {"id": "c3", "label": "Early-stage CKD", "tone": "ckd"},
                    {"id": "c4", "label": "Osteoarthritis", "tone": "ortho"},
                ],
            },
            {
                "id": "david",
                "displayName": "Dad (David)",
                "fullName": "David Williams",
                "initials": "DW",
                "avatarColor": "var(--avatar-david)",
                "age": 74,
                "dob": "07/02/1951",
                "primaryDoctor": "Dr. Patel",
                "conditions": [
                    {"id": "c5", "label": "Hypertension", "tone": "hypertension"},
                    {"id": "c6", "label": "High cholesterol", "tone": "diabetes"},
                ],
            },
            {
                "id": "ethan",
                "displayName": "Ethan (son)",
                "fullName": "Ethan Williams",
                "initials": "EL",
                "avatarColor": "var(--avatar-ethan)",
                "age": 9,
                "dob": "11/22/2016",
                "primaryDoctor": "Dr. Rivera",
                "conditions": [
                    {"id": "c7", "label": "Asthma", "tone": "ckd"},
                    {"id": "c8", "label": "Seasonal allergies", "tone": "ortho"},
                ],
            },
        ])

    if await db.medications.count_documents({}) == 0:
        await db.medications.insert_many([
            {"patient_id": "margaret", "id": "m1", "name": "Metformin", "dose": "500mg", "schedule": "2x daily", "withFood": True},
            {"patient_id": "margaret", "id": "m2", "name": "Lisinopril", "dose": "10mg", "schedule": "1x morning", "withFood": False},
            {"patient_id": "margaret", "id": "m3", "name": "Atorvastatin", "dose": "20mg", "schedule": "1x evening", "withFood": False},
            {"patient_id": "margaret", "id": "m4", "name": "Aspirin", "dose": "81mg", "schedule": "1x daily", "withFood": True},
            {"patient_id": "margaret", "id": "m5", "name": "Vitamin D3", "dose": "2000 IU", "schedule": "1x daily", "withFood": True},
            {"patient_id": "margaret", "id": "m6", "name": "Tylenol", "dose": "500mg", "schedule": "as needed", "withFood": False},
            {"patient_id": "david", "id": "m7", "name": "Lisinopril", "dose": "20mg", "schedule": "1x morning", "withFood": False},
            {"patient_id": "david", "id": "m8", "name": "Rosuvastatin", "dose": "10mg", "schedule": "1x evening", "withFood": False},
            {"patient_id": "ethan", "id": "m9", "name": "Albuterol inhaler", "dose": "90mcg", "schedule": "as needed", "withFood": False},
            {"patient_id": "ethan", "id": "m10", "name": "Cetirizine", "dose": "5mg", "schedule": "1x daily", "withFood": False},
        ])

    if await db.notes.count_documents({}) == 0:
        await db.notes.insert_one({
            "patient_id": "margaret",
            "id": "n1",
            "weekOf": "2026-04-20",
            "author": "Dr. Chen",
            "date": "04/22",
            "body": "Watch for swelling in ankles — may indicate fluid retention. Check blood pressure daily this week and log readings. Schedule follow-up if systolic stays above 140.",
            "structured": {},
        })
