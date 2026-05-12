
from app.core.settings import settings
from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.db.mongodb import connect_db, close_db



def create_app():
    app = FastAPI(title="Employee Management System")
    app.state.settings = settings
    app.include_router(health_router)
    
    return app

    
app =create_app()