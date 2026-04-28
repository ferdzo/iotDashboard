import { memo, useEffect, useRef } from 'react'
import type { WidgetConfig } from '../../hooks'
import { widgetRegistry } from './registry'

interface WidgetContainerProps {
  config: WidgetConfig
  onRemove?: (id: string) => void
  onEdit?: (id: string) => void
  onHeightChange?: (height: number) => void
}

function WidgetContainer({ config, onRemove, onEdit, onHeightChange }: WidgetContainerProps) {
  const WidgetComponent = widgetRegistry[config.type]
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!onHeightChange || !contentRef.current) return

    const node = contentRef.current

    const emitHeight = () => {
      onHeightChange(node.scrollHeight)
    }

    emitHeight()

    const resizeObserver = new ResizeObserver(() => {
      emitHeight()
    })

    resizeObserver.observe(node)

    return () => {
      resizeObserver.disconnect()
    }
  }, [onHeightChange, config.id])

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
    <div className="relative group h-full w-full">
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="drag-handle cursor-move flex items-center gap-1 px-2 py-1 rounded bg-base-100 shadow-md text-xs border border-base-300 pointer-events-auto">
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
        <div className="flex gap-1 pointer-events-auto">
          {onEdit && (
            <button
              type="button"
              className="btn btn-xs btn-circle btn-ghost bg-base-100 shadow-md border border-base-300 hover:bg-base-200"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(config.id)
              }}
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
              type="button"
              className="btn btn-xs btn-circle btn-ghost bg-base-100 shadow-md border border-base-300 hover:bg-error hover:text-error-content"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(config.id)
              }}
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

      {/* Allow overlay to float without reserving layout space */}
      <div className="w-full" ref={contentRef}>
        <WidgetComponent config={config} />
      </div>
    </div>
  )
}

export default memo(WidgetContainer)
