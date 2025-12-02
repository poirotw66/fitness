from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from app.models.database import get_db
from app.models.user import User
from app.models.diet import DietLog
from app.models.exercise import ExerciseLog
from app.auth.security import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/today")
async def get_today_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get today's statistics"""
    today = date.today()
    
    # Diet stats
    diet_stats = db.query(
        func.sum(DietLog.calories).label("calories_in"),
        func.sum(DietLog.protein).label("protein"),
        func.sum(DietLog.carbs).label("carbs"),
        func.sum(DietLog.fat).label("fat"),
    ).filter(
        DietLog.user_id == current_user.id,
        DietLog.date == today
    ).first()
    
    # Exercise stats
    exercise_stats = db.query(
        func.sum(ExerciseLog.calories_burned).label("calories_out"),
        func.count(ExerciseLog.id).label("exercise_count"),
    ).filter(
        ExerciseLog.user_id == current_user.id,
        ExerciseLog.date == today
    ).first()
    
    return {
        "calories_in": float(diet_stats.calories_in or 0),
        "calories_out": float(exercise_stats.calories_out or 0),
        "protein": float(diet_stats.protein or 0),
        "carbs": float(diet_stats.carbs or 0),
        "fat": float(diet_stats.fat or 0),
        "exercise_count": int(exercise_stats.exercise_count or 0),
    }

