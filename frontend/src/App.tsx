import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'
import { WellnessStateProvider } from './hooks/useWellnessState'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'
import DeviceList from './pages/DeviceList'
import DeviceDetail from './pages/DeviceDetail'
import AddDevice from './pages/AddDevice'
import Login from './pages/Login'
import './App.css'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="main-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col min-h-screen bg-base-200">
        {/* Navbar */}
        <div className="navbar bg-base-300 lg:hidden">
          <div className="flex-none">
            <label htmlFor="main-drawer" className="btn btn-square btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </label>
          </div>
          <div className="flex-1">
            <span className="text-xl font-bold">IoT Dashboard</span>
          </div>
          <div className="flex-none">
            <button onClick={logout} className="btn btn-ghost btn-sm">
              Logout
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 min-h-full">
          {children}
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side">
        <label htmlFor="main-drawer" className="drawer-overlay"></label>
        <aside className={`bg-base-100 min-h-screen flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
          {/* Toggle button (desktop only) */}
          <div className="hidden lg:flex justify-end p-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="btn btn-ghost btn-xs btn-square"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {sidebarCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>

          <div className={`${sidebarCollapsed ? 'px-2' : 'p-4'}`}>
            <Link to="/" className={`flex items-center gap-2 font-bold ${sidebarCollapsed ? 'justify-center' : 'text-2xl'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`${sidebarCollapsed ? 'h-6 w-6' : 'h-8 w-8'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              {!sidebarCollapsed && <span>Lyncis</span>}
            </Link>
          </div>

          <ul className={`menu space-y-2 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            <li>
              <NavLink
                to="/"
                className={({ isActive }) => `${isActive ? 'active' : ''} ${sidebarCollapsed ? 'tooltip tooltip-right' : ''}`}
                data-tip="Dashboard"
                end
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {!sidebarCollapsed && 'Dashboard'}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/devices"
                className={({ isActive }) => `${isActive ? 'active' : ''} ${sidebarCollapsed ? 'tooltip tooltip-right' : ''}`}
                data-tip="Devices"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                {!sidebarCollapsed && 'Devices'}
              </NavLink>
            </li>
          </ul>
          
          <div className={`mt-auto ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            <button 
              onClick={logout} 
              className={`btn btn-ghost btn-sm w-full ${sidebarCollapsed ? 'tooltip tooltip-right' : ''}`}
              data-tip="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!sidebarCollapsed && 'Logout'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
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
              <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/devices" element={<ProtectedRoute><AppLayout><DeviceList /></AppLayout></ProtectedRoute>} />
              <Route path="/devices/add" element={<ProtectedRoute><AppLayout><AddDevice /></AppLayout></ProtectedRoute>} />
              <Route path="/devices/:id" element={<ProtectedRoute><AppLayout><DeviceDetail /></AppLayout></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </WellnessStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
