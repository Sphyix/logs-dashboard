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
  Button,
  Slide,
} from '@mui/material'
import { Visibility, Refresh } from '@mui/icons-material'
import { logsAPI, sseAPI } from '../services/api'
import { Severity, type LogFilters, type LogListResponse } from '../types'
import { format } from 'date-fns'
import { getSeverityChipStyle } from '../constants/styles'
import { useSSE } from '../hooks/useSSE'

export default function LogListPage() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

  const [filters, setFilters] = useState<LogFilters>({
    page: 1,
    page_size: 50,
    sort_by: 'timestamp',
    sort_order: 'desc',
  })

  const [isFiltersSticky, setIsFiltersSticky] = useState(false)
  const [newLogsCount, setNewLogsCount] = useState(0)
  const [previousCount, setPreviousCount] = useState<number | null>(null)

  const { data, isLoading, error, refetch } = useQuery<LogListResponse>({
    queryKey: ['logs', filters],
    queryFn: () => logsAPI.getList(filters),
  })

  // Track new logs when data changes
  useEffect(() => {
    if (data && filters.page === 1 && filters.sort_order === 'desc') {
      if (previousCount !== null && data.total > previousCount) {
        const diff = data.total - previousCount
        if (!isAtTop()) {
          setNewLogsCount(diff)
        }
      }
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

  // Auto-refresh when at top
  useEffect(() => {
    if (sseCountData && isAtTop() && filters.page === 1 && filters.sort_order === 'desc') {
      // Only refetch if count changed
      if (previousCount !== null && sseCountData.count !== previousCount) {
        refetch()
      }
    }
  }, [sseCountData, refetch])

  // Scroll detection for sticky filters
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY

      if (filtersRef.current) {
        const filtersTop = filtersRef.current.offsetTop
        setIsFiltersSticky(scrollTop > filtersTop - 20)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleFilterChange = (key: keyof LogFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
    setNewLogsCount(0)
  }

  const handlePageChange = (_: unknown, newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage + 1 }))
    setNewLogsCount(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      page_size: parseInt(event.target.value, 10),
      page: 1,
    }))
    setNewLogsCount(0)
  }

  const handleRefreshClick = () => {
    refetch()
    setNewLogsCount(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (error) {
    return <Alert severity="error">Failed to load logs</Alert>
  }

  return (
    <Box ref={containerRef}>
      <Typography variant="h4" mb={3}>Logs</Typography>

      {/* New logs notification banner */}
      <Slide direction="down" in={newLogsCount > 0} mountOnEnter unmountOnExit>
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={handleRefreshClick} startIcon={<Refresh />}>
              Load {newLogsCount} New {newLogsCount === 1 ? 'Log' : 'Logs'}
            </Button>
          }
          sx={{
            mb: 2,
            position: isFiltersSticky ? 'fixed' : 'relative',
            top: isFiltersSticky ? 64 : 'auto',
            left: isFiltersSticky ? 0 : 'auto',
            right: isFiltersSticky ? 0 : 'auto',
            zIndex: isFiltersSticky ? 1100 : 'auto',
            mx: isFiltersSticky ? 2 : 0,
          }}
        >
          {newLogsCount} new {newLogsCount === 1 ? 'log' : 'logs'} available
        </Alert>
      </Slide>

      {/* Filters - sticky when scrolling */}
      <Paper
        ref={filtersRef}
        sx={{
          p: 2,
          mb: 2,
          position: isFiltersSticky ? 'fixed' : 'relative',
          top: isFiltersSticky ? (newLogsCount > 0 ? 128 : 64) : 'auto',
          left: isFiltersSticky ? 0 : 'auto',
          right: isFiltersSticky ? 0 : 'auto',
          zIndex: isFiltersSticky ? 1000 : 'auto',
          boxShadow: isFiltersSticky ? 4 : 1,
          mx: isFiltersSticky ? 2 : 0,
          borderRadius: isFiltersSticky ? 2 : 1,
          bgcolor: 'background.paper',
        }}
      >
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

      {/* Spacer to prevent content jump when filters become sticky */}
      {isFiltersSticky && <Box sx={{ height: 80 }} />}

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
                {data?.items.map((log) => (
                  <TableRow key={log.id} hover>
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
                ))}
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
    </Box>
  )
}
