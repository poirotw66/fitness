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
    
    # Get detailed diet logs grouped by meal type
    diet_logs = db.query(DietLog).filter(
        DietLog.user_id == current_user.id,
        DietLog.date == today
    ).order_by(DietLog.created_at.desc()).all()
    
    # Group by meal type
    meals_detail = {
        "breakfast": {"calories": 0, "items": []},
        "lunch": {"calories": 0, "items": []},
        "dinner": {"calories": 0, "items": []},
        "snack": {"calories": 0, "items": []},
    }
    
    meal_type_names = {
        "breakfast": "早餐",
        "lunch": "午餐",
        "dinner": "晚餐",
        "snack": "點心"
    }
    
    for log in diet_logs:
        meal_type = log.meal_type
        if meal_type in meals_detail:
            meals_detail[meal_type]["calories"] += float(log.calories or 0)
            meals_detail[meal_type]["items"].append({
                "food_name": log.food_name,
                "calories": float(log.calories or 0),
            })
    
    # Format meals detail
    meals_list = []
    for meal_type, meal_type_name in meal_type_names.items():
        if meals_detail[meal_type]["calories"] > 0:
            meals_list.append({
                "meal_type": meal_type,
                "meal_type_name": meal_type_name,
                "calories": meals_detail[meal_type]["calories"],
                "items": meals_detail[meal_type]["items"],
            })
    
    # Exercise stats
    exercise_stats = db.query(
        func.sum(ExerciseLog.calories_burned).label("calories_out"),
        func.count(ExerciseLog.id).label("exercise_count"),
        func.sum(ExerciseLog.duration).label("total_duration"),
    ).filter(
        ExerciseLog.user_id == current_user.id,
        ExerciseLog.date == today
    ).first()
    
    # Get detailed exercise logs
    exercise_logs = db.query(ExerciseLog).filter(
        ExerciseLog.user_id == current_user.id,
        ExerciseLog.date == today
    ).order_by(ExerciseLog.created_at.desc()).all()
    
    exercises_detail = [
        {
            "exercise_type": log.exercise_type,
            "duration": float(log.duration),
            "calories_burned": float(log.calories_burned),
        }
        for log in exercise_logs
    ]
    
    return {
        "calories_in": float(diet_stats.calories_in or 0),
        "calories_out": float(exercise_stats.calories_out or 0),
        "protein": float(diet_stats.protein or 0),
        "carbs": float(diet_stats.carbs or 0),
        "fat": float(diet_stats.fat or 0),
        "exercise_count": int(exercise_stats.exercise_count or 0),
        "total_duration": float(exercise_stats.total_duration or 0),
        "exercises": exercises_detail,
        "meals": meals_list,
    }


