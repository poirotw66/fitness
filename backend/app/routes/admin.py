"""
管理工具：修正数据库中的餐点类型
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.user import User
from app.models.diet import DietLog
from app.auth.security import get_current_user
from app.services.meal_type_detector import correct_meal_type
from datetime import date

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/fix-meal-types")
async def fix_meal_types(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    修正当前用户今日所有饮食记录的餐点类型
    """
    today = date.today()
    
    # Get all diet logs for today (including snack types)
    diet_logs = db.query(DietLog).filter(
        DietLog.user_id == current_user.id,
        DietLog.date == today
    ).all()
    
    fixed_count = 0
    fixed_details = []
    
    for log in diet_logs:
        original_type = log.meal_type
        # Correct meal type based on food name
        corrected_type = correct_meal_type(log.food_name, log.meal_type, "")
        if corrected_type != original_type:
            log.meal_type = corrected_type
            fixed_count += 1
            fixed_details.append({
                "food_name": log.food_name,
                "original": original_type,
                "corrected": corrected_type
            })
    
    db.commit()
    
    return {
        "message": f"已修正 {fixed_count} 筆飲食記錄的餐點類型",
        "fixed_count": fixed_count,
        "details": fixed_details
    }

