import * as Dialog from '@radix-ui/react-dialog'
import CredentialsViewer from './CredentialsViewer'
import type { DeviceRegistrationResponse } from '../types/api'

interface DeviceCredentialsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  credentials: DeviceRegistrationResponse | null
  deviceName?: string
}

export default function DeviceCredentialsDialog({ open, onOpenChange, credentials, deviceName }: DeviceCredentialsDialogProps) {
  if (!credentials) {
    return null
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[90vw] max-w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-base-100 p-6 shadow-xl overflow-y-auto">
          <Dialog.Title className="text-2xl font-bold mb-4">
            {deviceName ? `${deviceName} Credentials` : 'Device Credentials'}
          </Dialog.Title>
          <Dialog.Description className="text-base-content/70 mb-4">
            Store these credentials securely. They are only shown once after issuing the certificate.
          </Dialog.Description>

          <CredentialsViewer credentials={credentials} deviceId={credentials.device_id} />

          <div className="flex justify-end mt-6">
            <Dialog.Close asChild>
              <button className="btn btn-primary">Done</button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
