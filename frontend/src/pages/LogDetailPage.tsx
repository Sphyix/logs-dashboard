import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material'
import { Edit, Delete, Save, Cancel } from '@mui/icons-material'
import { logsAPI } from '../services/api'
import { Severity } from '../types'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { getSeverityChipStyle } from '../constants/styles'

export default function LogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: log, isLoading, error } = useQuery({
    queryKey: ['log', id],
    queryFn: () => logsAPI.getById(id!),
    enabled: !!id,
  })

  const [formData, setFormData] = useState({
    message: '',
    severity: Severity.INFO,
    source: '',
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => logsAPI.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log', id] })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      setIsEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => logsAPI.delete(id!),
    onSuccess: () => {
      navigate('/logs')
    },
  })

  const handleEdit = () => {
    if (log) {
      setFormData({
        message: log.message,
        severity: log.severity,
        source: log.source,
      })
      setIsEditing(true)
    }
  }

  const handleSave = () => {
    updateMutation.mutate(formData)
  }

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !log) {
    return <Alert severity="error">Log not found</Alert>
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Log Details</Typography>
        <Box>
          <Button onClick={() => navigate('/logs')} sx={{ mr: 1 }}>
            Back to List
          </Button>
          {isAuthenticated && !isEditing && (
            <>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={handleEdit}
                sx={{ mr: 1 }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
                disabled={updateMutation.isPending}
                sx={{ mr: 1 }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ '& > *': { mb: 3 } }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              ID
            </Typography>
            <Typography variant="body1">{log.id}</Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Timestamp
            </Typography>
            <Typography variant="body1">
              {format(new Date(log.timestamp), 'MMMM dd, yyyy HH:mm:ss')}
            </Typography>
          </Box>

          {isEditing ? (
            <>
              <FormControl fullWidth>
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
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              />

              <TextField
                label="Message"
                fullWidth
                multiline
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </>
          ) : (
            <>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Severity
                </Typography>
                <Chip
                  label={log.severity}
                  sx={getSeverityChipStyle(log.severity)}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Source
                </Typography>
                <Typography variant="body1">{log.source}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Message
                </Typography>
                <Typography variant="body1">{log.message}</Typography>
              </Box>
            </>
          )}

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Created At
            </Typography>
            <Typography variant="body1">
              {format(new Date(log.created_at), 'MMMM dd, yyyy HH:mm:ss')}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Log</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this log? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
