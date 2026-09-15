import { useTheme, type ThemeName } from '../hooks/useTheme'

/**
 * Floating theme picker (task 15 design-system wiring).
 *
 * Fixed-position on purpose: it mounts in main.tsx next to <App/> so the
 * toggle works without touching the AppLayout shell owned by sibling todo 11.
 * The shell owner can relocate `<ThemeToggle />` into the navbar/sidebar with
 * a one-line move; behavior (data-theme + persistence) is unchanged.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, themes } = useTheme()

  return (
    <label
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-base-300 bg-base-100/90 px-3 py-2 shadow-lg backdrop-blur ${className}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
        Theme
      </span>
      <select
        aria-label="Color theme"
        className="select select-bordered select-xs"
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeName)}
      >
        {themes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  )
}
