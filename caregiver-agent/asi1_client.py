import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

ASI1_API_KEY = os.getenv("ASI1_API_KEY", "")
ASI1_BASE_URL = "https://api.asi1.ai/v1"
MODEL = "asi1"

CAREGIVER_SYSTEM_PROMPT = """You are CaregiverAI, an intelligent health management assistant powered by ASI-1. \
You help caregivers manage health information for their dependents — including appointments, medications, \
symptoms, doctor notes, and insurance paperwork across multiple healthcare providers.

Guidelines:
- Be clear, concise, and actionable. Use plain language, not medical jargon.
- Flag urgent concerns (e.g. dangerous drug interactions, alarming symptoms) prominently.
- Structure responses for quick scanning — use bullet points and short sections.
- Always remind users that your output is informational and not a substitute for professional medical advice.
- Never fabricate medication names, dosages, or diagnoses."""


def _headers() -> dict:
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {ASI1_API_KEY}",
    }


def call_asi1(messages: list[dict], max_tokens: int = 800, temperature: float = 0.3) -> str:
    """Make a standard (non-streaming) call to ASI-1 Mini and return the response text."""
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
        "stream": False,
        "max_tokens": max_tokens,
    }
    response = requests.post(
        f"{ASI1_BASE_URL}/chat/completions",
        headers=_headers(),
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def call_asi1_streaming(messages: list[dict], max_tokens: int = 1200, temperature: float = 0.3):
    """Stream an ASI-1 Mini call. Yields text chunks as they arrive.
    
    The API returns a `thought` field (model reasoning) then content chunks via SSE.
    This is used for document analysis so the UI can show live reasoning.
    """
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
        "stream": True,
        "max_tokens": max_tokens,
    }
    response = requests.post(
        f"{ASI1_BASE_URL}/chat/completions",
        headers=_headers(),
        json=payload,
        stream=True,
        timeout=60,
    )
    response.raise_for_status()

    for line in response.iter_lines():
        if not line:
            continue
        line_text = line.decode("utf-8")
        if not line_text.startswith("data: "):
            continue
        data_str = line_text[6:]
        if data_str == "[DONE]":
            break
        try:
            data = json.loads(data_str)
            choices = data.get("choices", [])
            if choices:
                delta = choices[0].get("delta", {})
                content = delta.get("content")
                if content:
                    yield content
        except json.JSONDecodeError:
            continue


def call_asi1_with_system(user_message: str, system_override: str | None = None, **kwargs) -> str:
    """Helper: build messages list with the caregiver system prompt and call ASI-1."""
    system = system_override or CAREGIVER_SYSTEM_PROMPT
    return call_asi1(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
        **kwargs,
    )
