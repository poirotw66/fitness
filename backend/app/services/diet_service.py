from sqlalchemy.orm import Session
from app.models.diet import DietLog
from datetime import date


class DietService:
    @staticmethod
    def save_diet_log(
        db: Session,
        user_id: int,
        meal_type: str,
        food_name: str,
        calories: float = 0,
        protein: float = 0,
        carbs: float = 0,
        fat: float = 0,
        vegetables: float = 0,
    ):
        """Save a diet log entry"""
        diet_log = DietLog(
            user_id=user_id,
            date=date.today(),
            meal_type=meal_type,
            food_name=food_name,
            calories=calories,
            protein=protein,
            carbs=carbs,
            fat=fat,
            vegetables=vegetables or 0,
        )
        db.add(diet_log)
        db.commit()
        return diet_log


