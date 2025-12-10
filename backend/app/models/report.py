from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, unique=True, index=True)
    report_content = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="reports")


