from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.models.database import get_db
from app.models.user import User, GenderEnum, ActivityLevelEnum, GoalEnum
from app.auth.security import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])


class UserSettingsUpdate(BaseModel):
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    age: Optional[int] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None  # "maintain" or "gain_muscle"


class UserSettingsResponse(BaseModel):
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    age: Optional[int] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None
    bmr: Optional[float] = None
    tdee: Optional[float] = None
    recommended_protein: Optional[float] = None
    recommended_carbs: Optional[float] = None
    recommended_fat: Optional[float] = None
    recommended_vegetables: Optional[float] = None


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


def calculate_nutrition_recommendations(
    weight: float,
    tdee: float,
    goal: Optional[str],
    activity_level: Optional[str]
) -> dict:
    """
    Calculate personalized nutrition recommendations based on weight, TDEE, goal, and activity level
    
    Returns:
        {
            "protein": float (g),
            "carbs": float (g),
            "fat": float (g)
        }
    """
    # Protein calculation
    if goal == "gain_muscle":
        # 健身者、想增肌: 1.6 - 2.2 g/kg (使用平均值 1.9 g/kg)
        protein = weight * 1.9
    else:
        # 一般人: 1.0 - 1.2 g/kg (使用平均值 1.1 g/kg)
        protein = weight * 1.1
    
    # Carbohydrate calculation
    if goal == "gain_muscle" or activity_level in ["moderate", "very_active"]:
        # 增肌或高活动者: 5-7 g/kg (一般训练) 或 7-10 g/kg (耐力运动)
        # 根据活动量选择：moderate用6 g/kg, very_active用8 g/kg
        if activity_level == "very_active":
            carbs = weight * 8.0  # 7-10 g/kg 的平均值
        else:
            carbs = weight * 6.0  # 5-7 g/kg 的平均值
    else:
        # 一般情况: 45% - 60% TDEE (使用平均值 52.5%)
        carbs_calories = tdee * 0.525
        carbs = carbs_calories / 4  # 1g carbs = 4 kcal
    
    # Fat calculation
    # 建议比例: 20% - 35% TDEE (使用平均值 27.5%)
    fat_calories = tdee * 0.275
    fat = fat_calories / 9  # 1g fat = 9 kcal
    
    # 确保脂肪不低于最低值: 0.6 - 1.0 g/kg (使用平均值 0.8 g/kg)
    min_fat = weight * 0.8
    if fat < min_fat:
        fat = min_fat
    
    # Vegetable calculation
    # General guideline: ~400g minimum, scaling with calories
    vegetables = max(400.0, (tdee / 2000.0) * 400.0)

    return {
        "protein": round(protein, 1),
        "carbs": round(carbs, 1),
        "fat": round(fat, 1),
        "vegetables": round(vegetables, 1),
    }


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
    
    # Calculate nutrition recommendations
    nutrition_rec = None
    if user.weight and tdee:
        nutrition_rec = calculate_nutrition_recommendations(
            weight=user.weight,
            tdee=tdee,
            goal=user.goal.value if user.goal else None,
            activity_level=user.activity_level.value if user.activity_level else None
        )
    
    return {
        "gender": user.gender.value if user.gender else None,
        "height": user.height,
        "weight": user.weight,
        "age": user.age,
        "activity_level": user.activity_level.value if user.activity_level else None,
        "goal": user.goal.value if user.goal else None,
        "bmr": round(bmr, 2) if bmr else None,
        "tdee": round(tdee, 2) if tdee else None,
        "recommended_protein": nutrition_rec["protein"] if nutrition_rec else None,
        "recommended_carbs": nutrition_rec["carbs"] if nutrition_rec else None,
        "recommended_fat": nutrition_rec["fat"] if nutrition_rec else None,
        "recommended_vegetables": nutrition_rec["vegetables"] if nutrition_rec else None,
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
    
    if settings.goal is not None:
        try:
            user.goal = GoalEnum(settings.goal)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid goal value")
    
    db.commit()
    db.refresh(user)
    
    # Calculate BMR and TDEE
    bmr = None
    tdee = None
    
    if user.gender and user.weight and user.height and user.age:
        bmr = calculate_bmr(user.gender.value, user.weight, user.height, user.age)
        
        if user.activity_level:
            tdee = calculate_tdee(bmr, user.activity_level.value)
    
    # Calculate nutrition recommendations
    nutrition_rec = None
    if user.weight and tdee:
        nutrition_rec = calculate_nutrition_recommendations(
            weight=user.weight,
            tdee=tdee,
            goal=user.goal.value if user.goal else None,
            activity_level=user.activity_level.value if user.activity_level else None
        )
    
    return {
        "gender": user.gender.value if user.gender else None,
        "height": user.height,
        "weight": user.weight,
        "age": user.age,
        "activity_level": user.activity_level.value if user.activity_level else None,
        "goal": user.goal.value if user.goal else None,
        "bmr": round(bmr, 2) if bmr else None,
        "tdee": round(tdee, 2) if tdee else None,
        "recommended_protein": nutrition_rec["protein"] if nutrition_rec else None,
        "recommended_carbs": nutrition_rec["carbs"] if nutrition_rec else None,
        "recommended_fat": nutrition_rec["fat"] if nutrition_rec else None,
        "recommended_vegetables": nutrition_rec["vegetables"] if nutrition_rec else None,
    }



