from fastapi import APIRouter
from app.db.mongo_db import get_database

router = APIRouter()


@router.get("/health")
async def health_check():
    return  {"status": "ok"}
