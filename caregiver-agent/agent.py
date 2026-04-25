"""
CaregiverAgent — Fetch.ai uAgent
Registered on Agentverse via External Integration > Agent Chat Protocol.

Run:
    python agent.py

Then expose with ngrok:
    ngrok http 8001

Paste the ngrok URL as the Agentverse endpoint.
"""
import os
import sys
import json
from dotenv import load_dotenv
from uagents import Agent, Context, Model, Protocol

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
AGENT_NAME = "caregiver-agent"
AGENT_SEED = os.getenv("AGENT_SEED", "caregiver-agent-unique-seed-phrase-lahacks-2026")
AGENT_PORT = int(os.getenv("AGENT_PORT", "8001"))
AGENT_ENDPOINT = os.getenv("AGENT_ENDPOINT", f"http://localhost:{AGENT_PORT}/submit")

# ---------------------------------------------------------------------------
# Message models (Agent Chat Protocol compatible)
# ---------------------------------------------------------------------------

class HealthQuery(Model):
    """General natural-language query from a caregiver or from ASI:One."""
    text: str
    patient_id: str = ""

class HealthBriefRequest(Model):
    """Request a structured daily health brief for a patient."""
    patient_data: str  # JSON-encoded patient context dict

class DocumentAnalysisRequest(Model):
    """Send raw doctor note text for structured extraction."""
    raw_text: str
    patient_id: str = ""

class MedicationCheckRequest(Model):
    """Send a medication list for interaction/safety analysis."""
    medications: str  # JSON-encoded list of {name, dose, schedule}

class AgentResponse(Model):
    """Standard response from the CaregiverAgent."""
    text: str
    data: str = "{}"  # JSON-encoded structured data (if any)
    request_type: str = "general"

# ---------------------------------------------------------------------------
# Agent setup
# ---------------------------------------------------------------------------
agent = Agent(
    name=AGENT_NAME,
    seed=AGENT_SEED,
    port=AGENT_PORT,
    endpoint=[AGENT_ENDPOINT],
)

# ---------------------------------------------------------------------------
# Protocol: General caregiver chat (used by ASI:One via Agentverse ACP)
# ---------------------------------------------------------------------------
chat_protocol = Protocol(name="CaregiverChatProtocol", version="1.0")


@chat_protocol.on_message(model=HealthQuery, replies=AgentResponse)
async def handle_health_query(ctx: Context, sender: str, msg: HealthQuery):
    """Handle natural-language caregiver queries routed from ASI:One."""
    from asi1_client import call_asi1_with_system
    ctx.logger.info(f"[Chat] Query from {sender}: {msg.text[:80]}")
    try:
        response_text = call_asi1_with_system(msg.text, max_tokens=600)
        await ctx.send(sender, AgentResponse(text=response_text, request_type="general"))
    except Exception as e:
        ctx.logger.error(f"ASI-1 call failed: {e}")
        await ctx.send(sender, AgentResponse(
            text="I'm having trouble connecting to the AI service right now. Please try again.",
            request_type="error",
        ))


@chat_protocol.on_message(model=HealthBriefRequest, replies=AgentResponse)
async def handle_health_brief(ctx: Context, sender: str, msg: HealthBriefRequest):
    """Generate a structured daily health brief from patient context."""
    from protocols.health_brief import generate_health_brief
    ctx.logger.info(f"[Brief] Request from {sender}")
    try:
        patient_data = json.loads(msg.patient_data)
        brief = generate_health_brief(patient_data)
        await ctx.send(sender, AgentResponse(
            text=brief.get("summary", "Brief generated."),
            data=json.dumps(brief),
            request_type="brief",
        ))
    except Exception as e:
        ctx.logger.error(f"Health brief failed: {e}")
        await ctx.send(sender, AgentResponse(text=f"Error generating brief: {e}", request_type="error"))


@chat_protocol.on_message(model=DocumentAnalysisRequest, replies=AgentResponse)
async def handle_document_analysis(ctx: Context, sender: str, msg: DocumentAnalysisRequest):
    """Parse and structure a scanned doctor's note."""
    from protocols.document_analysis import analyze_document
    ctx.logger.info(f"[DocAnalysis] Note from {sender}, patient={msg.patient_id}")
    try:
        result = analyze_document(msg.raw_text, stream=False)
        summary = result.get("summary", "Analysis complete.")
        await ctx.send(sender, AgentResponse(
            text=summary,
            data=json.dumps(result),
            request_type="analyze",
        ))
    except Exception as e:
        ctx.logger.error(f"Document analysis failed: {e}")
        await ctx.send(sender, AgentResponse(text=f"Error analyzing document: {e}", request_type="error"))


@chat_protocol.on_message(model=MedicationCheckRequest, replies=AgentResponse)
async def handle_medication_check(ctx: Context, sender: str, msg: MedicationCheckRequest):
    """Check a medication list for interactions and safety concerns."""
    from protocols.medication_check import check_medications
    ctx.logger.info(f"[MedCheck] Request from {sender}")
    try:
        medications = json.loads(msg.medications)
        result = check_medications(medications)
        summary = result.get("summary", "Medication check complete.")
        await ctx.send(sender, AgentResponse(
            text=summary,
            data=json.dumps(result),
            request_type="medication",
        ))
    except Exception as e:
        ctx.logger.error(f"Medication check failed: {e}")
        await ctx.send(sender, AgentResponse(text=f"Error checking medications: {e}", request_type="error"))


# Include protocol — publish_manifest=True makes it discoverable on Agentverse
agent.include(chat_protocol, publish_manifest=True)

# ---------------------------------------------------------------------------
# REST endpoints (called directly by the FastAPI backend over HTTP)
# These endpoints are available at http://localhost:8001/<route>
# ---------------------------------------------------------------------------

class RestHealthQuery(Model):
    text: str
    patient_id: str = ""

class RestHealthBriefRequest(Model):
    patient_data: dict

class RestDocumentRequest(Model):
    raw_text: str
    patient_id: str = ""
    stream: bool = False

class RestMedicationRequest(Model):
    medications: list

class RestResponse(Model):
    text: str
    data: dict = {}
    request_type: str


@agent.on_rest_post("/query", RestHealthQuery, RestResponse)
async def rest_query(ctx: Context, req: RestHealthQuery) -> RestResponse:
    from asi1_client import call_asi1_with_system
    text = call_asi1_with_system(req.text)
    return RestResponse(text=text, request_type="general")


@agent.on_rest_post("/health-brief", RestHealthBriefRequest, RestResponse)
async def rest_health_brief(ctx: Context, req: RestHealthBriefRequest) -> RestResponse:
    from protocols.health_brief import generate_health_brief
    brief = generate_health_brief(req.patient_data)
    return RestResponse(text=brief.get("summary", ""), data=brief, request_type="brief")


@agent.on_rest_post("/analyze-note", RestDocumentRequest, RestResponse)
async def rest_analyze_note(ctx: Context, req: RestDocumentRequest) -> RestResponse:
    from protocols.document_analysis import analyze_document
    result = analyze_document(req.raw_text, stream=False)
    return RestResponse(text=result.get("summary", ""), data=result, request_type="analyze")


@agent.on_rest_post("/medication-check", RestMedicationRequest, RestResponse)
async def rest_medication_check(ctx: Context, req: RestMedicationRequest) -> RestResponse:
    from protocols.medication_check import check_medications
    result = check_medications(req.medications)
    return RestResponse(text=result.get("summary", ""), data=result, request_type="medication")


# ---------------------------------------------------------------------------
# Startup log
# ---------------------------------------------------------------------------
@agent.on_event("startup")
async def on_startup(ctx: Context):
    ctx.logger.info("=" * 60)
    ctx.logger.info(f"CaregiverAgent started")
    ctx.logger.info(f"Agent address : {ctx.agent.address}")
    ctx.logger.info(f"Listening on  : port {AGENT_PORT}")
    ctx.logger.info(f"Endpoint      : {AGENT_ENDPOINT}")
    ctx.logger.info("=" * 60)
    ctx.logger.info("Next step: run 'ngrok http 8001' and paste the URL into Agentverse")


if __name__ == "__main__":
    agent.run()
