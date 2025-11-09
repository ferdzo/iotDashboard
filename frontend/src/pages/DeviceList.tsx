import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { dashboardApi, devicesApi } from '../api'
import type { DashboardOverview, Device } from '../types/api'
import DeleteDeviceDialog from '../components/DeleteDeviceDialog'
import RevokeDialog from '../components/RevokeDialog'
import RenewDialog from '../components/RenewDialog'

export default function DeviceList() {
  const [deleteDevice, setDeleteDevice] = useState<Device | null>(null)
  const [revokeDevice, setRevokeDevice] = useState<Device | null>(null)
  const [renewDevice, setRenewDevice] = useState<Device | null>(null)
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await devicesApi.getAll()
      return response.data
    },
  })

  const { data: overview } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async (): Promise<DashboardOverview> => {
      const response = await dashboardApi.getOverview()
      return response.data
    },
    staleTime: 5000,
  })

  const devices = devicesData?.results || []

  if (devicesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Devices</h1>
        <Link to="/devices/add" className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Device
        </Link>
      </div>

      <section className="mb-8 space-y-4">
        <h2 className="text-xl font-semibold">System Health</h2>
        {overview ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="stats shadow">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div className="stat-title">Total Devices</div>
                <div className="stat-value text-primary">{overview.total_devices}</div>
                <div className="stat-desc">Registered in system</div>
              </div>
            </div>

            <div className="stats shadow">
              <div className="stat">
                <div className="stat-figure text-success">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="stat-title">Active Devices</div>
                <div className="stat-value text-success">{overview.active_devices}</div>
                <div className="stat-desc">Currently online</div>
              </div>
            </div>

            <div className="stats shadow">
              <div className="stat">
                <div className="stat-figure text-secondary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-15.857 21.213 0"
                    />
                  </svg>
                </div>
                <div className="stat-title">MQTT Devices</div>
                <div className="stat-value text-secondary">{overview.mqtt_devices}</div>
                <div className="stat-desc">Using mTLS</div>
              </div>
            </div>

            <div className="stats shadow">
              <div className="stat">
                <div className="stat-figure text-warning">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="stat-title">Expiring Soon</div>
                <div className="stat-value text-warning">
                  {overview.certificates_expiring_soon}
                </div>
                <div className="stat-desc">Certificates need renewal</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((key) => (
              <div key={key} className="stats shadow animate-pulse">
                <div className="stat">
                  <div className="stat-figure w-8 h-8 rounded-full bg-base-200"></div>
                  <div className="stat-title bg-base-200 h-4 w-24 rounded"></div>
                  <div className="stat-value bg-base-200 h-6 w-20 rounded mt-2"></div>
                  <div className="stat-desc bg-base-200 h-4 w-28 rounded mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Protocol</th>
              <th>Certificate Status</th>
              <th>Certificate Expiry</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices && devices.length > 0 ? (
              devices.map((device: Device) => {
                const expiresAt = device.active_certificate?.expires_at ?? device.certificate_expires_at

                return (
                  <tr key={device.id} className="hover">
                  <td className="font-semibold">{device.name}</td>
                  <td>{device.location || '—'}</td>
                  <td>
                    <div className="badge badge-info">{device.protocol.toUpperCase()}</div>
                  </td>
                  <td>
                    {device.protocol === 'mqtt' ? (
                      <div className={`badge ${
                        device.certificate_status === 'Valid' ? 'badge-success' :
                        device.certificate_status === 'Expiring Soon' ? 'badge-warning' :
                        'badge-error'
                      }`}>
                        {device.certificate_status || 'Unknown'}
                      </div>
                    ) : (
                      <span className="badge badge-ghost">N/A</span>
                    )}
                  </td>
                  <td>{expiresAt ? new Date(expiresAt).toLocaleString() : '—'}</td>
                  <td>
                    <div className="flex gap-2">
                      <Link to={`/devices/${device.id}`} className="btn btn-outline btn-info btn-xs">
                        View
                      </Link>
                      <button 
                        className="btn btn-error btn-xs"
                        onClick={() => setDeleteDevice(device)}
                      >
                        Delete
                      </button>
                      {device.protocol === 'mqtt' && (
                        <>
                          <button 
                            className="btn btn-outline btn-warning btn-xs"
                            onClick={() => setRenewDevice(device)}
                          >
                            Renew
                          </button>
                          <button 
                            className="btn btn-outline btn-error btn-xs"
                            onClick={() => setRevokeDevice(device)}
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg opacity-60">No devices found.</p>
                    <Link to="/devices/add" className="btn btn-primary btn-sm">
                      Add Your First Device
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      {deleteDevice && (
        <DeleteDeviceDialog
          device={deleteDevice}
          open={!!deleteDevice}
          onOpenChange={(open) => !open && setDeleteDevice(null)}
        />
      )}
      {revokeDevice && (
        <RevokeDialog
          device={revokeDevice}
          open={!!revokeDevice}
          onOpenChange={(open) => !open && setRevokeDevice(null)}
        />
      )}
      {renewDevice && (
        <RenewDialog
          device={renewDevice}
          open={!!renewDevice}
          onOpenChange={(open) => !open && setRenewDevice(null)}
        />
      )}
    </div>
  )
}
