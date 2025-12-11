from sqlalchemy import Column, Integer, String, DateTime, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"


class ActivityLevelEnum(str, enum.Enum):
    sedentary = "sedentary"  # 低活动量（久坐族）
    light = "light"  # 中活动量（一般活动者）
    moderate = "moderate"  # 高活动量（运动量大）
    very_active = "very_active"  # 非常高活动量（重训者、体力职业）


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # User profile fields
    gender = Column(Enum(GenderEnum), nullable=True)
    height = Column(Float, nullable=True)  # in cm
    weight = Column(Float, nullable=True)  # in kg
    age = Column(Integer, nullable=True)
    activity_level = Column(Enum(ActivityLevelEnum), nullable=True)

    # Relationships
    conversations = relationship("Conversation", back_populates="user")
    diet_logs = relationship("DietLog", back_populates="user")
    exercise_logs = relationship("ExerciseLog", back_populates="user")
    reports = relationship("DailyReport", back_populates="user")


