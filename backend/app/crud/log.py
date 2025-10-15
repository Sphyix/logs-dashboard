from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, asc
from app.models.log import Log, SeverityEnum
from app.schemas.log import LogCreate, LogUpdate, LogFilter
from typing import List, Tuple, Optional
from datetime import datetime


def create_log(db: Session, log: LogCreate) -> Log:
    """Create a new log entry"""
    db_log = Log(
        message=log.message,
        severity=log.severity,
        source=log.source,
        timestamp=log.timestamp or datetime.utcnow()
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


def get_log(db: Session, log_id: str) -> Optional[Log]:
    """Get a single log by ID"""
    return db.query(Log).filter(Log.id == log_id).first()


def get_logs(db: Session, filter_params: LogFilter) -> Tuple[List[Log], int]:
    """
    Get logs with filtering, searching, sorting, and pagination
    Returns tuple of (logs, total_count)
    """
    query = db.query(Log)

    # Apply filters
    if filter_params.severity:
        query = query.filter(Log.severity == filter_params.severity)

    if filter_params.source:
        query = query.filter(Log.source == filter_params.source)

    if filter_params.start_date:
        query = query.filter(Log.timestamp >= filter_params.start_date)

    if filter_params.end_date:
        query = query.filter(Log.timestamp <= filter_params.end_date)

    # Full-text search
    if filter_params.search:
        search_term = f"%{filter_params.search}%"
        query = query.filter(Log.message.ilike(search_term))

    # Get total count before pagination
    total = query.count()

    # Sorting
    sort_column = getattr(Log, filter_params.sort_by, Log.timestamp)
    if filter_params.sort_order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    # Pagination
    offset = (filter_params.page - 1) * filter_params.page_size
    logs = query.offset(offset).limit(filter_params.page_size).all()

    return logs, total


def update_log(db: Session, log_id: str, log_update: LogUpdate) -> Optional[Log]:
    """Update a log entry"""
    db_log = get_log(db, log_id)
    if not db_log:
        return None

    update_data = log_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_log, key, value)

    db.commit()
    db.refresh(db_log)
    return db_log


def delete_log(db: Session, log_id: str) -> bool:
    """Delete a log entry"""
    db_log = get_log(db, log_id)
    if not db_log:
        return False

    db.delete(db_log)
    db.commit()
    return True


def get_aggregated_data(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    severity: Optional[SeverityEnum] = None,
    source: Optional[str] = None
) -> dict:
    """Get aggregated log data"""
    query = db.query(Log)

    # Apply filters
    if start_date:
        query = query.filter(Log.timestamp >= start_date)
    if end_date:
        query = query.filter(Log.timestamp <= end_date)
    if severity:
        query = query.filter(Log.severity == severity)
    if source:
        query = query.filter(Log.source == source)

    # Total logs
    total_logs = query.count()

    # Count by severity
    severity_counts = db.query(
        Log.severity, func.count(Log.id)
    ).filter(
        *[condition for condition in [
            Log.timestamp >= start_date if start_date else None,
            Log.timestamp <= end_date if end_date else None,
            Log.source == source if source else None
        ] if condition is not None]
    ).group_by(Log.severity).all()

    by_severity = {str(sev): count for sev, count in severity_counts}

    # Count by source
    source_counts = db.query(
        Log.source, func.count(Log.id)
    ).filter(
        *[condition for condition in [
            Log.timestamp >= start_date if start_date else None,
            Log.timestamp <= end_date if end_date else None,
            Log.severity == severity if severity else None
        ] if condition is not None]
    ).group_by(Log.source).all()

    by_source = {source: count for source, count in source_counts}

    return {
        "total_logs": total_logs,
        "by_severity": by_severity,
        "by_source": by_source
    }


def get_trend_data(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    severity: Optional[SeverityEnum] = None,
    source: Optional[str] = None,
    interval: str = "hour"
) -> List[dict]:
    """Get time series trend data"""
    # Group by time interval
    if interval == "hour":
        time_bucket = func.date_trunc('hour', Log.timestamp)
    elif interval == "day":
        time_bucket = func.date_trunc('day', Log.timestamp)
    else:
        time_bucket = func.date_trunc('hour', Log.timestamp)

    query = db.query(
        time_bucket.label('time'),
        func.count(Log.id).label('count')
    )

    # Apply filters
    if start_date:
        query = query.filter(Log.timestamp >= start_date)
    if end_date:
        query = query.filter(Log.timestamp <= end_date)
    if severity:
        query = query.filter(Log.severity == severity)
    if source:
        query = query.filter(Log.source == source)

    results = query.group_by('time').order_by('time').all()

    return [{"timestamp": time, "count": count} for time, count in results]
