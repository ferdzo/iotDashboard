import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Icon from './Icon'
import ThemeToggle from './ThemeToggle'

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true },
  { to: '/devices', label: 'Devices', icon: 'chip', end: false },
] as const

export default function AppLayout() {
  const { logout } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="main-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col min-h-screen bg-base-200">
        {/* Mobile navbar */}
        <div className="bg-base-100/80 backdrop-blur border-b border-base-300/60 lg:hidden flex items-center gap-2 px-3 h-14">
          <div className="flex-none">
            <label htmlFor="main-drawer" className="btn btn-ghost btn-sm btn-square" aria-label="Open menu">
              <Icon name="menu" className="size-5" />
            </label>
          </div>
          <div className="flex-1">
            <span className="font-semibold tracking-tight">Lyncis</span>
          </div>
          <div className="flex-none flex items-center">
            <ThemeToggle />
            <button onClick={logout} className="btn btn-ghost btn-sm btn-square" aria-label="Logout">
              <Icon name="logout" className="size-[18px]" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 min-h-full">
          <div className="mx-auto max-w-[1400px] p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-40">
        <label htmlFor="main-drawer" className="drawer-overlay"></label>
        <aside className={`bg-base-100/80 backdrop-blur border-r border-base-300/60 min-h-screen flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'w-[68px]' : 'w-60'}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2 pt-4' : 'gap-2.5 px-4 pt-5'}`}>
            <Link to="/" className="flex items-center gap-2.5 min-w-0" aria-label="Lyncis home">
              <span className="size-9 shrink-0 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <Icon name="chip" className="size-5" />
              </span>
              {!sidebarCollapsed && (
                <span className="min-w-0">
                  <span className="block font-semibold tracking-tight leading-none">Lyncis</span>
                  <span className="block text-[11px] text-base-content/50 mt-0.5">IoT Console</span>
                </span>
              )}
            </Link>
          </div>

          <nav className={`${sidebarCollapsed ? 'px-2' : 'px-3'} mt-6`}>
            {!sidebarCollapsed && (
              <p className="px-3 mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-base-content/40">
                Monitor
              </p>
            )}
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.to} className="relative">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        sidebarCollapsed ? 'justify-center' : ''
                      } ${
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-base-content/65 hover:bg-[var(--surface-hover)] hover:text-base-content'
                      }`
                    }
                  >
                    <Icon name={item.icon} className="size-[18px] shrink-0" />
                    {!sidebarCollapsed && item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className={`mt-auto flex ${sidebarCollapsed ? 'flex-col items-center gap-1 p-2' : 'items-center gap-1 p-3'} border-t border-base-300/60`}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="btn btn-ghost btn-sm btn-square hidden lg:inline-flex"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon name={sidebarCollapsed ? 'chevrons-expand' : 'chevrons-collapse'} className="size-[18px]" />
            </button>
            <ThemeToggle />
            <button
              onClick={logout}
              className="btn btn-ghost btn-sm btn-square hover:text-error"
              title="Logout"
              aria-label="Logout"
            >
              <Icon name="logout" className="size-[18px]" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
