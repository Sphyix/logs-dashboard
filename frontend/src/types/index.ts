export enum Severity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface User {
  id: string
  email: string
  name?: string
  created_at: string
  updated_at: string
}

export interface Log {
  id: string
  timestamp: string
  message: string
  severity: Severity
  source: string
  created_at: string
  updated_at: string
}

export interface LogFilters {
  severity?: Severity
  source?: string
  start_date?: string
  end_date?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface LogListResponse {
  items: Log[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AggregatedData {
  total_logs: number
  by_severity: Record<string, number>
  by_source: Record<string, number>
}

export interface TrendDataPoint {
  timestamp: string
  count: number
}

export interface TrendData {
  data_points: TrendDataPoint[]
}

export interface DistributionItem {
  label: string
  count: number
}

export interface DistributionData {
  items: DistributionItem[]
}
