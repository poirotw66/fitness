from sqlalchemy.orm import Session
from app.models.exercise import ExerciseLog
from datetime import date


class ExerciseService:
    @staticmethod
    def save_exercise_log(
        db: Session,
        user_id: int,
        exercise_type: str,
        duration: float,
        calories_burned: float = 0,
    ):
        """Save an exercise log entry"""
        exercise_log = ExerciseLog(
            user_id=user_id,
            date=date.today(),
            exercise_type=exercise_type,
            duration=duration,
            calories_burned=calories_burned,
        )
        db.add(exercise_log)
        db.commit()
        return exercise_log


