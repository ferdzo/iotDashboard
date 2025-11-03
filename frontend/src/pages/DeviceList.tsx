import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { devicesApi } from '../api'
import type { Device } from '../types/api'
import DeleteDeviceDialog from '../components/DeleteDeviceDialog'
import RevokeDialog from '../components/RevokeDialog'
import RenewDialog from '../components/RenewDialog'

export default function DeviceList() {
  const [deleteDevice, setDeleteDevice] = useState<Device | null>(null)
  const [revokeDevice, setRevokeDevice] = useState<Device | null>(null)
  const [renewDevice, setRenewDevice] = useState<Device | null>(null)
  const { data: devicesData, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await devicesApi.getAll()
      return response.data
    },
  })

  const devices = devicesData?.results || []

  if (isLoading) {
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
