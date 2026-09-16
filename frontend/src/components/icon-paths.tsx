import type { ReactNode } from 'react'

/**
 * Shared icon path data (no components in this file, per react-refresh rule).
 *
 * Consolidated from previously inline SVGs:
 * - weather set seeded verbatim from WeatherWidget.tsx (IconBase, stroke 1.7 round)
 * - shell set seeded verbatim from the AppLayout shell (menu, chevrons, chip, home, logout)
 * - widget-chrome set seeded verbatim from WidgetContainer.tsx (drag, edit, close)
 */

export const ICON_NAMES = [
  // app shell
  'menu',
  'chevrons-expand',
  'chevrons-collapse',
  'chip',
  'home',
  'logout',
  // widget chrome
  'drag',
  'edit',
  'close',
  'alert',
  'check',
  'heart',
  'flame',
  'chart-bars',
  'bulb',
  'shield-check',
  'check-circle',
  'signal',
  'arrow-left',
  'plus',
  // weather (WeatherWidget seed)
  'sun',
  'cloud',
  'partly-cloudy',
  'fog',
  'rain',
  'snow',
  'thunder',
  'thermometer',
  'droplet',
  'wind',
  'cloud-cover',
  'rain-drop',
] as const

export type IconName = (typeof ICON_NAMES)[number]

export function isIconName(value: unknown): value is IconName {
  return (
    typeof value === 'string' &&
    (ICON_NAMES as readonly string[]).includes(value)
  )
}

export const ICON_PATHS: Record<IconName, ReactNode> = {
  // --- app shell (from AppLayout shell, strokeWidth 2) ---
  menu: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />,
  'chevrons-expand': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />,
  'chevrons-collapse': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />,
  chip: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  ),
  home: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  ),
  logout: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  ),

  // --- widget chrome (from WidgetContainer.tsx, strokeWidth 2) ---
  drag: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />,
  edit: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  ),
  close: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
  alert: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />,
  check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
  heart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />,
  flame: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />,
  'chart-bars': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  bulb: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />,
  'shield-check': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  'check-circle': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  signal: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />,
  'arrow-left': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
  plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,

  // --- weather (from WeatherWidget.tsx seed; pass strokeWidth={1.7} to match) ---
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </>
  ),
  cloud: <path d="M5 15a4 4 0 010-8 5 5 0 019.7-.7A4 4 0 0118 15H5z" />,
  'partly-cloudy': (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M5 17a4 4 0 010-8 5 5 0 019.7-.7A4 4 0 0118 17H5z" />
    </>
  ),
  fog: (
    <>
      <path d="M4 10h11a3 3 0 000-6 4.5 4.5 0 00-8.91 1" />
      <line x1="3" y1="15" x2="17" y2="15" />
      <line x1="5" y1="19" x2="19" y2="19" />
    </>
  ),
  rain: (
    <>
      <path d="M5 15a4 4 0 010-8 5 5 0 019.7-.7A4 4 0 0118 15H5z" />
      <line x1="8" y1="17" x2="8" y2="21" />
      <line x1="12" y1="17" x2="12" y2="22" />
      <line x1="16" y1="17" x2="16" y2="21" />
    </>
  ),
  snow: (
    <>
      <path d="M5 14a4 4 0 010-8 5 5 0 019.7-.7A4 4 0 0118 14H5z" />
      <line x1="11" y1="16" x2="11" y2="22" />
      <line x1="8.5" y1="18" x2="13.5" y2="20" />
      <line x1="8.5" y1="20" x2="13.5" y2="18" />
    </>
  ),
  thunder: (
    <>
      <path d="M5 15a4 4 0 010-8 5 5 0 019.7-.7A4 4 0 0118 15H5z" />
      <polyline points="12 16 10 20 14 20 12 24" />
    </>
  ),
  thermometer: (
    <>
      <path d="M14 14.5V5a2 2 0 00-4 0v9.5a3.5 3.5 0 104 0z" />
      <line x1="12" y1="8" x2="12" y2="11" />
    </>
  ),
  droplet: <path d="M12 3.5s-4 5-4 8.5a4 4 0 108 0c0-3.5-4-8.5-4-8.5z" />,
  wind: (
    <>
      <path d="M3 12h9a3 3 0 10-3-3" />
      <path d="M5 18h11a3 3 0 11-3 3" />
    </>
  ),
  'cloud-cover': <path d="M6 17a4 4 0 010-8 5 5 0 019.7-.7A4 4 0 0119 17H6z" />,
  'rain-drop': <path d="M7 14a5 5 0 0010 0c0-4-5-9-5-9s-5 5-5 9z" />,
}
