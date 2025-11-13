import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
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
  const [showQR, setShowQR] = useState(false)

  // Read configuration from environment variables
  const deviceManagerUrl = import.meta.env.VITE_DEVICE_MANAGER_URL || 'http://localhost:8000'
  const mqttBroker = import.meta.env.VITE_MQTT_BROKER || 'localhost'
  const mqttPort = import.meta.env.VITE_MQTT_PORT || '8883'

  const qrData = credentials.onboarding_token ? JSON.stringify({
    type: 'iot_device_onboarding',
    device_id: resolvedDeviceId,
    token: credentials.onboarding_token,
    api_url: deviceManagerUrl,
    broker: mqttBroker,
    port: parseInt(mqttPort, 10),
  }) : null

  return (
    <div className="space-y-4">
      {/* Secure QR Code for Mobile Onboarding */}
      {qrData && (
        <div className="rounded-lg bg-success/10 border border-success/30 p-4">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Secure Mobile Onboarding</h3>
              <p className="text-sm opacity-80 mb-2">
                Scan this QR code with your mobile app to securely fetch certificates. Token expires in <strong>15 minutes</strong> and can only be used <strong>once</strong>.
              </p>
              <div className="alert alert-warning alert-sm mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-xs">This QR code will not be shown again. Scan it now!</span>
              </div>
              <button
                className="btn btn-sm btn-success"
                onClick={() => setShowQR(!showQR)}
              >
                {showQR ? 'Hide QR Code' : 'Show QR Code'}
              </button>
              {showQR && (
                <div className="mt-4 flex justify-center p-6 bg-white rounded-lg border-2 border-success">
                  <QRCodeSVG
                    value={qrData}
                    size={280}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
