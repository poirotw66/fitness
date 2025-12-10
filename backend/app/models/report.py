from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    report_content = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Unique constraint on (user_id, date) combination
    __table_args__ = (UniqueConstraint('user_id', 'date', name='uq_user_date'),)

    # Relationships
    user = relationship("User", back_populates="reports")


