import os
import google.generativeai as genai
from PIL import Image
import io
import json
import re
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def analyze_food_image(image_data: bytes) -> dict:
    """
    分析食物图片，提取营养成分和卡路里信息
    如果图片中包含营养成分表，优先使用表格数据
    """
    try:
        # Initialize Gemini model with vision capability
        # Try gemini-3-pro-preview first, fallback to gemini-2.5-pro
        try:
            model = genai.GenerativeModel('gemini-3-pro-preview')
        except Exception:
            try:
                model = genai.GenerativeModel('gemini-2.5-pro')
            except Exception:
                # Fallback to gemini-2.5-flash
                model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Create prompt for food analysis
        prompt = """請分析這張圖片。如果這是食物圖片：

1. 首先檢查圖片中是否包含營養成分表（Nutrition Facts / 營養成分表）
2. 如果包含營養成分表，請提取以下資訊：
   - 每份份量（Serving Size）
   - 卡路里（Calories）
   - 蛋白質（Protein）
   - 碳水化合物（Total Carbohydrate / Carbs）
   - 脂肪（Total Fat）
   - 其他相關資訊

3. 如果沒有營養成分表，請根據圖片中的食物推估：
   - 食物名稱
   - 估計份量
   - 估計卡路里
   - 估計蛋白質（克）
   - 估計碳水化合物（克）
   - 估計脂肪（克）

請以JSON格式返回，格式如下：
{
    "has_nutrition_label": true/false,
    "food_name": "食物名稱",
    "serving_size": "份量描述",
    "calories": 數字,
    "protein": 數字（克）,
    "carbs": 數字（克）,
    "fat": 數字（克）,
    "nutrition_label_data": {
        "serving_size": "如果有營養成分表",
        "calories": 數字,
        "protein": 數字,
        "carbs": 數字,
        "fat": 數字
    },
    "estimated": true/false（如果是推估則為true）
}

只返回JSON，不要其他文字。"""
        
        # Generate content
        response = model.generate_content([prompt, image])
        
        # Parse JSON from response
        response_text = response.text.strip()
        
        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = json.loads(json_match.group())
        else:
            # Fallback: try to parse the whole response
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError:
                # If parsing fails, return estimated values
                result = {
                    "has_nutrition_label": False,
                    "food_name": "未知食物",
                    "serving_size": "未知",
                    "calories": 0,
                    "protein": 0,
                    "carbs": 0,
                    "fat": 0,
                    "estimated": True
                }
        
        # Use nutrition label data if available, otherwise use estimated values
        if result.get("has_nutrition_label") and result.get("nutrition_label_data"):
            label_data = result["nutrition_label_data"]
            return {
                "food_name": result.get("food_name", "未知食物"),
                "serving_size": result.get("serving_size", ""),
                "calories": float(label_data.get("calories", result.get("calories", 0))),
                "protein": float(label_data.get("protein", result.get("protein", 0))),
                "carbs": float(label_data.get("carbs", result.get("carbs", 0))),
                "fat": float(label_data.get("fat", result.get("fat", 0))),
                "has_nutrition_label": True,
                "estimated": False
            }
        else:
            return {
                "food_name": result.get("food_name", "未知食物"),
                "serving_size": result.get("serving_size", ""),
                "calories": float(result.get("calories", 0)),
                "protein": float(result.get("protein", 0)),
                "carbs": float(result.get("carbs", 0)),
                "fat": float(result.get("fat", 0)),
                "has_nutrition_label": False,
                "estimated": True
            }
            
    except Exception as e:
        print(f"Error analyzing image: {e}")
        return {
            "food_name": "分析失敗",
            "serving_size": "",
            "calories": 0,
            "protein": 0,
            "carbs": 0,
            "fat": 0,
            "has_nutrition_label": False,
            "estimated": False,
            "error": str(e)
        }

