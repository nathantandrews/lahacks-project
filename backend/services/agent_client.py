"""
HTTP client for calling the CaregiverAgent's REST endpoints.
The agent runs on port 8001 and exposes /health-brief, /analyze-note, /medication-check.
"""
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

AGENT_BASE_URL = os.getenv("AGENT_BASE_URL", "http://localhost:8001")
TIMEOUT = 45.0


async def get_health_brief(patient_data: dict) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{AGENT_BASE_URL}/health-brief",
            json={"patient_data": patient_data},
        )
        response.raise_for_status()
        return response.json()


async def analyze_note(raw_text: str, patient_id: str = "") -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{AGENT_BASE_URL}/analyze-note",
            json={"raw_text": raw_text, "patient_id": patient_id},
        )
        response.raise_for_status()
        return response.json()


async def check_medications(medications: list) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{AGENT_BASE_URL}/medication-check",
            json={"medications": medications},
        )
        response.raise_for_status()
        return response.json()


async def general_query(text: str, patient_id: str = "") -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{AGENT_BASE_URL}/query",
            json={"text": text, "patient_id": patient_id},
        )
        response.raise_for_status()
        return response.json()
