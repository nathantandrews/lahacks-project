import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "caregiver_hub")

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    result = await db.events.delete_many({})
    print(f"Deleted {result.deleted_count} events from the collection.")
    print("Restart your backend to re-seed the new startTime/endTime mock data.")

if __name__ == "__main__":
    asyncio.run(main())
