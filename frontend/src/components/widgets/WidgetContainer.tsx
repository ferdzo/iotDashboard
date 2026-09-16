import { memo, useEffect, useRef } from 'react'
import type { WidgetConfig } from '../../hooks'
import { widgetRegistry } from './registry'
import WidgetCard from '../ui/WidgetCard'
import Icon from '../Icon'
import { WidgetError } from '../ui'

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
      <WidgetCard title={config.title || config.type}>
        <WidgetError message={`Unknown widget type: ${config.type}`} />
      </WidgetCard>
    )
  }

  return (
    <div className="relative group h-full w-full">
      <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="drag-handle cursor-move flex items-center gap-1 px-2 py-1 rounded-lg bg-base-100/90 backdrop-blur shadow-md text-[11px] font-medium border border-base-300 pointer-events-auto">
          <Icon name="drag" className="size-3.5" />
          Drag
        </div>
      </div>

      {/* Allow overlay to float without reserving layout space */}
      <div className="w-full h-full" ref={contentRef}>
        <WidgetCard
          title={config.title || config.type}
          onEdit={onEdit ? () => onEdit(config.id) : undefined}
          onRemove={onRemove ? () => onRemove(config.id) : undefined}
        >
          <WidgetComponent config={config} />
        </WidgetCard>
      </div>
    </div>
  )
}

export default memo(WidgetContainer)
