import * as Dialog from '@radix-ui/react-dialog'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { devicesApi } from '../api'
import toast from 'react-hot-toast'
import axios from 'axios'
import type { AxiosError } from 'axios'
import type { Device } from '../types/api'

interface CommandDialogProps {
  device: Device
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent: (reqId: string) => void
}

const COMMON_ACTIONS = ['reboot', 'set_threshold', 'set_interval', 'set_mode']

export default function CommandDialog({ device, open, onOpenChange, onSent }: CommandDialogProps) {
  const [action, setAction] = useState(COMMON_ACTIONS[0])
  const [customAction, setCustomAction] = useState('')
  const [payloadText, setPayloadText] = useState('{}')
  const [payloadError, setPayloadError] = useState<string | null>(null)
  const [ttlSec, setTtlSec] = useState(300)

  const sendMutation = useMutation({
    mutationFn: () => {
      let payload: Record<string, unknown>
      try {
        const parsed: unknown = JSON.parse(payloadText || '{}')
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('payload must be a JSON object')
        }
        payload = parsed as Record<string, unknown>
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Invalid JSON payload'
        setPayloadError(message)
        throw new Error(message)
      }
      setPayloadError(null)
      const resolvedAction = action === '__custom' ? customAction.trim() : action
      return devicesApi.sendCommand(device.id, {
        action: resolvedAction,
        payload,
        ttl_sec: ttlSec,
      })
    },
    onSuccess: (response) => {
      const reqId = response.data.req_id
      toast.success(`Command sent (req_id ${reqId.slice(0, 8)}…)`)
      onSent(reqId)
      onOpenChange(false)
    },
    onError: (error) => {
      // Client-side payload validation throws a plain Error before any
      // request is sent; axios failures are server/network errors.
      if (!axios.isAxiosError(error)) {
        toast.error(`Invalid payload: ${error.message} — no request sent`)
        return
      }
      const axiosError = error as AxiosError<{ error?: string; detail?: string }>
      const message =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.detail ||
        axiosError.message
      toast.error(`Failed to send command: ${message}`)
    },
  })

  const resolvedAction = action === '__custom' ? customAction.trim() : action
  const canSend =
    resolvedAction.length > 0 &&
    Number.isInteger(ttlSec) &&
    ttlSec >= 1 &&
    ttlSec <= 86400 &&
    !sendMutation.isPending

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPayloadError(null)
      sendMutation.reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-base-100 p-6 shadow-xl overflow-y-auto">
          <Dialog.Title className="text-2xl font-bold mb-4">
            Send Command to {device.name}
          </Dialog.Title>
          <Dialog.Description className="text-base-content/70 mb-6">
            Published to <code>devices/{device.id}/commands/&lt;action&gt;</code> with
            delivery tracking. Default expiry is 5 minutes.
          </Dialog.Description>

          <div className="flex flex-col gap-4">
            <label className="form-control">
              <span className="label label-text font-semibold">Action</span>
              <select
                className="select select-bordered w-full"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                {COMMON_ACTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
                <option value="__custom">Custom…</option>
              </select>
            </label>

            {action === '__custom' && (
              <label className="form-control">
                <span className="label label-text font-semibold">Custom action</span>
                <input
                  className="input input-bordered w-full"
                  placeholder="e.g. calibrate"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                />
              </label>
            )}

            <label className="form-control">
              <span className="label label-text font-semibold">Payload (JSON object)</span>
              <textarea
                className={`textarea textarea-bordered w-full font-mono text-sm ${payloadError ? 'textarea-error' : ''}`}
                rows={4}
                value={payloadText}
                onChange={(e) => {
                  setPayloadText(e.target.value)
                  setPayloadError(null)
                }}
              />
              {payloadError && (
                <span className="label label-text-alt text-error">{payloadError}</span>
              )}
            </label>

            <label className="form-control">
              <span className="label label-text font-semibold">TTL override (seconds, 1–86400)</span>
              <input
                type="number"
                className="input input-bordered w-full"
                min={1}
                max={86400}
                value={ttlSec}
                onChange={(e) => setTtlSec(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Dialog.Close asChild>
              <button className="btn btn-ghost" disabled={sendMutation.isPending}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              className="btn btn-primary"
              onClick={() => sendMutation.mutate()}
              disabled={!canSend}
            >
              {sendMutation.isPending ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Sending…
                </>
              ) : (
                'Send Command'
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
