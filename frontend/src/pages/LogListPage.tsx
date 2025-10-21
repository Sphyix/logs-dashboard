import { useState } from 'react'
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
} from '@mui/material'
import { Visibility } from '@mui/icons-material'
import { logsAPI } from '../services/api'
import { Severity, type LogFilters } from '../types'
import { format } from 'date-fns'
import { getSeverityChipStyle } from '../constants/styles'

export default function LogListPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<LogFilters>({
    page: 1,
    page_size: 50,
    sort_by: 'timestamp',
    sort_order: 'desc',
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['logs', filters],
    queryFn: () => logsAPI.getList(filters),
  })

  const handleFilterChange = (key: keyof LogFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handlePageChange = (_: unknown, newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage + 1 }))
  }

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      page_size: parseInt(event.target.value, 10),
      page: 1,
    }))
  }

  if (error) {
    return <Alert severity="error">Failed to load logs</Alert>
  }

  return (
    <Box>
      <Typography variant="h4" mb={3}>Logs</Typography>

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
