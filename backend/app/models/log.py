import uuid
import enum
from sqlalchemy import Column, String, Text, DateTime, Enum, Index
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from app.database import Base


class SeverityEnum(str, enum.Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class Log(Base):
    __tablename__ = "logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(Enum(SeverityEnum), nullable=False, index=True)
    source = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        # Full-text search index using PostgreSQL pg_trgm extension
        Index('idx_log_message_gin', 'message', postgresql_using='gin',
              postgresql_ops={'message': 'gin_trgm_ops'}),
    )
