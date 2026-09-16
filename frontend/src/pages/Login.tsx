import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import Icon from '../components/Icon'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const detail = axios.isAxiosError<{ detail?: string }>(err)
        ? err.response?.data?.detail
        : undefined
      setError(detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-base-200">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-base-300/60 border-r border-base-300/60">
        <div className="flex items-center gap-2.5">
          <span className="size-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Icon name="chip" className="size-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight">Lyncis</span>
        </div>
        <div className="space-y-6 max-w-md">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            Every device.<br />Every reading.<br />
            <span className="text-primary">One console.</span>
          </h1>
          <ul className="space-y-3 text-sm text-base-content/70">
            {['Live telemetry over mTLS MQTT', 'Command devices with delivery tracking', 'AI briefings on your environment'].map((line) => (
              <li key={line} className="flex items-center gap-2.5">
                <Icon name="check-circle" className="size-4 text-success shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-base-content/45">mTLS-secured IoT platform</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="card w-full max-w-sm bg-base-100 border border-base-300/60">
          <div className="card-body gap-4">
            <div className="lg:hidden flex items-center gap-2">
              <span className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Icon name="chip" className="size-4" />
              </span>
              <span className="font-semibold tracking-tight">Lyncis</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
              <p className="text-sm text-base-content/60 mt-0.5">Sign in to your console</p>
            </div>
            {error && <div className="alert alert-error text-sm py-2.5">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-[13px]">Username</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-[13px]">Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
              >
                {loading ? <span className="loading loading-spinner" /> : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
