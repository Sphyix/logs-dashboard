from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.core.dependencies import get_db
from app.crud import log as log_crud
from app.schemas.analytics import AggregatedData, TrendData, DistributionData, TrendDataPoint, DistributionItem
from app.models.log import SeverityEnum

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/aggregated", response_model=AggregatedData)
def get_aggregated_data(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    severity: Optional[SeverityEnum] = None,
    source: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get aggregated log data

    **Public endpoint** - No authentication required

    Returns total count and counts grouped by severity and source

    - **start_date**: Filter logs after this date
    - **end_date**: Filter logs before this date
    - **severity**: Filter by severity level
    - **source**: Filter by source
    """
    data = log_crud.get_aggregated_data(
        db,
        start_date=start_date,
        end_date=end_date,
        severity=severity,
        source=source
    )
    return AggregatedData(**data)


@router.get("/trend", response_model=TrendData)
def get_trend_data(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    severity: Optional[SeverityEnum] = None,
    source: Optional[str] = None,
    interval: str = Query("hour", description="Time interval: hour or day"),
    db: Session = Depends(get_db)
):
    """
    Get time series trend data for charts

    **Public endpoint** - No authentication required

    Returns log counts grouped by time intervals

    - **start_date**: Filter logs after this date
    - **end_date**: Filter logs before this date
    - **severity**: Filter by severity level
    - **source**: Filter by source
    - **interval**: Time bucket interval (hour or day)
    """
    data_points = log_crud.get_trend_data(
        db,
        start_date=start_date,
        end_date=end_date,
        severity=severity,
        source=source,
        interval=interval
    )

    trend_points = [TrendDataPoint(**point) for point in data_points]
    return TrendData(data_points=trend_points)


@router.get("/distribution", response_model=DistributionData)
def get_distribution_data(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    source: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get severity distribution data for histogram/pie charts

    **Public endpoint** - No authentication required

    Returns count of logs for each severity level

    - **start_date**: Filter logs after this date
    - **end_date**: Filter logs before this date
    - **source**: Filter by source
    """
    aggregated = log_crud.get_aggregated_data(
        db,
        start_date=start_date,
        end_date=end_date,
        source=source
    )

    items = [
        DistributionItem(label=severity, count=count)
        for severity, count in aggregated["by_severity"].items()
    ]

    return DistributionData(items=items)
