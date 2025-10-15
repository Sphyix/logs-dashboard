from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime
from app.models.log import SeverityEnum


class AggregatedData(BaseModel):
    """Aggregated log counts"""
    total_logs: int
    by_severity: Dict[str, int]
    by_source: Dict[str, int]


class TrendDataPoint(BaseModel):
    """Single data point in time series"""
    timestamp: datetime
    count: int
    severity: str = None


class TrendData(BaseModel):
    """Time series trend data"""
    data_points: List[TrendDataPoint]


class DistributionItem(BaseModel):
    """Distribution item"""
    label: str
    count: int


class DistributionData(BaseModel):
    """Distribution data for charts"""
    items: List[DistributionItem]
