from fastapi import APIRouter
from app.db.mongodb import get_database

router = APIRouter()


@router.get("/health")
async def health_check():
    return  {"status": "ok"}
