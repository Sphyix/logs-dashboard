import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material'
import { Save, Cancel } from '@mui/icons-material'
import { logsAPI } from '../services/api'
import { Severity } from '../types'

export default function LogCreatePage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    message: '',
    severity: Severity.INFO,
    source: '',
    timestamp: new Date().toISOString().slice(0, 16),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => logsAPI.create(data),
    onSuccess: (data) => {
      navigate(`/logs/${data.id}`)
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create log')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.message || !formData.source) {
      setError('Message and Source are required')
      return
    }

    createMutation.mutate({
      ...formData,
      timestamp: new Date(formData.timestamp).toISOString(),
    })
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Create New Log</Typography>
        <Button onClick={() => navigate('/logs')}>Cancel</Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ '& > *': { mb: 3 } }}>
          <FormControl fullWidth required>
            <InputLabel>Severity</InputLabel>
            <Select
              value={formData.severity}
              label="Severity"
              onChange={(e) => setFormData({ ...formData, severity: e.target.value as Severity })}
            >
              {Object.values(Severity).map((sev) => (
                <MenuItem key={sev} value={sev}>
                  {sev}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Source"
            fullWidth
            required
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            placeholder="e.g., web-server, api-gateway"
          />

          <TextField
            label="Timestamp"
            type="datetime-local"
            fullWidth
            value={formData.timestamp}
            onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Message"
            fullWidth
            required
            multiline
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Enter log message..."
          />

          <Box display="flex" gap={2}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Log'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={() => navigate('/logs')}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}
