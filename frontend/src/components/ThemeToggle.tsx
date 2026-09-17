import { useTheme } from '../hooks/useTheme'
import Icon from './Icon'

/** Compact theme toggle: sun/moon swap between the light and dark themes. */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={`btn btn-ghost btn-sm btn-square ${className}`}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Icon name={dark ? 'sun' : 'moon'} className="size-[18px]" />
    </button>
  )
}
