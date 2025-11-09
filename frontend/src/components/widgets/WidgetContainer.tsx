import type { WidgetConfig } from '../../hooks'
import { widgetRegistry } from './registry'

interface WidgetContainerProps {
  config: WidgetConfig
  onRemove?: (id: string) => void
  onEdit?: (id: string) => void
}

export default function WidgetContainer({ config, onRemove, onEdit }: WidgetContainerProps) {
  const WidgetComponent = widgetRegistry[config.type]

  if (!WidgetComponent) {
    return (
      <div className="card bg-error/10">
        <div className="card-body">
          <p className="text-error">Unknown widget type: {config.type}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group h-full">
      {/* Drag handle and actions */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-base-300/90 to-transparent">
        <div className="drag-handle cursor-move flex items-center gap-1 px-2 py-1 rounded bg-base-100/80 text-xs">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
          Drag
        </div>
        <div className="flex gap-1">
          {onEdit && (
            <button
              className="btn btn-xs btn-circle btn-ghost bg-base-100/80"
              onClick={() => onEdit(config.id)}
              title="Edit widget"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
          {onRemove && (
            <button
              className="btn btn-xs btn-circle btn-ghost bg-base-100/80"
              onClick={() => onRemove(config.id)}
              title="Remove widget"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Actual widget */}
      <div className="h-full">
        <WidgetComponent config={config} />
      </div>
    </div>
  )
}
