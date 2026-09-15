import type { WidgetConfig } from '../hooks'
import WidgetConfigForm from './WidgetConfigForm'

interface AddWidgetModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (widget: WidgetConfig) => void
}

/**
 * Thin wrapper around the generic WidgetConfigForm (phase-2 todo 14).
 * Props and emitted WidgetConfig JSON are unchanged; all type-specific
 * fields now come from widgets/<name>/schema.ts.
 */
export default function AddWidgetModal({ isOpen, onClose, onAdd }: AddWidgetModalProps) {
  if (!isOpen) return null
  return <WidgetConfigForm mode="add" onClose={onClose} onAdd={onAdd} />
}
