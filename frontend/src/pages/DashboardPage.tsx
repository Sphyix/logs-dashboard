import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  TextField,
  Chip,
} from '@mui/material'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'
import { analyticsAPI, sseAPI } from '../services/api'
import { Severity, AggregatedData, TrendData, DistributionData } from '../types'
import { format, subDays } from 'date-fns'
import { getSeverityColors, sortBySeverity } from '../constants/styles'
import { useSSE } from '../hooks/useSSE'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export default function DashboardPage() {
  const [filters, setFilters] = useState({
    severity: undefined as Severity | undefined,
    source: undefined as string | undefined,
    start_date: format(subDays(new Date(), 4), "yyyy-MM-dd'T'HH:mm"),
    end_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    interval: 'hour',
  })

  // State for real-time data
  const [aggregated, setAggregated] = useState<AggregatedData | null>(null)
  const [trend, setTrend] = useState<TrendData | null>(null)
  const [distribution, setDistribution] = useState<DistributionData | null>(null)

  // Initial data fetch using React Query
  const { data: aggregatedData, isLoading: aggregatedLoading } = useQuery({
    queryKey: ['analytics', 'aggregated', filters],
    queryFn: () => analyticsAPI.getAggregated({
      severity: filters.severity,
      source: filters.source,
      start_date: filters.start_date,
      end_date: filters.end_date,
    }),
  })

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['analytics', 'trend', filters],
    queryFn: () => analyticsAPI.getTrend({
      severity: filters.severity,
      source: filters.source,
      start_date: filters.start_date,
      end_date: filters.end_date,
      interval: filters.interval,
    }),
  })

  const { data: distributionData, isLoading: distributionLoading } = useQuery({
    queryKey: ['analytics', 'distribution', filters],
    queryFn: () => analyticsAPI.getDistribution({
      source: filters.source,
      start_date: filters.start_date,
      end_date: filters.end_date,
    }),
  })

  // Update state when initial data is loaded
  useEffect(() => {
    if (aggregatedData) setAggregated(aggregatedData)
  }, [aggregatedData])

  useEffect(() => {
    if (trendData) setTrend(trendData)
  }, [trendData])

  useEffect(() => {
    if (distributionData) setDistribution(distributionData)
  }, [distributionData])

  // SSE connections for real-time updates
  const { isConnected: aggregatedConnected } = useSSE<AggregatedData>({
    url: sseAPI.getAggregatedUrl({
      severity: filters.severity,
      source: filters.source,
      start_date: filters.start_date,
      end_date: filters.end_date,
      interval: 5,
    }),
    enabled: !aggregatedLoading,
    onMessage: (data) => {
      // Remove timestamp field before setting
      const { timestamp, ...cleanData } = data
      setAggregated(cleanData as AggregatedData)
    },
  })

  const { isConnected: trendConnected } = useSSE<TrendData>({
    url: sseAPI.getTrendUrl({
      severity: filters.severity,
      source: filters.source,
      start_date: filters.start_date,
      end_date: filters.end_date,
      trend_interval: filters.interval,
      update_interval: 5,
    }),
    enabled: !trendLoading,
    onMessage: (data) => {
      const { timestamp, ...cleanData } = data
      setTrend(cleanData as TrendData)
    },
  })

  const { isConnected: distributionConnected } = useSSE<DistributionData>({
    url: sseAPI.getDistributionUrl({
      source: filters.source,
      start_date: filters.start_date,
      end_date: filters.end_date,
      interval: 5,
    }),
    enabled: !distributionLoading,
    onMessage: (data) => {
      const { timestamp, ...cleanData } = data
      setDistribution(cleanData as DistributionData)
    },
  })

  const isLoading = aggregatedLoading || trendLoading || distributionLoading
  const allConnected = aggregatedConnected && trendConnected && distributionConnected

  // Trend chart data
  const trendChartData = {
    labels: trend?.data_points.map(d => format(new Date(d.timestamp), 'MMM dd HH:mm')) || [],
    datasets: [
      {
        label: 'Log Count',
        data: trend?.data_points.map(d => d.count) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
    ],
  }

  const sortedDistribution = sortBySeverity(distribution?.items || [])

  const distributionChartData = {
    labels: sortedDistribution.map(d => d.label),
    datasets: [
      {
        label: 'Count',
        data: sortedDistribution.map(d => d.count),
        backgroundColor: getSeverityColors(sortedDistribution.map(d => d.label)),
      },
    ],
  }

  const pieChartData = {
    labels: sortedDistribution.map(d => d.label),
    datasets: [
      {
        data: sortedDistribution.map(d => d.count),
        backgroundColor: getSeverityColors(sortedDistribution.map(d => d.label)),
      },
    ],
  }

  return (
    <Box>
      <Typography variant="h4" mb={3}>
        Dashboard
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Filters
          </Typography>
          {allConnected && (
            <Chip
              label="Live Updates"
              color="success"
              size="small"
              sx={{ animation: 'pulse 2s ease-in-out infinite', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.7 } } }}
            />
          )}
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Start Date"
              type="datetime-local"
              fullWidth
              size="small"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="End Date"
              type="datetime-local"
              fullWidth
              size="small"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Severity</InputLabel>
              <Select
                value={filters.severity || ''}
                label="Severity"
                onChange={(e) => setFilters({ ...filters, severity: e.target.value as Severity || undefined })}
              >
                <MenuItem value="">All</MenuItem>
                {Object.values(Severity).map((sev) => (
                  <MenuItem key={sev} value={sev}>{sev}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Source"
              fullWidth
              size="small"
              value={filters.source || ''}
              onChange={(e) => setFilters({ ...filters, source: e.target.value || undefined })}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Interval</InputLabel>
              <Select
                value={filters.interval}
                label="Interval"
                onChange={(e) => setFilters({ ...filters, interval: e.target.value })}
              >
                <MenuItem value="hour">Hour</MenuItem>
                <MenuItem value="day">Day</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Stats Cards */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Logs
                  </Typography>
                  <Typography variant="h4">
                    {aggregated?.total_logs || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Error Logs
                  </Typography>
                  <Typography variant="h4" color="error">
                    {(aggregated?.by_severity.ERROR || 0) + (aggregated?.by_severity.CRITICAL || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Warning Logs
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {aggregated?.by_severity.WARNING || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" mb={2}>
                  Log Count Trend Over Time
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line
                    data={trendChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' },
                        title: { display: false },
                      },
                    }}
                  />
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" mb={2}>
                  Severity Distribution (Bar Chart)
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar
                    data={distributionChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                      },
                    }}
                  />
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" mb={2}>
                  Severity Distribution (Pie Chart)
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Pie
                    data={pieChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'right' },
                      },
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  )
}
