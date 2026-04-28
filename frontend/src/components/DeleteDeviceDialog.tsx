import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { devicesApi } from '../api'
import toast from 'react-hot-toast'
import type { AxiosError } from 'axios'
import type { Device } from '../types/api'

interface DeleteDeviceDialogProps {
  device: Device
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export default function DeleteDeviceDialog({ device, open, onOpenChange, onDeleted }: DeleteDeviceDialogProps) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => devicesApi.delete(device.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      queryClient.invalidateQueries({ queryKey: ['device', device.id] })
      toast.success(`Device "${device.name}" deleted successfully`)
      onDeleted?.()
      onOpenChange(false)
    },
    onError: (error) => {
      const axiosError = error as AxiosError<{ detail?: string }>
      const message = axiosError.response?.data?.detail || axiosError.message
      toast.error(`Failed to delete device: ${message}`)
    },
  })

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-base-100 p-6 shadow-xl">
          <AlertDialog.Title className="text-2xl font-bold mb-2">
            Delete Device
          </AlertDialog.Title>
          <AlertDialog.Description className="text-base-content/70 mb-6">
            Are you sure you want to delete <strong>{device.name}</strong>? This action cannot be undone.
            All associated telemetry data and certificates will be permanently removed.
          </AlertDialog.Description>
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button className="btn btn-ghost" disabled={deleteMutation.isPending}>
                Cancel
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                className="btn btn-error"
                onClick={(e) => {
                  e.preventDefault()
                  deleteMutation.mutate()
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete Device'
                )}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
