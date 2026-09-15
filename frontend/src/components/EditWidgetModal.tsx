import type { WidgetConfig } from '../hooks'
import WidgetConfigForm from './WidgetConfigForm'

interface EditWidgetModalProps {
  isOpen: boolean
  widget: WidgetConfig | null
  onClose: () => void
  onSave: (widgetId: string, updates: Partial<WidgetConfig>) => void
}

/**
 * Thin wrapper around the generic WidgetConfigForm (phase-2 todo 14).
 * Props and emitted Partial<WidgetConfig> updates are unchanged; all
 * type-specific fields now come from widgets/<name>/schema.ts.
 */
export default function EditWidgetModal({ isOpen, widget, onClose, onSave }: EditWidgetModalProps) {
  if (!isOpen || !widget) return null
  return <WidgetConfigForm mode="edit" widget={widget} onClose={onClose} onSave={onSave} />
}
