import Icon from '../Icon'

interface EmptyStateProps {
  icon?: string
  title: string
  hint?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon = 'chip', title, hint, action }: EmptyStateProps) {
  return (
    <div className="card bg-base-100 border border-base-300/60">
      <div className="card-body items-center text-center py-14">
        <div className="size-14 rounded-2xl bg-base-200 flex items-center justify-center">
          <Icon name={icon} className="size-7 text-base-content/40" />
        </div>
        <h2 className="text-lg font-semibold mt-3">{title}</h2>
        {hint && <p className="text-sm text-base-content/60 max-w-md">{hint}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}
