from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.database import init_db
from app.routes import auth, chat, stats, reports, upload, admin, settings, exercise
from app.services.report_scheduler import start_scheduler, stop_scheduler
import atexit

app = FastAPI(title="Fitness AI Agent API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

# Start scheduler for daily report generation at 9 PM
start_scheduler()

# Register shutdown handler
atexit.register(stop_scheduler)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(exercise.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Fitness AI Agent API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.on_event("shutdown")
async def shutdown_event():
    stop_scheduler()


