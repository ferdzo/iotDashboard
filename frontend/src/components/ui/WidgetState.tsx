import Icon from '../Icon'

export function WidgetSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2 animate-pulse" aria-label="Loading">
      <div className="h-7 w-2/3 rounded bg-base-300/70" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded bg-base-300/50" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function WidgetError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-error">
        <Icon name="alert" className="size-4" />
        {message}
      </span>
      {onRetry && (
        <button type="button" className="btn btn-xs btn-ghost" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

export function WidgetEmpty({ message }: { message: string }) {
  return <p className="text-sm text-base-content/50">{message}</p>
}
