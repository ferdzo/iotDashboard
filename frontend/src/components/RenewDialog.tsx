import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { devicesApi } from '../api'
import toast from 'react-hot-toast'
import { useState } from 'react'
import CredentialsViewer from './CredentialsViewer'
import type { AxiosError } from 'axios'
import type { Device, DeviceRegistrationResponse } from '../types/api'

interface RenewDialogProps {
  device: Device
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function RenewDialog({ device, open, onOpenChange }: RenewDialogProps) {
  const queryClient = useQueryClient()
  const [credentials, setCredentials] = useState<DeviceRegistrationResponse | null>(null)

  const renewMutation = useMutation({
    mutationFn: () => devicesApi.renew(device.id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      queryClient.invalidateQueries({ queryKey: ['device', device.id] })
      setCredentials(response.data)
      toast.success(`Certificate for "${device.name}" renewed successfully`)
    },
    onError: (error) => {
      const axiosError = error as AxiosError<{ detail?: string }>
      const message = axiosError.response?.data?.detail || axiosError.message
      toast.error(`Failed to renew certificate: ${message}`)
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCredentials(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-base-100 p-6 shadow-xl overflow-y-auto">
          <Dialog.Title className="text-2xl font-bold mb-4">
            {credentials ? 'Certificate Renewed' : 'Renew Certificate'}
          </Dialog.Title>

          {!credentials ? (
            <>
              <Dialog.Description className="text-base-content/70 mb-6">
                This will generate a new certificate for <strong>{device.name}</strong>.
                You will need to update the device with the new credentials.
              </Dialog.Description>
              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <button className="btn btn-ghost" disabled={renewMutation.isPending}>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  className="btn btn-warning"
                  onClick={() => renewMutation.mutate()}
                  disabled={renewMutation.isPending}
                >
                  {renewMutation.isPending ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Renewing...
                    </>
                  ) : (
                    'Renew Certificate'
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="alert alert-warning mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Save these credentials now! They will not be shown again.</span>
              </div>

              <CredentialsViewer credentials={credentials} deviceId={device.id} />

              <div className="flex justify-end mt-6">
                <Dialog.Close asChild>
                  <button className="btn btn-primary">Done</button>
                </Dialog.Close>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
