import axios from 'axios'
import type {
  User,
  Log,
  LogFilters,
  LogListResponse,
  AggregatedData,
  TrendData,
  DistributionData,
} from '../types'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth API
export const authAPI = {
  register: async (email: string, password: string, name?: string) => {
    const { data } = await api.post<User>('/auth/register', { email, password, name })
    return data
  },

  login: async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string; token_type: string }>(
      '/auth/login',
      { email, password }
    )
    return data
  },

  me: async () => {
    const { data } = await api.get<User>('/auth/me')
    return data
  },
}

// Logs API
export const logsAPI = {
  getList: async (filters: LogFilters) => {
    const { data } = await api.get<LogListResponse>('/logs', { params: filters })
    return data
  },

  getById: async (id: string) => {
    const { data} = await api.get<Log>(`/logs/${id}`)
    return data
  },

  create: async (log: Omit<Log, 'id' | 'created_at' | 'updated_at'>) => {
    const { data } = await api.post<Log>('/logs', log)
    return data
  },

  update: async (id: string, log: Partial<Log>) => {
    const { data } = await api.put<Log>(`/logs/${id}`, log)
    return data
  },

  delete: async (id: string) => {
    await api.delete(`/logs/${id}`)
  },
}

// Analytics API
export const analyticsAPI = {
  getAggregated: async (filters: Omit<LogFilters, 'page' | 'page_size' | 'sort_by' | 'sort_order' | 'search'>) => {
    const { data } = await api.get<AggregatedData>('/analytics/aggregated', { params: filters })
    return data
  },

  getTrend: async (filters: Omit<LogFilters, 'page' | 'page_size' | 'sort_by' | 'sort_order' | 'search'> & { interval?: string }) => {
    const { data } = await api.get<TrendData>('/analytics/trend', { params: filters })
    return data
  },

  getDistribution: async (filters: Omit<LogFilters, 'page' | 'page_size' | 'sort_by' | 'sort_order' | 'search' | 'severity'>) => {
    const { data } = await api.get<DistributionData>('/analytics/distribution', { params: filters })
    return data
  },
}

// SSE API - URL builders for EventSource
export const sseAPI = {
  getLogsCountUrl: (filters: Omit<LogFilters, 'page' | 'page_size' | 'sort_by' | 'sort_order' | 'search'> & { interval?: number }) => {
    const params = new URLSearchParams()
    if (filters.severity) params.append('severity', filters.severity)
    if (filters.source) params.append('source', filters.source)
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    if (filters.interval) params.append('interval', filters.interval.toString())

    const queryString = params.toString()
    return `${API_URL}/sse/logs/count${queryString ? '?' + queryString : ''}`
  },

  getAggregatedUrl: (filters: Omit<LogFilters, 'page' | 'page_size' | 'sort_by' | 'sort_order' | 'search'> & { interval?: number }) => {
    const params = new URLSearchParams()
    if (filters.severity) params.append('severity', filters.severity)
    if (filters.source) params.append('source', filters.source)
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    if (filters.interval) params.append('interval', filters.interval.toString())

    const queryString = params.toString()
    return `${API_URL}/sse/analytics/aggregated${queryString ? '?' + queryString : ''}`
  },

  getTrendUrl: (filters: Omit<LogFilters, 'page' | 'page_size' | 'sort_by' | 'sort_order' | 'search'> & { trend_interval?: string; update_interval?: number }) => {
    const params = new URLSearchParams()
    if (filters.severity) params.append('severity', filters.severity)
    if (filters.source) params.append('source', filters.source)
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    if (filters.trend_interval) params.append('trend_interval', filters.trend_interval)
    if (filters.update_interval) params.append('update_interval', filters.update_interval.toString())

    const queryString = params.toString()
    return `${API_URL}/sse/analytics/trend${queryString ? '?' + queryString : ''}`
  },

  getDistributionUrl: (filters: Omit<LogFilters, 'page' | 'page_size' | 'sort_by' | 'sort_order' | 'search' | 'severity'> & { interval?: number }) => {
    const params = new URLSearchParams()
    if (filters.source) params.append('source', filters.source)
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    if (filters.interval) params.append('interval', filters.interval.toString())

    const queryString = params.toString()
    return `${API_URL}/sse/analytics/distribution${queryString ? '?' + queryString : ''}`
  },
}

export default api
