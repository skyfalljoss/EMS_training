
from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.db.mongodb import connect_db, close_db

app = FastAPI(title="Employee Management System")
# Include API routes
app.include_router(health_router)
# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    await connect_db()
    