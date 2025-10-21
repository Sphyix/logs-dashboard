import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Fab,
  Badge,
  Zoom,
} from '@mui/material'
import { Visibility, KeyboardArrowUp } from '@mui/icons-material'
import { logsAPI, sseAPI } from '../services/api'
import { Severity, type LogFilters, type LogListResponse } from '../types'
import { format } from 'date-fns'
import { getSeverityChipStyle } from '../constants/styles'
import { useSSE } from '../hooks/useSSE'

export default function LogListPage() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  const [filters, setFilters] = useState<LogFilters>({
    page: 1,
    page_size: 50,
    sort_by: 'timestamp',
    sort_order: 'desc',
  })

  const [showScrollTop, setShowScrollTop] = useState(false)
  const [newLogsCount, setNewLogsCount] = useState(0)
  const [previousCount, setPreviousCount] = useState<number | null>(null)
  const [previousLogIds, setPreviousLogIds] = useState<Set<string>>(new Set())
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set())

  const { data, isLoading, error, refetch } = useQuery<LogListResponse>({
    queryKey: ['logs', filters],
    queryFn: () => logsAPI.getList(filters),
  })

  // Track new logs when data changes (for flash animation and count tracking)
  useEffect(() => {
    if (data && filters.page === 1 && filters.sort_order === 'desc') {
      const currentIds = new Set(data.items.map(log => log.id))

      // Find new log IDs for flash animation
      const newIds = new Set<string>()
      data.items.forEach(log => {
        if (!previousLogIds.has(log.id)) {
          newIds.add(log.id)
        }
      })

      if (newIds.size > 0) {
        setNewLogIds(newIds)

        // Clear animation after 1 second
        setTimeout(() => {
          setNewLogIds(new Set())
        }, 1000)
      }

      setPreviousLogIds(currentIds)

      // Update previousCount to current total
      setPreviousCount(data.total)
    }
  }, [data])

  // SSE connection for log count updates
  const { data: sseCountData } = useSSE<{ count: number }>({
    url: sseAPI.getLogsCountUrl({
      severity: filters.severity,
      source: filters.source,
      start_date: filters.start_date,
      end_date: filters.end_date,
      interval: 3,
    }),
    enabled: true,
  })

  // Detect if user is at the top of the page
  const isAtTop = () => {
    return window.scrollY < 100
  }

  // Handle SSE count updates
  useEffect(() => {
    if (sseCountData && filters.page === 1 && filters.sort_order === 'desc') {
      const currentCount = sseCountData.count

      if (previousCount !== null && currentCount > previousCount) {
        const diff = currentCount - previousCount

        if (isAtTop()) {
          // At top: auto-refetch to show new logs
          refetch()
        } else {
          // Scrolled down: update badge with difference
          setNewLogsCount(prev => prev + diff)
        }
      }
    }
  }, [sseCountData, refetch, previousCount, filters.page, filters.sort_order])

  // Scroll detection for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      setShowScrollTop(scrollTop > 300)

      // Reset badge count when scrolling back to top
      if (scrollTop < 100 && newLogsCount > 0) {
        setNewLogsCount(0)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [newLogsCount])

  const handleFilterChange = (key: keyof LogFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
    setNewLogsCount(0)
    setPreviousLogIds(new Set())
    setNewLogIds(new Set())
  }

  const handlePageChange = (_: unknown, newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage + 1 }))
    setNewLogsCount(0)
    setPreviousLogIds(new Set())
    setNewLogIds(new Set())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      page_size: parseInt(event.target.value, 10),
      page: 1,
    }))
    setNewLogsCount(0)
    setPreviousLogIds(new Set())
    setNewLogIds(new Set())
  }

  const handleScrollToTop = () => {
    setNewLogsCount(0)
    setPreviousLogIds(new Set())
    setNewLogIds(new Set())
    refetch()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (error) {
    return <Alert severity="error">Failed to load logs</Alert>
  }

  return (
    <Box ref={containerRef}>
      <Typography variant="h4" mb={3}>Logs</Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            placeholder="Search in messages..."
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={filters.severity || ''}
              label="Severity"
              onChange={(e) => handleFilterChange('severity', e.target.value || undefined)}
            >
              <MenuItem value="">All</MenuItem>
              {Object.values(Severity).map((sev) => (
                <MenuItem key={sev} value={sev}>
                  {sev}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Source"
            variant="outlined"
            size="small"
            value={filters.source || ''}
            onChange={(e) => handleFilterChange('source', e.target.value || undefined)}
            sx={{ minWidth: 150 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={filters.sort_by || 'timestamp'}
              label="Sort By"
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
            >
              <MenuItem value="timestamp">Timestamp</MenuItem>
              <MenuItem value="severity">Severity</MenuItem>
              <MenuItem value="source">Source</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Order</InputLabel>
            <Select
              value={filters.sort_order || 'desc'}
              label="Order"
              onChange={(e) => handleFilterChange('sort_order', e.target.value as 'asc' | 'desc')}
            >
              <MenuItem value="desc">Descending</MenuItem>
              <MenuItem value="asc">Ascending</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((log) => {
                  const isNewLog = newLogIds.has(log.id)
                  return (
                    <TableRow
                      key={log.id}
                      hover
                      sx={isNewLog ? {
                        animation: 'flashGreen 1s ease-out',
                        '@keyframes flashGreen': {
                          '0%': {
                            backgroundColor: 'rgba(76, 175, 80, 0.4)',
                          },
                          '100%': {
                            backgroundColor: 'transparent',
                          },
                        },
                      } : {}}
                    >
                      <TableCell>
                        {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.severity}
                          size="small"
                          sx={getSeverityChipStyle(log.severity)}
                        />
                      </TableCell>
                      <TableCell>{log.source}</TableCell>
                      <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.message}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/logs/${log.id}`)}
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={data?.total || 0}
            page={(filters.page || 1) - 1}
            onPageChange={handlePageChange}
            rowsPerPage={filters.page_size || 50}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </>
      )}

      {/* Floating back-to-top button with new logs badge */}
      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="medium"
          onClick={handleScrollToTop}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <Badge
            badgeContent={newLogsCount}
            color="success"
            max={999}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.75rem',
                height: '20px',
                minWidth: '20px',
                backgroundColor: '#4caf50',
                color: '#fff',
                fontWeight: 'bold',
              }
            }}
          >
            <KeyboardArrowUp />
          </Badge>
        </Fab>
      </Zoom>
    </Box>
  )
}
