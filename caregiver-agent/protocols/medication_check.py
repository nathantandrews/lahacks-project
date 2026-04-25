"""
Medication Safety Check Protocol
Analyzes a patient's medication list for potential interactions and safety concerns.
"""
import json
from asi1_client import call_asi1, CAREGIVER_SYSTEM_PROMPT


def check_medications(medications: list[dict]) -> dict:
    """
    Check a list of medications for potential drug interactions and safety issues.

    Args:
        medications: list of {"name": str, "dose": str, "schedule": str}

    Returns:
        {
            "safe": bool,
            "interaction_warnings": list[{"drugs": list[str], "risk": str, "severity": "low"|"medium"|"high"}],
            "general_warnings": list[str],
            "recommendations": list[str],
            "summary": str
        }
    """
    if not medications:
        return {
            "safe": True,
            "interaction_warnings": [],
            "general_warnings": [],
            "recommendations": [],
            "summary": "No medications provided to check.",
        }

    med_list = "\n".join(
        f"- {m.get('name', 'Unknown')} {m.get('dose', '')} ({m.get('schedule', '')})"
        for m in medications
    )

    prompt = f"""Review the following medication list for a patient and identify any potential drug interactions, \
contraindications, or safety concerns a caregiver should know about.

MEDICATIONS:
{med_list}

Respond ONLY with a valid JSON object:
{{
  "safe": true or false (false if any medium/high severity interactions found),
  "interaction_warnings": [
    {{
      "drugs": ["Drug A", "Drug B"],
      "risk": "description of the interaction risk",
      "severity": "low" or "medium" or "high"
    }}
  ],
  "general_warnings": [
    "any general safety note (e.g. take with food, avoid grapefruit, fall risk)"
  ],
  "recommendations": [
    "actionable recommendation for the caregiver"
  ],
  "summary": "Plain-language 1-2 sentence overall assessment"
}}

Base your analysis on well-known drug interactions. Do not fabricate interactions. \
If no concerning interactions exist, say so clearly."""

    raw = call_asi1(
        messages=[
            {"role": "system", "content": CAREGIVER_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        max_tokens=700,
        temperature=0.1,
    )

    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
    except (json.JSONDecodeError, ValueError):
        return {
            "safe": True,
            "interaction_warnings": [],
            "general_warnings": [],
            "recommendations": [],
            "summary": raw,
        }
