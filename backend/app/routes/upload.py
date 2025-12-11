from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.models.database import get_db
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.auth.security import get_current_user
from app.services.image_service import analyze_food_image
from app.services.diet_service import DietService
from app.services.meal_type_detector import correct_meal_type
from datetime import date
import io

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    meal_type: str = Form("snack"),
    conversation_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    上传食物图片并分析营养成分
    meal_type: breakfast, lunch, dinner, snack
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="文件必须是图片格式")
    
    # Validate meal type
    valid_meal_types = ["breakfast", "lunch", "dinner", "snack"]
    if meal_type not in valid_meal_types:
        raise HTTPException(status_code=400, detail=f"meal_type 必须是: {', '.join(valid_meal_types)}")
    
    try:
        # Read image data
        image_data = await file.read()
        
        # Analyze image
        analysis_result = analyze_food_image(image_data)
        
        # Get or create conversation
        conv_id = None
        if conversation_id:
            try:
                conv_id = int(conversation_id)
            except (ValueError, TypeError):
                conv_id = None
        
        if conv_id:
            conversation = db.query(Conversation).filter(
                Conversation.id == conv_id,
                Conversation.user_id == current_user.id
            ).first()
            if not conversation:
                conversation = Conversation(user_id=current_user.id)
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
        else:
            conversation = Conversation(user_id=current_user.id)
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
        
        # Save user message about image upload
        food_name = analysis_result.get("food_name", "未知食物")
        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=f"上傳了食物圖片：{food_name}"
        )
        db.add(user_message)
        
        # If analysis was successful, save to database
        if not analysis_result.get("error"):
            # Correct meal type based on food name
            corrected_meal_type = correct_meal_type(food_name, meal_type, "")
            
            diet_log = DietService.save_diet_log(
                db=db,
                user_id=current_user.id,
                meal_type=corrected_meal_type,
                food_name=food_name,
                calories=analysis_result.get("calories", 0),
                protein=analysis_result.get("protein", 0),
                carbs=analysis_result.get("carbs", 0),
                fat=analysis_result.get("fat", 0),
                vegetables=analysis_result.get("vegetables", 0),
            )
            
            meal_type_names = {
                "breakfast": "早餐",
                "lunch": "午餐",
                "dinner": "晚餐",
                "snack": "點心"
            }
            
            # Save assistant response
            nutrition_label_status = "📋 已識別營養成分表" if analysis_result.get("has_nutrition_label", False) else "🔍 已推估營養成分"
            estimated_note = "(此為推估值，建議參考實際營養標籤)" if analysis_result.get("estimated", False) else ""
            
            response_text = f"""✅ 圖片分析完成！

食物名稱：{food_name}
份量：{analysis_result.get("serving_size", "未指定")}
卡路里：{analysis_result.get("calories", 0)} kcal
蛋白質：{analysis_result.get("protein", 0)} g
碳水化合物：{analysis_result.get("carbs", 0)} g
脂肪：{analysis_result.get("fat", 0)} g
{analysis_result.get("vegetables", 0) > 0 and f"蔬菜：{analysis_result.get('vegetables', 0)} g" or ""}

{nutrition_label_status}
{estimated_note}

已自動記錄為{meal_type_names.get(corrected_meal_type, "點心")}！"""
            
            assistant_message = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=response_text
            )
            db.add(assistant_message)
            
            db.commit()
            
            return {
                "success": True,
                "message": "圖片分析完成並已保存",
                "conversation_id": conversation.id,
                "data": {
                    "food_name": food_name,
                    "serving_size": analysis_result.get("serving_size", ""),
                    "calories": analysis_result.get("calories"),
                    "protein": analysis_result.get("protein"),
                    "carbs": analysis_result.get("carbs"),
                    "fat": analysis_result.get("fat"),
                    "vegetables": analysis_result.get("vegetables", 0),
                    "has_nutrition_label": analysis_result.get("has_nutrition_label", False),
                    "estimated": analysis_result.get("estimated", False),
                    "meal_type": corrected_meal_type,
                    "diet_log_id": diet_log.id
                }
            }
        else:
            return {
                "success": False,
                "message": "图片分析失败",
                "error": analysis_result.get("error"),
                "data": analysis_result
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理图片时发生错误: {str(e)}")

