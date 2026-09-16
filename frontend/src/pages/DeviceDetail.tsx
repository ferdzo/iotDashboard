import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { devicesApi } from '../api'
import DeleteDeviceDialog from '../components/DeleteDeviceDialog'
import RenewDialog from '../components/RenewDialog'
import RevokeDialog from '../components/RevokeDialog'
import CommandDialog from '../components/CommandDialog'
import { PageHeader, StatusPill, EmptyState, WidgetSkeleton, WidgetError } from '../components/ui'
import Icon from '../components/Icon'

function commandStateTone(state: string): 'ok' | 'warn' | 'bad' | 'info' | 'muted' {
  if (state === 'acked') return 'ok'
  if (state === 'expired') return 'warn'
  if (state === 'failed') return 'bad'
  if (state === 'requested') return 'info'
  return 'muted'
}

function certTone(cert: { revoked_at?: string | null; is_expired?: boolean; is_expiring_soon?: boolean }): 'ok' | 'warn' | 'bad' {
  if (cert.revoked_at || cert.is_expired) return 'bad'
  if (cert.is_expiring_soon) return 'warn'
  return 'ok'
}

function certLabel(cert: { revoked_at?: string | null; is_expired?: boolean; is_expiring_soon?: boolean }): string {
  if (cert.revoked_at) return 'Revoked'
  if (cert.is_expired) return 'Expired'
  if (cert.is_expiring_soon) return 'Expiring Soon'
  return 'Active'
}

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [lastReqId, setLastReqId] = useState<string | null>(null)

  const { data: device, isLoading, error } = useQuery({
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
      <div className="space-y-6">
        <PageHeader title="Device" hint="Loading device details" />
        <div className="card bg-base-100 border border-base-300/60">
          <div className="card-body">
            <WidgetSkeleton lines={5} />
          </div>
        </div>
      </div>
    )
  }

  if (error || !device) {
    return (
      <div className="space-y-6">
        <PageHeader title="Device" />
        {error ? (
          <WidgetError message={error instanceof Error ? error.message : 'Failed to load device'} />
        ) : (
          <EmptyState
            icon="chip"
            title="Device not found"
            hint="It may have been deleted."
            action={
              <Link to="/devices" className="btn btn-ghost btn-sm">
                Back to Device List
              </Link>
            }
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={device.name}
        hint={device.id}
        actions={
          <>
            <Link to="/devices" className="btn btn-ghost btn-sm gap-1.5">
              <Icon name="arrow-left" className="size-4" />
              Devices
            </Link>
            <button className="btn btn-primary btn-sm" onClick={() => setCommandOpen(true)}>
              Send Command
            </button>
          </>
        }
      />

      <div className="card bg-base-100 border border-base-300/60">
        <div className="card-body gap-5">
          <div className="overflow-x-auto">
            <table className="table">
              <tbody>
                <tr>
                  <th className="w-1/3 text-base-content/55 font-medium">Device ID</th>
                  <td><code className="bg-base-200 px-2.5 py-1 rounded-md text-[13px] tnum">{device.id}</code></td>
                </tr>
                <tr>
                  <th className="text-base-content/55 font-medium">Location</th>
                  <td>{device.location || '—'}</td>
                </tr>
                <tr>
                  <th className="text-base-content/55 font-medium">Protocol</th>
                  <td>
                    <StatusPill tone="info">{device.protocol.toUpperCase()}</StatusPill>
                  </td>
                </tr>
                <tr>
                  <th className="text-base-content/55 font-medium">Status</th>
                  <td>
                    <StatusPill tone={device.is_active ? 'ok' : 'muted'}>
                      {device.is_active ? 'Active' : 'Inactive'}
                    </StatusPill>
                  </td>
                </tr>
                <tr>
                  <th className="text-base-content/55 font-medium">Created</th>
                  <td className="text-base-content/70">{new Date(device.created_at).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Certificate Information for MQTT devices */}
          {device.protocol === 'mqtt' && device.active_certificate && (
            <div className="space-y-3">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-base-content/55">Certificate</h3>
              <div className="overflow-x-auto">
                <table className="table">
                  <tbody>
                    <tr>
                      <th className="w-1/3 text-base-content/55 font-medium">Certificate ID</th>
                      <td><code className="bg-base-200 px-2.5 py-1 rounded-md text-[13px] tnum">{device.active_certificate.id}</code></td>
                    </tr>
                    <tr>
                      <th className="text-base-content/55 font-medium">Issued</th>
                      <td className="text-base-content/70">{new Date(device.active_certificate.issued_at).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <th className="text-base-content/55 font-medium">Expires</th>
                      <td className="text-base-content/70">{new Date(device.active_certificate.expires_at).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <th className="text-base-content/55 font-medium">Validity</th>
                      <td className="tnum">
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
                      <th className="text-base-content/55 font-medium">Status</th>
                      <td>
                        <StatusPill tone={certTone(device.active_certificate)}>
                          {certLabel(device.active_certificate)}
                        </StatusPill>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Command panel */}
          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-base-content/55">Last Command</h3>
            {lastReqId ? (
              <div className="flex items-center gap-3 flex-wrap">
                <code className="bg-base-200 px-2.5 py-1 rounded-md text-[13px] tnum">{lastReqId}</code>
                {commandStatus ? (
                  <StatusPill tone={commandStateTone(commandStatus.state)} pulse={commandStatus.state === 'requested'}>
                    {commandStatus.state}
                  </StatusPill>
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
              <p className="text-sm text-base-content/60">No commands sent yet from this view.</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-base-300/60">
            {device.protocol === 'mqtt' && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setRenewOpen(true)}>
                  Renew Certificate
                </button>
                <button className="btn btn-ghost btn-sm hover:text-error" onClick={() => setRevokeOpen(true)}>
                  Revoke Certificate
                </button>
              </>
            )}
            <button className="btn btn-ghost btn-sm hover:text-error" onClick={() => setDeleteOpen(true)}>
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
