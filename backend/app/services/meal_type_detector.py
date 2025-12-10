"""
餐点类型检测和修正服务
"""
import re
from datetime import datetime


def detect_meal_type_from_text(text: str, current_meal_type: str = "snack") -> str:
    """
    从文本中检测餐点类型
    如果当前meal_type是snack，但文本中包含午餐/晚餐相关关键词，则进行修正
    """
    text_lower = text.lower()
    text_original = text  # 保留原始文本用于中文关键词匹配
    
    # 早餐关键词
    breakfast_keywords = ["早餐", "早上", "早飯", "morning", "breakfast", "早點", "早點", "晨間"]
    # 午餐关键词（优先级高）
    lunch_keywords = [
        "午餐", "中午", "午飯", "lunch", 
        "便當", "飯盒", "套餐", "午間", "午膳",
        "麥當勞", "雙主菜", "主菜", "排骨", "炸魚",
        "大麥克", "麥克鷄塊", "可樂", "steamed", "dumplings"
    ]
    # 晚餐关键词
    dinner_keywords = ["晚餐", "晚上", "晚飯", "dinner", "晚間", "夜間", "晚膳"]
    # 点心关键词（优先级低）
    snack_keywords = ["點心", "零食", "snack", "小食", "小點"]
    
    # 检查文本中的关键词（按优先级）
    # 先检查明确的餐点类型关键词
    if any(keyword in text_original for keyword in breakfast_keywords):
        return "breakfast"
    elif any(keyword in text_original for keyword in lunch_keywords):
        return "lunch"
    elif any(keyword in text_original for keyword in dinner_keywords):
        return "dinner"
    elif any(keyword in text_original for keyword in snack_keywords):
        return "snack"
    
    # 如果当前是snack，但文本中包含便当/套餐等关键词，推断为午餐或晚餐
    if current_meal_type == "snack":
        lunch_indicators = [
            "便當", "飯盒", "套餐", "主菜", "排骨", "炸魚", 
            "麥當勞", "雙主菜", "大麥克", "麥克鷄塊", "可樂",
            "steamed", "dumplings", "餃", "小籠包"
        ]
        if any(keyword in text_original for keyword in lunch_indicators):
            # 根据当前时间推断
            current_hour = datetime.now().hour
            if 11 <= current_hour < 15:
                return "lunch"
            elif 17 <= current_hour < 22:
                return "dinner"
            else:
                # 默认推断为午餐（因为便当/套餐通常是午餐）
                return "lunch"
    
    # 如果文本中包含明确的午餐/晚餐关键词，即使当前是snack也要修正
    if "便當" in text_original or "套餐" in text_original or "麥當勞" in text_original:
        current_hour = datetime.now().hour
        if 11 <= current_hour < 15:
            return "lunch"
        elif 17 <= current_hour < 22:
            return "dinner"
        else:
            return "lunch"  # 默认午餐
    
    return current_meal_type


def correct_meal_type(food_name: str, meal_type: str, user_message: str = "") -> str:
    """
    修正餐点类型
    """
    # 组合所有文本进行检测
    combined_text = f"{food_name} {user_message}"
    corrected = detect_meal_type_from_text(combined_text, meal_type)
    return corrected

