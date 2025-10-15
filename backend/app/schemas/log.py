from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional, List
from app.models.log import SeverityEnum


class LogBase(BaseModel):
    message: str = Field(..., min_length=1, description="Log message")
    severity: SeverityEnum
    source: str = Field(..., min_length=1, description="Log source identifier")
    timestamp: Optional[datetime] = None


class LogCreate(LogBase):
    pass


class LogUpdate(BaseModel):
    message: Optional[str] = Field(None, min_length=1)
    severity: Optional[SeverityEnum] = None
    source: Optional[str] = Field(None, min_length=1)
    timestamp: Optional[datetime] = None


class Log(LogBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LogFilter(BaseModel):
    """Query parameters for filtering logs"""
    severity: Optional[SeverityEnum] = None
    source: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = Field(None, description="Full-text search in message")
    sort_by: str = Field("timestamp", description="Field to sort by")
    sort_order: str = Field("desc", description="Sort order: asc or desc")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(50, ge=1, le=100, description="Items per page")


class LogList(BaseModel):
    """Paginated log list response"""
    items: List[Log]
    total: int
    page: int
    page_size: int
    total_pages: int
