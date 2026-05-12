
from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.db.mongodb import connect_db, close_db

app = FastAPI(title="Employee Management System")

def create_app():
    app.include_router(health_router)
    return app

    