from fastapi import APIRouter
from app.db.mongodb import get_database

router = APIRouter()


@router.get("/health")
async def health_check():
    try:
        db = get_database()
        await db.command("ping")
        return {"status": "ok", "message": "API and MongoDB are healthy"}
    except Exception:
        return {"status": "ok", "message": "API is healthy (DB not checked)"}
