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

export default api
