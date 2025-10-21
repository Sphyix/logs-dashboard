from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, AsyncGenerator
from datetime import datetime
import asyncio
import json

from app.core.dependencies import get_db
from app.crud import log as log_crud
from app.models.log import SeverityEnum
from app.schemas.analytics import AggregatedData, TrendData, DistributionData, TrendDataPoint, DistributionItem


def json_serializer(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

router = APIRouter(prefix="/sse", tags=["sse"])


async def event_generator(
    data_fetcher,
    db: Session,
    interval: int = 5
) -> AsyncGenerator[str, None]:
    """
    Generic SSE event generator

    Args:
        data_fetcher: Function to fetch data
        db: Database session
        interval: Update interval in seconds
    """
    try:
        while True:
            # Fetch data
            data = data_fetcher(db)

            # Format as SSE event
            yield f"data: {json.dumps(data, default=json_serializer)}\n\n"

            # Wait before next update
            await asyncio.sleep(interval)
    except asyncio.CancelledError:
        # Client disconnected
        pass


@router.get("/logs/count")
async def stream_logs_count(
    severity: Optional[SeverityEnum] = None,
    source: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    interval: int = Query(5, ge=1, le=60, description="Update interval in seconds"),
    db: Session = Depends(get_db)
):
    """
    SSE endpoint that streams the count of logs matching filters

    **Public endpoint** - No authentication required

    Sends updates every `interval` seconds with the current count
    """
    def fetch_count(db_session: Session):
        from app.crud.log import get_logs
        from app.schemas.log import LogFilter

        filter_params = LogFilter(
            severity=severity,
            source=source,
            start_date=start_date,
            end_date=end_date,
            page=1,
            page_size=1
        )
        _, total = get_logs(db_session, filter_params)
        return {"count": total, "timestamp": datetime.utcnow().isoformat()}

    return StreamingResponse(
        event_generator(fetch_count, db, interval),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/analytics/aggregated")
async def stream_aggregated_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    severity: Optional[SeverityEnum] = None,
    source: Optional[str] = None,
    interval: int = Query(5, ge=1, le=60, description="Update interval in seconds"),
    db: Session = Depends(get_db)
):
    """
    SSE endpoint that streams aggregated analytics data

    **Public endpoint** - No authentication required

    Sends updates every `interval` seconds with current aggregated data
    """
    def fetch_aggregated(db_session: Session):
        data = log_crud.get_aggregated_data(
            db_session,
            start_date=start_date,
            end_date=end_date,
            severity=severity,
            source=source
        )
        result = AggregatedData(**data).model_dump()
        result["timestamp"] = datetime.utcnow().isoformat()
        return result

    return StreamingResponse(
        event_generator(fetch_aggregated, db, interval),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/analytics/trend")
async def stream_trend_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    severity: Optional[SeverityEnum] = None,
    source: Optional[str] = None,
    trend_interval: str = Query("hour", description="Time interval: hour or day"),
    update_interval: int = Query(5, ge=1, le=60, description="Update interval in seconds"),
    db: Session = Depends(get_db)
):
    """
    SSE endpoint that streams trend analytics data

    **Public endpoint** - No authentication required

    Sends updates every `update_interval` seconds with current trend data
    """
    def fetch_trend(db_session: Session):
        data_points = log_crud.get_trend_data(
            db_session,
            start_date=start_date,
            end_date=end_date,
            severity=severity,
            source=source,
            interval=trend_interval
        )
        trend_points = [TrendDataPoint(**point) for point in data_points]
        result = TrendData(data_points=trend_points).model_dump()
        result["timestamp"] = datetime.utcnow().isoformat()
        return result

    return StreamingResponse(
        event_generator(fetch_trend, db, update_interval),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/analytics/distribution")
async def stream_distribution_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    source: Optional[str] = None,
    interval: int = Query(5, ge=1, le=60, description="Update interval in seconds"),
    db: Session = Depends(get_db)
):
    """
    SSE endpoint that streams distribution analytics data

    **Public endpoint** - No authentication required

    Sends updates every `interval` seconds with current distribution data
    """
    def fetch_distribution(db_session: Session):
        aggregated = log_crud.get_aggregated_data(
            db_session,
            start_date=start_date,
            end_date=end_date,
            source=source
        )
        items = [
            DistributionItem(label=severity, count=count)
            for severity, count in aggregated["by_severity"].items()
        ]
        result = DistributionData(items=items).model_dump()
        result["timestamp"] = datetime.utcnow().isoformat()
        return result

    return StreamingResponse(
        event_generator(fetch_distribution, db, interval),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
