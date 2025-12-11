from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.models.database import get_db
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.auth.security import get_current_user
from app.services.exercise_service import ExerciseService

router = APIRouter(prefix="/exercise", tags=["exercise"])


class ExerciseRecordRequest(BaseModel):
    exercise_type: str
    duration: float  # in minutes
    intensity: str  # "low", "moderate", "high"
    custom_type: Optional[str] = None  # For custom exercise types
    conversation_id: Optional[int] = None  # Optional conversation ID to save messages


class ExerciseRecordResponse(BaseModel):
    success: bool
    message: str
    exercise_type: str
    duration: float
    calories_burned: float
    conversation_id: Optional[int] = None


# MET (Metabolic Equivalent of Task) values for different exercises
# MET values are per hour, so we'll use them to calculate calories
EXERCISE_MET_VALUES = {
    "羽毛球": {
        "low": 4.5,
        "moderate": 5.5,
        "high": 7.0
    },
    "壁球": {
        "low": 7.0,
        "moderate": 10.0,
        "high": 12.0
    },
    "網球": {
        "low": 5.0,
        "moderate": 7.0,
        "high": 9.0
    },
    "籃球": {
        "low": 6.0,
        "moderate": 8.0,
        "high": 10.0
    },
    "跑步": {
        "low": 6.0,
        "moderate": 9.0,
        "high": 12.0
    },
    "游泳": {
        "low": 5.0,
        "moderate": 7.5,
        "high": 10.0
    },
    "騎自行車": {
        "low": 4.0,
        "moderate": 6.0,
        "high": 8.0
    },
    "健走": {
        "low": 3.5,
        "moderate": 4.5,
        "high": 5.5
    },
}


def calculate_calories_burned(
    exercise_type: str,
    duration_minutes: float,
    intensity: str,
    weight_kg: float
) -> float:
    """
    Calculate calories burned using MET values
    Formula: Calories = MET × weight(kg) × time(hours)
    
    If exercise type not found, use default MET values based on intensity:
    - low: 4.0
    - moderate: 6.0
    - high: 8.0
    """
    # Get MET value for the exercise type and intensity
    if exercise_type in EXERCISE_MET_VALUES:
        met_value = EXERCISE_MET_VALUES[exercise_type].get(intensity, 6.0)
    else:
        # Default MET values for unknown exercises
        default_mets = {
            "low": 4.0,
            "moderate": 6.0,
            "high": 8.0
        }
        met_value = default_mets.get(intensity, 6.0)
    
    # Convert duration from minutes to hours
    duration_hours = duration_minutes / 60.0
    
    # Calculate calories: MET × weight(kg) × time(hours)
    calories = met_value * weight_kg * duration_hours
    
    return round(calories, 2)


@router.post("/record", response_model=ExerciseRecordResponse)
async def record_exercise(
    request: ExerciseRecordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record an exercise and calculate calories burned"""
    
    # Use custom type if provided, otherwise use exercise_type
    exercise_type = request.custom_type if request.custom_type else request.exercise_type
    
    # Validate duration
    if request.duration <= 0:
        raise HTTPException(status_code=400, detail="運動時間必須大於0")
    
    if request.duration > 600:  # 10 hours max
        raise HTTPException(status_code=400, detail="運動時間不能超過600分鐘")
    
    # Validate intensity
    if request.intensity not in ["low", "moderate", "high"]:
        raise HTTPException(status_code=400, detail="強度必須是 low, moderate, 或 high")
    
    # Get user weight for calorie calculation
    if not current_user.weight:
        raise HTTPException(
            status_code=400,
            detail="請先在設定頁面設定體重，才能計算卡路里消耗"
        )
    
    # Calculate calories burned
    calories_burned = calculate_calories_burned(
        exercise_type=exercise_type,
        duration_minutes=request.duration,
        intensity=request.intensity,
        weight_kg=current_user.weight
    )
    
    # Save exercise log
    exercise_log = ExerciseService.save_exercise_log(
        db=db,
        user_id=current_user.id,
        exercise_type=exercise_type,
        duration=request.duration,
        calories_burned=calories_burned
    )
    
    # Save messages to conversation if conversation_id is provided
    conversation_id = None
    if request.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == request.conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        if conversation:
            intensity_text = {
                "low": "低強度",
                "moderate": "中強度",
                "high": "高強度"
            }.get(request.intensity, "中強度")
            
            # Save user message
            user_message = Message(
                conversation_id=conversation.id,
                role="user",
                content=f"記錄運動：{exercise_type}，{request.duration} 分鐘，{intensity_text}"
            )
            db.add(user_message)
            
            # Save assistant message
            assistant_message = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=f"✅ 運動記錄已保存！\n\n**運動項目**：{exercise_type}\n**時長**：{request.duration} 分鐘\n**強度**：{intensity_text}\n**消耗卡路里**：{calories_burned} kcal"
            )
            db.add(assistant_message)
            db.commit()
            conversation_id = conversation.id
        else:
            # Create new conversation if provided ID doesn't exist
            conversation = Conversation(user_id=current_user.id)
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            
            intensity_text = {
                "low": "低強度",
                "moderate": "中強度",
                "high": "高強度"
            }.get(request.intensity, "中強度")
            
            # Save user message
            user_message = Message(
                conversation_id=conversation.id,
                role="user",
                content=f"記錄運動：{exercise_type}，{request.duration} 分鐘，{intensity_text}"
            )
            db.add(user_message)
            
            # Save assistant message
            assistant_message = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=f"✅ 運動記錄已保存！\n\n**運動項目**：{exercise_type}\n**時長**：{request.duration} 分鐘\n**強度**：{intensity_text}\n**消耗卡路里**：{calories_burned} kcal"
            )
            db.add(assistant_message)
            db.commit()
            conversation_id = conversation.id
    
    return ExerciseRecordResponse(
        success=True,
        message=f"運動記錄已保存！消耗 {calories_burned} 卡路里",
        exercise_type=exercise_type,
        duration=request.duration,
        calories_burned=calories_burned,
        conversation_id=conversation_id
    )


@router.get("/types")
async def get_exercise_types(
    current_user: User = Depends(get_current_user)
):
    """Get list of available exercise types"""
    return {
        "exercise_types": list(EXERCISE_MET_VALUES.keys()),
        "default": "壁球"
    }

