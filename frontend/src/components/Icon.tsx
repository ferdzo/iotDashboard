import { ICON_PATHS, isIconName, type IconName } from './icon-paths'

/**
 * Single shared icon component for the dashboard (task 15).
 *
 * Path data lives in ./icon-paths (seeded verbatim from WeatherWidget.tsx,
 * the AppLayout shell, and WidgetContainer.tsx). No new icon library
 * dependency (inline paths only).
 *
 * Unknown names render a visible "?" fallback and never throw, so a missing
 * icon name can never blank-crash a widget (task-15 failure-path requirement).
 */

export type { IconName }

export interface IconProps {
  name: string
  className?: string
  strokeWidth?: number
  title?: string
}

export default function Icon({
  name,
  className,
  strokeWidth = 2,
  title,
}: IconProps) {
  if (!isIconName(name)) {
    return (
      <span
        role="img"
        aria-label={title ?? `unknown icon: ${name}`}
        title={title ?? name}
        data-icon-fallback={name}
        className={className}
      >
        ?
      </span>
    )
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-icon={name}
      role={title ? 'img' : undefined}
      aria-label={title}
      className={className}
    >
      {ICON_PATHS[name]}
    </svg>
  )
}
