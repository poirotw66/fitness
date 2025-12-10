from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    conversations = relationship("Conversation", back_populates="user")
    diet_logs = relationship("DietLog", back_populates="user")
    exercise_logs = relationship("ExerciseLog", back_populates="user")
    reports = relationship("DailyReport", back_populates="user")


