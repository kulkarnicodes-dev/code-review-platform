from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client = None
    db = None

db = Database()

async def connect_to_mongo():
    try:
        db.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=30000,
            tls=True,
        )

        # Force an actual connection
        await db.client.admin.command("ping")

        db.db = db.client[settings.DATABASE_NAME]

        print("✅ MongoDB Connected Successfully")

    except Exception as e:
        print("❌ MongoDB Connection Error:")
        print(e)
        raise

async def close_mongo_connection():
    if db.client:
        db.client.close()

def get_database():
    return db.db
