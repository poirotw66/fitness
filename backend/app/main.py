from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.database import init_db
from app.routes import auth, chat, stats, reports, upload

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

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(upload.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Fitness AI Agent API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


