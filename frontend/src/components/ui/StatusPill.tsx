interface StatusPillProps {
  tone: 'ok' | 'warn' | 'bad' | 'info' | 'muted'
  children: React.ReactNode
  pulse?: boolean
}

const TONES: Record<StatusPillProps['tone'], string> = {
  ok: 'badge-success',
  warn: 'badge-warning',
  bad: 'badge-error',
  info: 'badge-info',
  muted: 'badge-ghost',
}

export default function StatusPill({ tone, children, pulse }: StatusPillProps) {
  return (
    <span className={`badge badge-sm gap-1.5 font-medium ${TONES[tone]}`}>
      {pulse && <span className="size-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </span>
  )
}
