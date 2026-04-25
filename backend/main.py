"""
CareGiver Hub — FastAPI Backend
Serves patient data from MongoDB and proxies AI requests to the CaregiverAgent.

Run:
    uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from services.mongodb import seed_mock_data
from routes import patients, medications, events, notes, ai


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed MongoDB with mock data on first run
    await seed_mock_data()
    yield


app = FastAPI(
    title="CareGiver Hub API",
    description="Backend for the CareGiver app — unified health management powered by Fetch.ai ASI-1 Mini.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router, prefix="/api")
app.include_router(medications.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(ai.router, prefix="/api")


@app.get("/", tags=["health"])
async def root():
    return {
        "service": "CareGiver Hub API",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
