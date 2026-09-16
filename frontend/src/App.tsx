import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { WellnessStateProvider } from './hooks/useWellnessState'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import DeviceList from './pages/DeviceList'
import DeviceDetail from './pages/DeviceDetail'
import AddDevice from './pages/AddDevice'
import Login from './pages/Login'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 2,
    },
  },
})

function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WellnessStateProvider>
          <BrowserRouter>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/devices" element={<DeviceList />} />
                  <Route path="/devices/add" element={<AddDevice />} />
                  <Route path="/devices/:id" element={<DeviceDetail />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </WellnessStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
