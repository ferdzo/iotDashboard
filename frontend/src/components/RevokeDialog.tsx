import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { devicesApi } from '../api'
import toast from 'react-hot-toast'
import type { AxiosError } from 'axios'
import type { Device } from '../types/api'

interface RevokeDialogProps {
  device: Device
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function RevokeDialog({ device, open, onOpenChange }: RevokeDialogProps) {
  const queryClient = useQueryClient()

  const revokeMutation = useMutation({
    mutationFn: () => devicesApi.revoke(device.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      queryClient.invalidateQueries({ queryKey: ['device', device.id] })
      toast.success(`Certificate for "${device.name}" revoked successfully`)
      onOpenChange(false)
    },
    onError: (error) => {
      const axiosError = error as AxiosError<{ detail?: string }>
      const message = axiosError.response?.data?.detail || axiosError.message
      toast.error(`Failed to revoke certificate: ${message}`)
    },
  })

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-base-100 p-6 shadow-xl">
          <AlertDialog.Title className="text-2xl font-bold mb-2">
            Revoke Certificate
          </AlertDialog.Title>
          <AlertDialog.Description className="text-base-content/70 mb-6">
            Are you sure you want to revoke the certificate for <strong>{device.name}</strong>? 
            The device will no longer be able to connect until you renew its certificate.
          </AlertDialog.Description>
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button className="btn btn-ghost" disabled={revokeMutation.isPending}>
                Cancel
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                className="btn btn-warning"
                onClick={(e) => {
                  e.preventDefault()
                  revokeMutation.mutate()
                }}
                disabled={revokeMutation.isPending}
              >
                {revokeMutation.isPending ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Revoking...
                  </>
                ) : (
                  'Revoke Certificate'
                )}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
