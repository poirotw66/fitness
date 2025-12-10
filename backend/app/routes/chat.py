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
from app.services.meal_type_detector import correct_meal_type
import json
from datetime import datetime

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: int


class ConversationListItem(BaseModel):
    id: int
    date: datetime
    preview: str  # First message preview
    
    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class ConversationDetail(BaseModel):
    id: int
    date: datetime
    messages: list[MessageResponse]
    
    class Config:
        from_attributes = True


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
        meal_type = diet_data.get("meal_type", "snack")
        food_name = diet_data.get("food_name", "")
        
        # 修正餐点类型
        meal_type = correct_meal_type(food_name, meal_type, request.message)
        
        DietService.save_diet_log(
            db=db,
            user_id=current_user.id,
            meal_type=meal_type,
            food_name=food_name,
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
    
    # Save conversation_id before commit (to avoid DetachedInstanceError)
    conversation_id = conversation.id
    
    # Save assistant message BEFORE streaming (to ensure it's saved)
    response_text = result["response"]
    assistant_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=response_text
    )
    db.add(assistant_message)
    
    # Extract and save diet/exercise data BEFORE streaming
    extracted = result.get("extracted_data", {})
    
    if extracted.get("diet", {}).get("has_diet"):
        diet_data = extracted["diet"]
        meal_type = diet_data.get("meal_type", "snack")
        food_name = diet_data.get("food_name", "")
        
        # 修正餐点类型
        meal_type = correct_meal_type(food_name, meal_type, request.message)
        
        DietService.save_diet_log(
            db=db,
            user_id=current_user.id,
            meal_type=meal_type,
            food_name=food_name,
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
    
    # Commit all changes before streaming
    db.commit()
    
    # Stream the response
    async def generate():
        # Send conversation_id first (use saved variable, not conversation.id)
        yield f"data: {json.dumps({'conversation_id': conversation_id})}\n\n"
        # Simulate streaming by sending chunks
        chunk_size = 10
        for i in range(0, len(response_text), chunk_size):
            chunk = response_text[i:i + chunk_size]
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/chat/conversations", response_model=list[ConversationListItem])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of user's conversations"""
    conversations = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.created_at.desc()).limit(50).all()
    
    result = []
    for conv in conversations:
        # Get first message as preview
        first_message = db.query(Message).filter(
            Message.conversation_id == conv.id
        ).order_by(Message.created_at).first()
        
        preview = ""
        if first_message:
            preview = first_message.content[:50] + "..." if len(first_message.content) > 50 else first_message.content
        
        result.append({
            "id": conv.id,
            "date": conv.created_at,
            "preview": preview
        })
    
    return result


@router.get("/chat/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get conversation messages"""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()
    
    return {
        "id": conversation.id,
        "date": conversation.created_at,
        "messages": [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at
            }
            for msg in messages
        ]
    }


