import Icon from '../Icon'

interface StatCardProps {
  icon: string
  label: string
  value: React.ReactNode
  hint?: string
  tone?: 'primary' | 'success' | 'secondary' | 'warning'
}

const TONES: Record<NonNullable<StatCardProps['tone']>, { tile: string; value: string }> = {
  primary: { tile: 'bg-primary/10 text-primary', value: 'text-primary' },
  success: { tile: 'bg-success/10 text-success', value: 'text-success' },
  secondary: { tile: 'bg-secondary/10 text-secondary', value: 'text-secondary' },
  warning: { tile: 'bg-warning/10 text-warning', value: 'text-warning' },
}

export default function StatCard({ icon, label, value, hint, tone = 'primary' }: StatCardProps) {
  const t = TONES[tone]
  return (
    <div className="panel rounded-xl">
      <div className="card-body p-4 flex-row items-center gap-3">
        <div className={`size-10 shrink-0 rounded-xl flex items-center justify-center ${t.tile}`}>
          <Icon name={icon} className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-base-content/55">{label}</div>
          <div className={`text-2xl font-bold tracking-tight tnum leading-tight ${t.value}`}>{value}</div>
          {hint && <div className="text-[11px] text-base-content/50 truncate">{hint}</div>}
        </div>
      </div>
    </div>
  )
}
