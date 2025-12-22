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
    # 1. Determine Target Calories based on Goal
    target_calories = tdee
    if goal == "gain_muscle":
        # Surplus of ~300-500 kcal (approx 10-15%)
        target_calories = tdee * 1.15
    
    # 2. Determine Protein (Priority 1)
    if goal == "gain_muscle":
        # 1.8 - 2.2 g/kg for muscle gain (using 2.0)
        protein_g = weight * 2.0
    else:
        # 1.2 - 1.5 g/kg for general health/maintenance (using 1.4)
        # Slightly higher than RDA (0.8) for better satiety and muscle retention
        protein_g = weight * 1.4
    
    protein_calories = protein_g * 4

    # 3. Determine Fat (Priority 2)
    # 25-30% of total calories is a healthy range
    fat_ratio = 0.28
    fat_calories = target_calories * fat_ratio
    fat_g = fat_calories / 9

    # 4. Determine Carbs (Remainder)
    # Remaining calories go to carbs
    carbs_calories = target_calories - protein_calories - fat_calories
    # Ensure carbs don't drop too low (e.g., minimum 3g/kg for active people)
    # If active, prioritize carbs a bit more? 
    # For now, simple remainder is usually robust enough for standard diets
    carbs_g = carbs_calories / 4
    
    # Sanity check: Ensure non-negative
    if carbs_g < 0:
        carbs_g = 0
        # If we have 0 carbs, we might need to adjust fat/protein down, 
        # but unlikely with these ratios unless calories are extremely low.

    # 5. Vegetable calculation
    # General guideline: ~400g minimum, scaling with calories
    vegetables = max(400.0, (target_calories / 2000.0) * 400.0)

    return {
        "protein": round(protein_g, 1),
        "carbs": round(carbs_g, 1),
        "fat": round(fat_g, 1),
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



