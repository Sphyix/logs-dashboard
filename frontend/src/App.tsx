import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LogListPage from './pages/LogListPage'
import LogDetailPage from './pages/LogDetailPage'
import LogCreatePage from './pages/LogCreatePage'
import DashboardPage from './pages/DashboardPage'
import { CircularProgress, Box } from '@mui/material'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/logs" element={<LogListPage />} />
          <Route path="/logs/:id" element={<LogDetailPage />} />
          <Route path="/logs/new" element={<LogCreatePage />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}

export default App
