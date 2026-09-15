import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { devicesApi } from '../api'
import DeleteDeviceDialog from '../components/DeleteDeviceDialog'
import RenewDialog from '../components/RenewDialog'
import RevokeDialog from '../components/RevokeDialog'
import CommandDialog from '../components/CommandDialog'

const COMMAND_STATE_BADGE: Record<string, string> = {
  requested: 'badge-info',
  acked: 'badge-success',
  expired: 'badge-warning',
  failed: 'badge-error',
}

function commandStateBadgeClass(state: string): string {
  return COMMAND_STATE_BADGE[state] ?? 'badge-ghost'
}

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [lastReqId, setLastReqId] = useState<string | null>(null)

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: async () => {
      const response = await devicesApi.getOne(id!)
      return response.data
    },
    enabled: !!id,
  })

  const { data: commandStatus } = useQuery({
    queryKey: ['commandStatus', id, lastReqId],
    queryFn: async () => {
      const response = await devicesApi.getCommandStatus(id!, lastReqId!)
      return response.data
    },
    enabled: !!id && !!lastReqId,
    // Poll command_log state until the command settles; terminal states
    // (acked/expired/failed) stop polling.
    refetchInterval: (query) =>
      query.state.data?.state === 'requested' ? 2000 : false,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Device not found</span>
        </div>
        <Link to="/devices" className="btn btn-ghost mt-4">
          Back to Device List
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link to="/devices" className="btn btn-ghost btn-sm mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Devices
        </Link>
        <h1 className="text-3xl font-bold">Device Details</h1>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">{device.name}</h2>

          <div className="overflow-x-auto">
            <table className="table">
              <tbody>
                <tr>
                  <th className="w-1/3">Device ID:</th>
                  <td><code className="bg-base-200 px-3 py-1 rounded">{device.id}</code></td>
                </tr>
                <tr>
                  <th>Location:</th>
                  <td>{device.location || '—'}</td>
                </tr>
                <tr>
                  <th>Protocol:</th>
                  <td>
                    <div className="badge badge-info">{device.protocol.toUpperCase()}</div>
                  </td>
                </tr>
                <tr>
                  <th>Status:</th>
                  <td>
                    <div className={`badge ${device.is_active ? 'badge-success' : 'badge-ghost'}`}>
                      {device.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </td>
                </tr>
                <tr>
                  <th>Created:</th>
                  <td>{new Date(device.created_at).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Certificate Information for MQTT devices */}
          {device.protocol === 'mqtt' && device.active_certificate && (
            <div className="mt-6">
              <h3 className="text-xl font-bold mb-4">Certificate Information</h3>
              <div className="overflow-x-auto">
                <table className="table">
                  <tbody>
                    <tr>
                      <th className="w-1/3">Certificate ID:</th>
                      <td><code className="bg-base-200 px-3 py-1 rounded">{device.active_certificate.id}</code></td>
                    </tr>
                    <tr>
                      <th>Issued At:</th>
                      <td>{new Date(device.active_certificate.issued_at).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <th>Expires At:</th>
                      <td>{new Date(device.active_certificate.expires_at).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <th>Days Until Expiry:</th>
                      <td>
                        <span className={`font-semibold ${
                          device.active_certificate.days_until_expiry < 30 ? 'text-warning' :
                          device.active_certificate.days_until_expiry < 7 ? 'text-error' :
                          'text-success'
                        }`}>
                          {device.active_certificate.days_until_expiry} days
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <th>Status:</th>
                      <td>
                        {device.active_certificate.revoked_at ? (
                          <div className="badge badge-error">Revoked</div>
                        ) : device.active_certificate.is_expired ? (
                          <div className="badge badge-error">Expired</div>
                        ) : device.active_certificate.is_expiring_soon ? (
                          <div className="badge badge-warning">Expiring Soon</div>
                        ) : (
                          <div className="badge badge-success">Active</div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Command panel */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Device Commands</h3>
              <button className="btn btn-outline btn-primary btn-sm" onClick={() => setCommandOpen(true)}>
                Send Command
              </button>
            </div>
            {lastReqId ? (
              <div className="flex items-center gap-3 flex-wrap">
                <code className="bg-base-200 px-3 py-1 rounded text-sm">{lastReqId}</code>
                {commandStatus ? (
                  <div className={`badge ${commandStateBadgeClass(commandStatus.state)}`}>
                    {commandStatus.state}
                  </div>
                ) : (
                  <span className="loading loading-spinner loading-sm"></span>
                )}
                {commandStatus && (
                  <span className="text-sm text-base-content/70">
                    {commandStatus.action} · TTL {commandStatus.ttl_sec}s
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-base-content/70">No commands sent yet from this view.</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="card-actions justify-end mt-6">
            {device.protocol === 'mqtt' && (
              <>
                <button className="btn btn-outline btn-warning" onClick={() => setRenewOpen(true)}>
                  Renew Certificate
                </button>
                <button className="btn btn-outline btn-error" onClick={() => setRevokeOpen(true)}>
                  Revoke Certificate
                </button>
              </>
            )}
            <button className="btn btn-error" onClick={() => setDeleteOpen(true)}>
              Delete Device
            </button>
          </div>
        </div>
      </div>

      <DeleteDeviceDialog
        device={device}
        open={deleteOpen}
        onOpenChange={(open) => setDeleteOpen(open)}
        onDeleted={() => navigate('/devices')}
      />
      <CommandDialog
        device={device}
        open={commandOpen}
        onOpenChange={(open) => setCommandOpen(open)}
        onSent={(reqId) => setLastReqId(reqId)}
      />
      {device.protocol === 'mqtt' && (
        <>
          <RenewDialog
            device={device}
            open={renewOpen}
            onOpenChange={(open) => setRenewOpen(open)}
          />
          <RevokeDialog
            device={device}
            open={revokeOpen}
            onOpenChange={(open) => setRevokeOpen(open)}
          />
        </>
      )}
    </div>
  )
}
