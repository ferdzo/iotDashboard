import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { AxiosError } from 'axios'
import { devicesApi } from '../api'
import DeviceCredentialsDialog from '../components/DeviceCredentialsDialog'
import type { DeviceRegistrationRequest, DeviceRegistrationResponse } from '../types/api'

type DeviceRegistrationForm = DeviceRegistrationRequest

export default function AddDevice() {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeviceRegistrationForm>({
    defaultValues: {
      protocol: 'mqtt',
    },
  })

  const [credentials, setCredentials] = useState<DeviceRegistrationResponse | null>(null)
  const [credentialsOpen, setCredentialsOpen] = useState(false)

  const registerMutation = useMutation({
    mutationFn: (payload: DeviceRegistrationRequest) => devicesApi.create(payload),
    onSuccess: (response) => {
      setCredentials(response.data)
      setCredentialsOpen(true)
      toast.success('Device registered successfully')
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      reset({ name: '', location: '', protocol: 'mqtt' })
    },
    onError: (error) => {
      const axiosError = error as AxiosError<{ detail?: string }>
      const message = axiosError.response?.data?.detail || axiosError.message
      toast.error(`Failed to register device: ${message}`)
    },
  })

  const onSubmit = (data: DeviceRegistrationForm) => {
    if (data.protocol !== 'mqtt') {
      toast.error('Only MQTT devices are supported right now')
      return
    }

    registerMutation.mutate({
      name: data.name.trim(),
      location: data.location?.trim() || undefined,
      protocol: 'mqtt',
    })
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
        <h1 className="text-3xl font-bold">Add New Device</h1>
      </div>

      <div className="card bg-base-100 shadow-xl max-w-2xl">
        <div className="card-body">
          <h2 className="card-title">Device Registration</h2>
          <p className="text-sm opacity-70 mb-4">
            Register a new IoT device. For MQTT devices, a certificate will be automatically generated.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Device Name *</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Office Temperature Sensor"
                className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
                {...register('name', { required: 'Device name is required' })}
              />
              {errors.name && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.name.message}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Location</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Office Room 101"
                className="input input-bordered w-full"
                {...register('location')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Protocol *</span>
              </label>
              <select
                className="select select-bordered w-full"
                {...register('protocol')}
              >
                <option value="mqtt">MQTT (with mTLS)</option>
                <option value="http" disabled>
                  HTTP (coming soon)
                </option>
                <option value="webhook" disabled>
                  Webhook (coming soon)
                </option>
              </select>
              <label className="label">
                <span className="label-text-alt">MQTT devices will receive a certificate for secure communication</span>
              </label>
            </div>

            <div className="card-actions justify-end mt-6">
              <Link to="/devices" className="btn btn-ghost">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Registering...
                  </>
                ) : (
                  'Register Device'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <DeviceCredentialsDialog
        open={credentialsOpen}
        credentials={credentials}
        deviceName={credentials?.device_id}
        onOpenChange={(open) => {
          setCredentialsOpen(open)
          if (!open) {
            setCredentials(null)
          }
        }}
      />
    </div>
  )
}
