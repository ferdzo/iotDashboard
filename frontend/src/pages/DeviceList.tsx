import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { dashboardApi, devicesApi } from '../api'
import type { DashboardOverview, Device } from '../types/api'
import DeleteDeviceDialog from '../components/DeleteDeviceDialog'
import RevokeDialog from '../components/RevokeDialog'
import RenewDialog from '../components/RenewDialog'
import { PageHeader, StatCard, StatusPill, EmptyState, WidgetSkeleton } from '../components/ui'
import Icon from '../components/Icon'

function certTone(status?: string): 'ok' | 'warn' | 'bad' | 'muted' {
  if (status === 'Valid') return 'ok'
  if (status === 'Expiring Soon') return 'warn'
  if (status) return 'bad'
  return 'muted'
}

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
      <div className="space-y-6">
        <PageHeader title="Devices" hint="Fleet registry and certificate health" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((key) => (
            <div key={key} className="panel rounded-xl">
              <div className="card-body p-4">
                <WidgetSkeleton lines={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        hint="Fleet registry and certificate health"
        actions={
          <Link to="/devices/add" className="btn btn-primary btn-sm gap-1.5">
            <Icon name="plus" className="size-4" />
            Add Device
          </Link>
        }
      />

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-base-content/55">System Health</h2>
        {overview ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard icon="shield-check" label="Total Devices" value={overview.total_devices} hint="Registered in system" tone="primary" />
            <StatCard icon="check-circle" label="Active Devices" value={overview.active_devices} hint="Currently online" tone="success" />
            <StatCard icon="signal" label="MQTT Devices" value={overview.mqtt_devices} hint="Using mTLS" tone="secondary" />
            <StatCard icon="alert" label="Expiring Soon" value={overview.certificates_expiring_soon} hint="Certificates need renewal" tone="warning" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((key) => (
              <div key={key} className="panel rounded-xl">
                <div className="card-body p-4">
                  <WidgetSkeleton lines={2} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-base-content/55">
                <th>Name</th>
                <th>Location</th>
                <th>Protocol</th>
                <th>Certificate</th>
                <th>Expires</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices && devices.length > 0 ? (
                devices.map((device: Device) => {
                  const expiresAt = device.active_certificate?.expires_at ?? device.certificate_expires_at

                  return (
                    <tr key={device.id} className="hover">
                      <td>
                        <Link to={`/devices/${device.id}`} className="font-semibold link-hover">
                          {device.name}
                        </Link>
                        <div className="text-[11px] text-base-content/45 tnum">{device.id}</div>
                      </td>
                      <td className="text-base-content/70">{device.location || '—'}</td>
                      <td>
                        <StatusPill tone="info">{device.protocol.toUpperCase()}</StatusPill>
                      </td>
                      <td>
                        {device.protocol === 'mqtt' ? (
                          <StatusPill tone={certTone(device.certificate_status)}>
                            {device.certificate_status || 'Unknown'}
                          </StatusPill>
                        ) : (
                          <StatusPill tone="muted">N/A</StatusPill>
                        )}
                      </td>
                      <td className="text-base-content/70 tnum">{expiresAt ? new Date(expiresAt).toLocaleDateString() : '—'}</td>
                      <td>
                        <div className="flex gap-1 justify-end">
                          <Link to={`/devices/${device.id}`} className="btn btn-ghost btn-xs">
                            View
                          </Link>
                          {device.protocol === 'mqtt' && (
                            <>
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => setRenewDevice(device)}
                              >
                                Renew
                              </button>
                              <button
                                className="btn btn-ghost btn-xs hover:text-error"
                                onClick={() => setRevokeDevice(device)}
                              >
                                Revoke
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-ghost btn-xs hover:text-error"
                            onClick={() => setDeleteDevice(device)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-4">
                    <EmptyState
                      icon="chip"
                      title="No devices yet"
                      hint="Register your first device to start streaming telemetry."
                      action={
                        <Link to="/devices/add" className="btn btn-primary btn-sm">
                          Add Your First Device
                        </Link>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
