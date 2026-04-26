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

def doctor_notes_col():
    return get_collection("doctor-notes")

def personal_notes_col():
    return get_collection("personal-notes")

def visit_summaries_col():
    return get_collection("visit-summaries")


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

    if await db["doctor-notes"].count_documents({}) == 0:
        await db["doctor-notes"].insert_one({
            "patient_id": "margaret",
            "id": "n1",
            "weekOf": "2026-04-20",
            "author": "Dr. Chen",
            "date": "04/22",
            "body": "Watch for swelling in ankles — may indicate fluid retention. Check blood pressure daily this week and log readings. Schedule follow-up if systolic stays above 140.",
            "structured": {
                "summary": "Check blood pressure daily; watch for ankle swelling (fluid retention). Follow up if systolic > 140.",
                "vitals": "Daily BP log",
                "concerns": "Ankle swelling"
            },
        })

    if await db.events.count_documents({}) == 0:
        await db.events.insert_many([
            # Daily medications and checks
            {"patient_id": "margaret", "id": "e-daily-metformin", "date": "2026-04-20", "startTime": "08:00", "endTime": "08:15", "title": "Metformin", "type": "medication", "repeat": "daily"},
            {"patient_id": "margaret", "id": "e-daily-bp", "date": "2026-04-20", "startTime": "08:00", "endTime": "08:15", "title": "BP check", "type": "vitals", "repeat": "daily"},
            {"patient_id": "margaret", "id": "e-daily-lunch", "date": "2026-04-20", "startTime": "12:00", "endTime": "13:00", "title": "Lunch + log", "type": "meal", "repeat": "daily"},
            {"patient_id": "margaret", "id": "e-daily-dinner", "date": "2026-04-20", "startTime": "18:00", "endTime": "18:15", "title": "Dinner meds", "type": "medication", "repeat": "daily"},
            {"patient_id": "margaret", "id": "e-daily-atorvastatin", "date": "2026-04-20", "startTime": "21:00", "endTime": "21:15", "title": "Atorvastatin", "type": "medication", "repeat": "daily"},

            # Weekly activities
            {"patient_id": "margaret", "id": "e-weekly-walk", "date": "2026-04-20", "startTime": "09:00", "endTime": "10:00", "title": "Morning walk", "type": "activity", "repeat": "weekly"},
            {"patient_id": "margaret", "id": "e-weekly-pt", "date": "2026-04-21", "startTime": "14:00", "endTime": "15:00", "title": "PT session", "subtitle": "Ortho · knee", "type": "appointment", "repeat": "weekly"},

            # One-off appointments
            {"patient_id": "margaret", "id": "e-once-chen", "date": "2026-04-22", "startTime": "09:00", "endTime": "10:00", "title": "Dr. Chen", "subtitle": "Nephrology", "type": "appointment", "repeat": "none"},
            {"patient_id": "margaret", "id": "e-once-lab", "date": "2026-04-24", "startTime": "12:00", "endTime": "12:30", "title": "Lab: A1C", "type": "lab", "repeat": "none"},
            {"patient_id": "margaret", "id": "e-once-family", "date": "2026-04-25", "startTime": "14:00", "endTime": "16:00", "title": "Family visit", "type": "appointment", "repeat": "none"},
        ])

    if await db["visit-summaries"].count_documents({}) == 0:
        await db["visit-summaries"].insert_many([
            {
                "patient_id": "margaret",
                "id": "vs1",
                "date": "2026-04-15",
                "doctor": "Dr. Aris",
                "location": "Northside Cardiology",
                "reason": "Quarterly Heart Checkup",
                "summary": "Patient reports mild fatigue. BP slightly elevated at 142/88. EKG shows normal rhythm. Adjusted Lisinopril dose.",
                "followUp": "Blood work in 2 weeks. Return for follow-up in 3 months.",
                "createdAt": "2026-04-15T10:00:00Z"
            },
            {
                "patient_id": "margaret",
                "id": "vs2",
                "date": "2026-03-10",
                "doctor": "Dr. Chen",
                "location": "City General Health",
                "reason": "Diabetes Management",
                "summary": "A1C stable at 6.8. Patient managing diet well. Continuing Metformin 500mg.",
                "followUp": "Annual eye exam.",
                "createdAt": "2026-03-10T14:30:00Z"
            }
        ])

    print("Database seeding completed.")
