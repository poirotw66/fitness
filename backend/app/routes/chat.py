from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.models.database import get_db
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.auth.security import get_current_user
from app.agents import get_fitness_agent
from app.services.diet_service import DietService
from app.services.exercise_service import ExerciseService
import json
from datetime import datetime

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: int


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process a chat message"""
    # Get or create conversation
    if request.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == request.conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(user_id=current_user.id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    # Save user message
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=request.message
    )
    db.add(user_message)
    db.commit()
    
    # Get conversation history
    history = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at).all()
    
    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in history[:-1]  # Exclude the current message
    ]
    
    # Process with agent
    agent = get_fitness_agent()
    result = agent.process_message(
        request.message,
        current_user.id,
        conversation_history
    )
    
    # Save assistant message
    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=result["response"]
    )
    db.add(assistant_message)
    
    # Extract and save diet/exercise data
    extracted = result.get("extracted_data", {})
    
    if extracted.get("diet", {}).get("has_diet"):
        diet_data = extracted["diet"]
        DietService.save_diet_log(
            db=db,
            user_id=current_user.id,
            meal_type=diet_data.get("meal_type", "snack"),
            food_name=diet_data.get("food_name", ""),
            calories=diet_data.get("calories", 0),
            protein=diet_data.get("protein", 0),
            carbs=diet_data.get("carbs", 0),
            fat=diet_data.get("fat", 0),
        )
    
    if extracted.get("exercise", {}).get("has_exercise"):
        exercise_data = extracted["exercise"]
        ExerciseService.save_exercise_log(
            db=db,
            user_id=current_user.id,
            exercise_type=exercise_data.get("exercise_type", ""),
            duration=exercise_data.get("duration", 0),
            calories_burned=exercise_data.get("calories_burned", 0),
        )
    
    db.commit()
    
    return ChatResponse(
        response=result["response"],
        conversation_id=conversation.id
    )


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Stream chat response using SSE"""
    # Get or create conversation
    if request.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == request.conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(user_id=current_user.id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    # Save user message
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=request.message
    )
    db.add(user_message)
    db.commit()
    
    # Get conversation history
    history = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at).all()
    
    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in history[:-1]
    ]
    
    # Process with agent (for now, we'll stream the response)
    agent = get_fitness_agent()
    result = agent.process_message(
        request.message,
        current_user.id,
        conversation_history
    )
    
    # Stream the response
    async def generate():
        response_text = result["response"]
        # Simulate streaming by sending chunks
        chunk_size = 10
        for i in range(0, len(response_text), chunk_size):
            chunk = response_text[i:i + chunk_size]
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        yield "data: [DONE]\n\n"
        
        # Save assistant message after streaming
        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=response_text
        )
        db.add(assistant_message)
        
        # Extract and save diet/exercise data
        extracted = result.get("extracted_data", {})
        
        if extracted.get("diet", {}).get("has_diet"):
            diet_data = extracted["diet"]
            DietService.save_diet_log(
                db=db,
                user_id=current_user.id,
                meal_type=diet_data.get("meal_type", "snack"),
                food_name=diet_data.get("food_name", ""),
                calories=diet_data.get("calories", 0),
                protein=diet_data.get("protein", 0),
                carbs=diet_data.get("carbs", 0),
                fat=diet_data.get("fat", 0),
            )
        
        if extracted.get("exercise", {}).get("has_exercise"):
            exercise_data = extracted["exercise"]
            ExerciseService.save_exercise_log(
                db=db,
                user_id=current_user.id,
                exercise_type=exercise_data.get("exercise_type", ""),
                duration=exercise_data.get("duration", 0),
                calories_burned=exercise_data.get("calories_burned", 0),
            )
        
        db.commit()
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

