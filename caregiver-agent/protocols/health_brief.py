"""
Health Brief Protocol
Generates a concise daily/weekly caregiver briefing from patient context data.
"""
import json
from asi1_client import call_asi1, CAREGIVER_SYSTEM_PROMPT


def generate_health_brief(patient_data: dict) -> dict:
    """
    Given a patient context dict (conditions, medications, today's events, recent notes),
    return a structured daily briefing for the caregiver.

    Returns:
        {
            "summary": str,
            "todays_focus": list[str],
            "medication_reminders": list[str],
            "warnings": list[str],
            "upcoming": list[str]
        }
    """
    patient_name = patient_data.get("name", "the patient")
    conditions = patient_data.get("conditions", [])
    medications = patient_data.get("medications", [])
    todays_events = patient_data.get("todays_events", [])
    recent_notes = patient_data.get("recent_notes", [])

    prompt = f"""Generate a structured daily health brief for caregiver of {patient_name}.

Patient conditions: {json.dumps(conditions)}
Current medications: {json.dumps(medications)}
Today's scheduled events: {json.dumps(todays_events)}
Recent doctor notes: {json.dumps(recent_notes)}

Respond ONLY with a valid JSON object in this exact structure:
{{
  "summary": "2-3 sentence overview of what the caregiver needs to know today",
  "todays_focus": ["key action item 1", "key action item 2"],
  "medication_reminders": ["med reminder 1", "med reminder 2"],
  "warnings": ["any urgent flags or things to watch for"],
  "upcoming": ["upcoming appointments or tasks in next 7 days"]
}}

Be specific, actionable, and flag anything urgent immediately."""

    raw = call_asi1(
        messages=[
            {"role": "system", "content": CAREGIVER_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        max_tokens=600,
        temperature=0.2,
    )

    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
    except (json.JSONDecodeError, ValueError):
        return {
            "summary": raw,
            "todays_focus": [],
            "medication_reminders": [],
            "warnings": [],
            "upcoming": [],
        }
