"""
Run this once to register CaregiverAgent on Agentverse.
Make sure your .env has AGENTVERSE_KEY and AGENT_SEED_PHRASE set,
and that the agent is running + ngrok is active before running this.

Usage:
    python register.py
"""
import os
from dotenv import load_dotenv

load_dotenv()

from uagents_core.utils.registration import (
    register_chat_agent,
    RegistrationRequestCredentials,
)

register_chat_agent(
    "CareAgent1",
    "https://portable-cylinder-showdown.ngrok-free.dev",
    active=True,
    credentials=RegistrationRequestCredentials(
        agentverse_api_key=os.environ["AGENTVERSE_KEY"],
        agent_seed_phrase=os.environ["AGENT_SEED_PHRASE"],
    ),
)

print("Registration complete! Go back to Agentverse and click 'Evaluate my registration'.")
