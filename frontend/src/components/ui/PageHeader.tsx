interface PageHeaderProps {
  title: string
  hint?: string
  actions?: React.ReactNode
}

export default function PageHeader({ title, hint, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {hint && <p className="text-sm text-base-content/60 mt-1">{hint}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
