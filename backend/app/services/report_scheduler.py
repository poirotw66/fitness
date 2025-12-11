from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.database import SessionLocal
from app.models.user import User
from app.models.diet import DietLog
from app.models.exercise import ExerciseLog
from app.models.report import DailyReport
from app.services.gemini_service import generate_text
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def generate_daily_reports_for_all_users():
    """Generate daily reports for all users at 9 PM"""
    db: Session = SessionLocal()
    try:
        today = date.today()
        users = db.query(User).all()
        
        for user in users:
            try:
                # Check if report already exists
                existing_report = db.query(DailyReport).filter(
                    DailyReport.user_id == user.id,
                    DailyReport.date == today
                ).first()
                
                if existing_report and existing_report.report_content:
                    report_data = existing_report.report_content if isinstance(existing_report.report_content, dict) else {}
                    if report_data.get("text"):
                        logger.info(f"Report already exists for user {user.id}, skipping")
                        continue
                
                # Get diet stats
                diet_stats = db.query(
                    func.sum(DietLog.calories).label("calories_in"),
                    func.sum(DietLog.protein).label("protein"),
                    func.sum(DietLog.carbs).label("carbs"),
                    func.sum(DietLog.fat).label("fat"),
                ).filter(
                    DietLog.user_id == user.id,
                    DietLog.date == today
                ).first()
                
                # Get exercise stats
                exercise_stats = db.query(
                    func.sum(ExerciseLog.calories_burned).label("calories_out"),
                    func.count(ExerciseLog.id).label("exercise_count"),
                ).filter(
                    ExerciseLog.user_id == user.id,
                    ExerciseLog.date == today
                ).first()
                
                # Generate AI report
                report_prompt = f"""
                根據以下數據生成一份健康報告：
                
                日期：{today}
                
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
                    logger.error(f"Error generating AI report for user {user.id}: {e}")
                    ai_report = "無法生成 AI 報告"
                
                # Get or create report
                if existing_report:
                    existing_report.report_content = {
                        "text": ai_report,
                        "calories_in": float(diet_stats.calories_in or 0),
                        "calories_out": float(exercise_stats.calories_out or 0),
                        "protein": float(diet_stats.protein or 0),
                        "carbs": float(diet_stats.carbs or 0),
                        "fat": float(diet_stats.fat or 0),
                        "exercise_count": int(exercise_stats.exercise_count or 0),
                    }
                else:
                    report = DailyReport(
                        user_id=user.id,
                        date=today,
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
                logger.info(f"Generated daily report for user {user.id}")
                
            except Exception as e:
                logger.error(f"Error generating report for user {user.id}: {e}")
                db.rollback()
                continue
        
    except Exception as e:
        logger.error(f"Error in generate_daily_reports_for_all_users: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the scheduler to generate reports at 9 PM daily"""
    # Schedule job to run every day at 21:00 (9 PM)
    scheduler.add_job(
        generate_daily_reports_for_all_users,
        trigger=CronTrigger(hour=21, minute=0),
        id='generate_daily_reports',
        name='Generate daily reports at 9 PM',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Report scheduler started - will generate reports daily at 9 PM")


def stop_scheduler():
    """Stop the scheduler"""
    scheduler.shutdown()
    logger.info("Report scheduler stopped")

