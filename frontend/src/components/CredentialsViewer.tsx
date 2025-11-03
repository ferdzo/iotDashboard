import toast from 'react-hot-toast'
import type { DeviceRegistrationResponse } from '../types/api'

interface CredentialsViewerProps {
  credentials: DeviceRegistrationResponse
  deviceId?: string
}

const downloadFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success(`${filename} downloaded`)
}

const copyToClipboard = (content: string, label: string) => {
  navigator.clipboard.writeText(content)
  toast.success(`${label} copied to clipboard`)
}

export default function CredentialsViewer({ credentials, deviceId }: CredentialsViewerProps) {
  const resolvedDeviceId = credentials.device_id || deviceId || 'device'
  const expiresAt = credentials.expires_at ? new Date(credentials.expires_at).toLocaleString() : null

  return (
    <div className="space-y-4">
      {(credentials.certificate_id || expiresAt) && (
        <div className="rounded-lg bg-base-200 p-4 text-sm">
          <div className="flex flex-col gap-2">
            {credentials.certificate_id && (
              <div className="flex items-center justify-between">
                <span className="font-semibold">Certificate ID</span>
                <code className="bg-base-100 px-2 py-1 rounded">
                  {credentials.certificate_id}
                </code>
              </div>
            )}
            {expiresAt && (
              <div className="flex items-center justify-between">
                <span className="font-semibold">Expires At</span>
                <span>{expiresAt}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {credentials.ca_certificate_pem && (
        <div>
          <label className="label">
            <span className="label-text font-semibold">CA Certificate</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full font-mono text-xs h-32"
            value={credentials.ca_certificate_pem}
            readOnly
          />
          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => copyToClipboard(credentials.ca_certificate_pem!, 'CA certificate')}
            >
              Copy
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => downloadFile(credentials.ca_certificate_pem!, 'ca.crt')}
            >
              Download
            </button>
          </div>
        </div>
      )}

      {credentials.certificate_pem && (
        <div>
          <label className="label">
            <span className="label-text font-semibold">Device Certificate</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full font-mono text-xs h-32"
            value={credentials.certificate_pem}
            readOnly
          />
          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => copyToClipboard(credentials.certificate_pem!, 'Device certificate')}
            >
              Copy
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => downloadFile(credentials.certificate_pem!, `${resolvedDeviceId}.crt`)}
            >
              Download
            </button>
          </div>
        </div>
      )}

      {credentials.private_key_pem && (
        <div>
          <label className="label">
            <span className="label-text font-semibold">Private Key</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full font-mono text-xs h-32"
            value={credentials.private_key_pem}
            readOnly
          />
          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => copyToClipboard(credentials.private_key_pem!, 'Private key')}
            >
              Copy
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => downloadFile(credentials.private_key_pem!, `${resolvedDeviceId}.key`)}
            >
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
