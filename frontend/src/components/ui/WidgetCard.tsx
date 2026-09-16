import Icon from '../Icon'

interface WidgetCardProps {
  title: string
  subtitle?: string
  status?: React.ReactNode
  onEdit?: () => void
  onRemove?: () => void
  children: React.ReactNode
}

/**
 * The one widget surface. Keeps the theme-aware `panel` treatment; the body is
 * a flex column (like the card-body it replaced) so children using `flex-1`
 * and percentage-height charts resolve their height.
 */
export default function WidgetCard({ title, subtitle, status, onEdit, onRemove, children }: WidgetCardProps) {
  return (
    <section className="panel flex h-full flex-col overflow-hidden rounded-xl">
      <header className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-1">
        <div className="min-w-0">
          <h3 className="truncate font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-base-content/60">
            {title}
          </h3>
          {subtitle && <p className="truncate text-[11px] text-base-content/40">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
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
      <div className="flex min-h-0 flex-1 flex-col px-4 pt-1 pb-4">{children}</div>
    </section>
  )
}
