from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from typing import Optional
from app.models.database import get_db
from app.models.user import User
from app.models.diet import DietLog
from app.models.exercise import ExerciseLog
from app.models.report import DailyReport
from app.auth.security import get_current_user
from app.services.gemini_service import generate_text
import json

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
async def get_reports(
    date_str: Optional[str] = Query(None, alias="date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get daily reports"""
    if date_str:
        try:
            report_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            report_date = date.today()
    else:
        report_date = date.today()
    
    # Get or create report
    report = db.query(DailyReport).filter(
        DailyReport.user_id == current_user.id,
        DailyReport.date == report_date
    ).first()
    
    if not report:
        # Generate report
        # Get diet stats
        diet_stats = db.query(
            func.sum(DietLog.calories).label("calories_in"),
            func.sum(DietLog.protein).label("protein"),
            func.sum(DietLog.carbs).label("carbs"),
            func.sum(DietLog.fat).label("fat"),
        ).filter(
            DietLog.user_id == current_user.id,
            DietLog.date == report_date
        ).first()
        
        # Get exercise stats
        exercise_stats = db.query(
            func.sum(ExerciseLog.calories_burned).label("calories_out"),
            func.count(ExerciseLog.id).label("exercise_count"),
        ).filter(
            ExerciseLog.user_id == current_user.id,
            ExerciseLog.date == report_date
        ).first()
        
        # Get diet logs
        diet_logs = db.query(DietLog).filter(
            DietLog.user_id == current_user.id,
            DietLog.date == report_date
        ).all()
        
        # Get exercise logs
        exercise_logs = db.query(ExerciseLog).filter(
            ExerciseLog.user_id == current_user.id,
            ExerciseLog.date == report_date
        ).all()
        
        # Generate AI report
        report_prompt = f"""
        根據以下數據生成一份健康報告：
        
        日期：{report_date}
        
        飲食記錄：
        - 總攝入卡路里：{diet_stats.calories_in or 0} kcal
        - 蛋白質：{diet_stats.protein or 0} g
        - 碳水化合物：{diet_stats.carbs or 0} g
        - 脂肪：{diet_stats.fat or 0} g
        
        運動記錄：
        - 總消耗卡路里：{exercise_stats.calories_out or 0} kcal
        - 運動次數：{exercise_stats.exercise_count or 0} 次
        
        請生成一份簡潔、專業的健康報告，包含：
        1. 今日總結
        2. 營養分析
        3. 運動總結
        4. 健康建議
        
        請用繁體中文回答。
        """
        
        try:
            ai_report = generate_text(report_prompt)
        except Exception as e:
            print(f"Error generating AI report: {e}")
            ai_report = "無法生成 AI 報告"
        
        # Create report
        report = DailyReport(
            user_id=current_user.id,
            date=report_date,
            report_content={
                "text": ai_report,
                "calories_in": float(diet_stats.calories_in or 0),
                "calories_out": float(exercise_stats.calories_out or 0),
                "protein": float(diet_stats.protein or 0),
                "carbs": float(diet_stats.carbs or 0),
                "fat": float(diet_stats.fat or 0),
                "exercise_count": int(exercise_stats.exercise_count or 0),
            }
        )
        db.add(report)
        db.commit()
        db.refresh(report)
    
    # Format response
    report_data = report.report_content if isinstance(report.report_content, dict) else {}
    
    return [{
        "date": str(report.date),
        "calories_in": report_data.get("calories_in", 0),
        "calories_out": report_data.get("calories_out", 0),
        "protein": report_data.get("protein", 0),
        "carbs": report_data.get("carbs", 0),
        "fat": report_data.get("fat", 0),
        "exercise_count": report_data.get("exercise_count", 0),
        "report_content": report_data.get("text", ""),
    }]


