from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.user import User
from app.auth.security import get_current_user
from app.services.image_service import analyze_food_image
from app.services.diet_service import DietService
from datetime import date
import io

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    meal_type: str = "snack",
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
        
        # If analysis was successful, save to database
        if not analysis_result.get("error"):
            diet_log = DietService.save_diet_log(
                db=db,
                user_id=current_user.id,
                meal_type=meal_type,
                food_name=analysis_result.get("food_name", "未知食物"),
                calories=analysis_result.get("calories", 0),
                protein=analysis_result.get("protein", 0),
                carbs=analysis_result.get("carbs", 0),
                fat=analysis_result.get("fat", 0),
            )
            
            return {
                "success": True,
                "message": "图片分析完成并已保存",
                "data": {
                    "food_name": analysis_result.get("food_name"),
                    "serving_size": analysis_result.get("serving_size", ""),
                    "calories": analysis_result.get("calories"),
                    "protein": analysis_result.get("protein"),
                    "carbs": analysis_result.get("carbs"),
                    "fat": analysis_result.get("fat"),
                    "has_nutrition_label": analysis_result.get("has_nutrition_label", False),
                    "estimated": analysis_result.get("estimated", False),
                    "meal_type": meal_type,
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

