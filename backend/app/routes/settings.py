from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.models.database import get_db
from app.models.user import User, GenderEnum, ActivityLevelEnum
from app.auth.security import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])


class UserSettingsUpdate(BaseModel):
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    age: Optional[int] = None
    activity_level: Optional[str] = None


class UserSettingsResponse(BaseModel):
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    age: Optional[int] = None
    activity_level: Optional[str] = None
    bmr: Optional[float] = None
    tdee: Optional[float] = None


def calculate_bmr(gender: str, weight: float, height: float, age: int) -> float:
    """
    Calculate BMR using Mifflin-St Jeor Equation
    Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
    Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
    """
    base_bmr = 10 * weight + 6.25 * height - 5 * age
    if gender == "male":
        return base_bmr + 5
    else:  # female
        return base_bmr - 161


def calculate_tdee(bmr: float, activity_level: str) -> float:
    """
    Calculate TDEE = BMR × Activity Factor
    """
    activity_factors = {
        "sedentary": 1.2,      # 低活动量（久坐族）
        "light": 1.375,         # 中活动量（一般活动者）
        "moderate": 1.55,       # 高活动量（运动量大）
        "very_active": 1.725,  # 非常高活动量（重训者、体力职业）
    }
    factor = activity_factors.get(activity_level, 1.2)
    return bmr * factor


@router.get("", response_model=UserSettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user settings"""
    user = db.query(User).filter(User.id == current_user.id).first()
    
    bmr = None
    tdee = None
    
    if user.gender and user.weight and user.height and user.age:
        bmr = calculate_bmr(user.gender.value, user.weight, user.height, user.age)
        
        if user.activity_level:
            tdee = calculate_tdee(bmr, user.activity_level.value)
    
    return {
        "gender": user.gender.value if user.gender else None,
        "height": user.height,
        "weight": user.weight,
        "age": user.age,
        "activity_level": user.activity_level.value if user.activity_level else None,
        "bmr": round(bmr, 2) if bmr else None,
        "tdee": round(tdee, 2) if tdee else None,
    }


@router.put("", response_model=UserSettingsResponse)
async def update_settings(
    settings: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user settings"""
    user = db.query(User).filter(User.id == current_user.id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields
    if settings.gender is not None:
        try:
            user.gender = GenderEnum(settings.gender)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid gender value")
    
    if settings.height is not None:
        if settings.height <= 0:
            raise HTTPException(status_code=400, detail="Height must be positive")
        user.height = settings.height
    
    if settings.weight is not None:
        if settings.weight <= 0:
            raise HTTPException(status_code=400, detail="Weight must be positive")
        user.weight = settings.weight
    
    if settings.age is not None:
        if settings.age <= 0:
            raise HTTPException(status_code=400, detail="Age must be positive")
        user.age = settings.age
    
    if settings.activity_level is not None:
        try:
            user.activity_level = ActivityLevelEnum(settings.activity_level)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid activity level value")
    
    db.commit()
    db.refresh(user)
    
    # Calculate BMR and TDEE
    bmr = None
    tdee = None
    
    if user.gender and user.weight and user.height and user.age:
        bmr = calculate_bmr(user.gender.value, user.weight, user.height, user.age)
        
        if user.activity_level:
            tdee = calculate_tdee(bmr, user.activity_level.value)
    
    return {
        "gender": user.gender.value if user.gender else None,
        "height": user.height,
        "weight": user.weight,
        "age": user.age,
        "activity_level": user.activity_level.value if user.activity_level else None,
        "bmr": round(bmr, 2) if bmr else None,
        "tdee": round(tdee, 2) if tdee else None,
    }

