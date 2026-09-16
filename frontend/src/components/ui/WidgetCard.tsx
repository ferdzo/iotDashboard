import Icon from '../Icon'

interface WidgetCardProps {
  title: string
  subtitle?: string
  status?: React.ReactNode
  onEdit?: () => void
  onRemove?: () => void
  children: React.ReactNode
}

export default function WidgetCard({ title, subtitle, status, onEdit, onRemove, children }: WidgetCardProps) {
  return (
    <section className="card bg-base-100 border border-base-300/60 h-full">
      <div className="card-body gap-3 p-4">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-base-content/70 truncate">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-base-content/50 truncate">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {status}
            {onEdit && (
              <button type="button" className="btn btn-xs btn-ghost btn-square" onClick={onEdit} title="Edit widget">
                <Icon name="edit" className="size-4" />
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                className="btn btn-xs btn-ghost btn-square hover:text-error"
                onClick={onRemove}
                title="Remove widget"
              >
                <Icon name="close" className="size-4" />
              </button>
            )}
          </div>
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </section>
  )
}
