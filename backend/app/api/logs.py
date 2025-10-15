from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import csv
import io
import math

from app.core.dependencies import get_db, require_user, get_current_user
from app.crud import log as log_crud
from app.schemas.log import Log, LogCreate, LogUpdate, LogList, LogFilter
from app.models.log import SeverityEnum
from app.models.user import User

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=LogList)
def get_logs(
    severity: Optional[SeverityEnum] = None,
    source: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    sort_by: str = "timestamp",
    sort_order: str = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get list of logs with filtering, search, sorting, and pagination

    **Public endpoint** - No authentication required

    - **severity**: Filter by severity level
    - **source**: Filter by source
    - **start_date**: Filter logs after this date
    - **end_date**: Filter logs before this date
    - **search**: Full-text search in log messages
    - **sort_by**: Field to sort by (default: timestamp)
    - **sort_order**: asc or desc (default: desc)
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 50, max: 100)
    """
    filter_params = LogFilter(
        severity=severity,
        source=source,
        start_date=start_date,
        end_date=end_date,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size
    )

    logs, total = log_crud.get_logs(db, filter_params)
    total_pages = math.ceil(total / page_size)

    return LogList(
        items=logs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/export")
def export_logs_csv(
    severity: Optional[SeverityEnum] = None,
    source: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Export logs to CSV file with optional filtering

    **Public endpoint** - No authentication required
    """
    filter_params = LogFilter(
        severity=severity,
        source=source,
        start_date=start_date,
        end_date=end_date,
        search=search,
        page=1,
        page_size=10000  # Export max 10k logs
    )

    logs, _ = log_crud.get_logs(db, filter_params)

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow(['ID', 'Timestamp', 'Severity', 'Source', 'Message'])

    # Write data
    for log in logs:
        writer.writerow([
            str(log.id),
            log.timestamp.isoformat(),
            log.severity.value,
            log.source,
            log.message
        ])

    # Prepare response
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=logs_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )


@router.get("/{log_id}", response_model=Log)
def get_log(log_id: str, db: Session = Depends(get_db)):
    """
    Get a single log by ID

    **Public endpoint** - No authentication required
    """
    log = log_crud.get_log(db, log_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )
    return log


@router.post("", response_model=Log, status_code=status.HTTP_201_CREATED)
def create_log(
    log: LogCreate,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Create a new log entry

    **Requires authentication**
    """
    return log_crud.create_log(db, log)


@router.put("/{log_id}", response_model=Log)
def update_log(
    log_id: str,
    log_update: LogUpdate,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing log

    **Requires authentication**
    """
    updated_log = log_crud.update_log(db, log_id, log_update)
    if not updated_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )
    return updated_log


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(
    log_id: str,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Delete a log entry

    **Requires authentication**
    """
    success = log_crud.delete_log(db, log_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )
    return None
