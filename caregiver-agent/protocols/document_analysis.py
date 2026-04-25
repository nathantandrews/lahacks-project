"""
Document Analysis Protocol
Parses raw text from scanned/photographed doctor notes and extracts structured data.
"""
import json
from asi1_client import call_asi1, call_asi1_streaming, CAREGIVER_SYSTEM_PROMPT


def analyze_document(raw_text: str, stream: bool = False):
    """
    Extract structured medical data from raw doctor note text.

    Args:
        raw_text: OCR output or manually typed doctor note
        stream: if True, returns a generator of text chunks (for live UI display)

    Returns (non-stream):
        {
            "diagnosis": list[str],
            "medications_prescribed": list[{"name": str, "dose": str, "instructions": str}],
            "follow_up_actions": list[str],
            "warning_signs": list[str],
            "summary": str,
            "follow_up_date": str | None
        }
    """
    prompt = f"""Analyze the following doctor's note and extract all medical information.

DOCTOR'S NOTE TEXT:
\"\"\"
{raw_text}
\"\"\"

Respond ONLY with a valid JSON object:
{{
  "diagnosis": ["condition or finding 1", "condition or finding 2"],
  "medications_prescribed": [
    {{"name": "medication name", "dose": "dosage", "instructions": "how/when to take"}}
  ],
  "follow_up_actions": [
    "action the caregiver must take (e.g. schedule follow-up, monitor BP daily)"
  ],
  "warning_signs": [
    "symptoms or signs that require immediate medical attention"
  ],
  "summary": "Plain-language 2-3 sentence summary for a non-medical caregiver",
  "follow_up_date": "date if mentioned, otherwise null"
}}

If information is not present in the note, use an empty list or null. Do not invent details."""

    messages = [
        {"role": "system", "content": CAREGIVER_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    if stream:
        return call_asi1_streaming(messages, max_tokens=1000, temperature=0.1)

    raw = call_asi1(messages, max_tokens=1000, temperature=0.1)

    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
    except (json.JSONDecodeError, ValueError):
        return {
            "diagnosis": [],
            "medications_prescribed": [],
            "follow_up_actions": [],
            "warning_signs": [],
            "summary": raw,
            "follow_up_date": None,
        }
