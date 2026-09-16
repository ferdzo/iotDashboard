import Icon from '../Icon'

interface WidgetCardProps {
  title: string
  subtitle?: string
  status?: React.ReactNode
  live?: boolean
  editing?: boolean
  onEdit?: () => void
  onRemove?: () => void
  children: React.ReactNode
}

export default function WidgetCard({
  title,
  subtitle,
  status,
  live,
  editing,
  onEdit,
  onRemove,
  children,
}: WidgetCardProps) {
  return (
    <section
      className={`panel relative flex h-full flex-col overflow-hidden rounded-xl ${
        editing ? 'ring-1 ring-primary/35' : ''
      }`}
    >
      <header
        className={`flex items-center justify-between gap-2 px-3.5 pt-3 pb-1.5 ${
          editing ? 'rounded-t-xl bg-primary/[0.06]' : ''
        }`}
      >
        <div
          className={`flex min-w-0 flex-1 items-center gap-2 ${
            editing ? 'widget-drag-handle cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          {editing && (
            <Icon name="drag" className="size-3.5 shrink-0 text-base-content/40" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {live && (
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
              )}
              <h3 className="truncate font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-base-content/60">
                {title}
              </h3>
            </div>
            {subtitle && <p className="truncate text-[11px] text-base-content/40">{subtitle}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {status}
          {onEdit && (
            <button
              type="button"
              className="btn btn-xs btn-ghost btn-square text-base-content/50 hover:text-base-content"
              onClick={onEdit}
              title="Configure widget"
              aria-label="Configure widget"
            >
              <Icon name="edit" className="size-3.5" />
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              className="btn btn-xs btn-ghost btn-square text-base-content/50 hover:text-error"
              onClick={onRemove}
              title="Remove widget"
              aria-label="Remove widget"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1 px-3.5 pt-1 pb-3.5">{children}</div>
    </section>
  )
}
