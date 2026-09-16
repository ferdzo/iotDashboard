import { useState, useCallback, useMemo } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import type { Layout, Layouts } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { useDashboardConfig } from '../hooks'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api'
import { WidgetContainer } from '../components/widgets'
import AddWidgetModal from '../components/AddWidgetModal'
import EditWidgetModal from '../components/EditWidgetModal'
import { PageHeader, EmptyState } from '../components/ui'
import Icon from '../components/Icon'
import { GRID_COLS } from '../hooks/dashboardConfigSchema'
import toast from 'react-hot-toast'

const ResponsiveGrid = WidthProvider(Responsive)

/** Breakpoint column counts. lg is canonical: layouts persist from it only. */
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 }
const COLS = { lg: GRID_COLS, md: 8, sm: 4, xs: 2 }
const CANONICAL_BREAKPOINT = 'lg'

const ROW_HEIGHT = 56
const GRID_MARGIN: [number, number] = [12, 12]

const DEFAULT_SPAN = { w: 3, h: 3 }

export default function Dashboard() {
	const { config, addWidget, removeWidget, updateWidget, exportConfig, importConfig, saveConfig } = useDashboardConfig()
	const { data: overview } = useQuery({
		queryKey: ['dashboard', 'overview'],
		queryFn: async () => (await dashboardApi.getOverview()).data,
		staleTime: 15000,
	})
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingWidget, setEditingWidget] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const [breakpoint, setBreakpoint] = useState<string>(CANONICAL_BREAKPOINT)

	/** Canonical (desktop) layout derived from config; smaller breakpoints interpolate from it. */
	const layouts = useMemo<Layouts>(() => {
		const lg: Layout[] = config.widgets.map((widget) => {
			const p = widget.position
			return {
				i: widget.id,
				x: p?.x ?? 0,
				y: p?.y ?? Infinity,
				w: p?.w ?? DEFAULT_SPAN.w,
				h: p?.h ?? DEFAULT_SPAN.h,
				minW: 2,
				minH: 2,
				maxW: COLS.lg,
			}
		})
		return { lg }
	}, [config.widgets])

	/**
	 * Persist only the canonical breakpoint. Dragging on a narrow screen
	 * reflows that breakpoint locally; it must not overwrite the desktop layout.
	 */
	const handleLayoutChange = useCallback(
		(_current: Layout[], all: Layouts) => {
			if (breakpoint !== CANONICAL_BREAKPOINT) return
			const next = all[CANONICAL_BREAKPOINT]
			if (!next) return
			next.forEach((item) => {
				const widget = config.widgets.find((w) => w.id === item.i)
				if (!widget) return
				const p = widget.position
				if (p && p.x === item.x && p.y === item.y && p.w === item.w && p.h === item.h) return
				updateWidget(item.i, {
					position: { x: item.x, y: item.y, w: item.w, h: item.h },
				})
			})
		},
		[breakpoint, config.widgets, updateWidget],
	)

	const handleExport = () => {
		const json = exportConfig()
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `dashboard-config-${new Date().toISOString().split('T')[0]}.json`
		a.click()
		URL.revokeObjectURL(url)
	}

	const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = (event) => {
			try {
				const text = event.target?.result as string
				const parsed = JSON.parse(text)
				importConfig(parsed)
				toast.success('Dashboard configuration imported')
			} catch (error) {
				toast.error('Failed to import configuration')
				console.error(error)
			}
		}
		reader.readAsText(file)
		e.target.value = ''
	}

	const handleSaveDashboard = async () => {
		setIsSaving(true)
		try {
			const success = await saveConfig()
			if (success) toast.success('Dashboard saved')
			else toast.error('Save failed')
		} catch (error) {
			console.error('Failed to save dashboard configuration:', error)
			toast.error('Save failed')
		} finally {
			setIsSaving(false)
		}
	}

	const hasWidgets = config.widgets.length > 0

	return (
		<div className="space-y-5">
			<PageHeader
				title="Dashboard"
				hint={isEditing ? 'Drag headers to move · drag corners to resize' : 'Live telemetry, arranged your way'}
				actions={
					<>
						{hasWidgets && (
							<button
								className={`btn btn-sm gap-1.5 ${isEditing ? 'btn-primary' : 'btn-ghost'}`}
								onClick={() => setIsEditing((v) => !v)}
								aria-pressed={isEditing}
							>
								<Icon name={isEditing ? 'check' : 'edit'} className="size-4" />
								{isEditing ? 'Done' : 'Arrange'}
							</button>
						)}
						<button
							className="btn btn-ghost btn-sm gap-1.5"
							onClick={handleSaveDashboard}
							disabled={isSaving}
						>
							{isSaving ? (
								<span className="loading loading-spinner loading-xs" />
							) : (
								<Icon name="download" className="size-4" />
							)}
							Save
						</button>
						<button
							className="btn btn-ghost btn-sm gap-1.5"
							onClick={handleExport}
						>
							<Icon name="download" className="size-4" />
							Export
						</button>
						<label className="btn btn-ghost btn-sm gap-1.5 cursor-pointer">
							<Icon name="upload" className="size-4" />
							Import
							<input
								type="file"
								accept="application/json"
								className="hidden"
								onChange={handleImport}
							/>
						</label>
						<button
							className="btn btn-primary btn-sm gap-1.5"
							onClick={() => setIsModalOpen(true)}
						>
							<Icon name="plus" className="size-4" />
							Add Widget
						</button>
					</>
				}
			/>

			<section aria-label="Fleet status" className="panel relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/[0.08] via-transparent to-transparent px-4 py-3">
				<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
					<span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
						<span className="relative flex size-1.5">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
							<span className="relative inline-flex size-1.5 rounded-full bg-primary" />
						</span>
						Live
					</span>
					<span className="font-mono text-sm tnum text-base-content/85">
						{overview ? `${overview.active_devices}/${overview.total_devices} devices online` : '— devices online'}
					</span>
					<span className="font-mono text-sm tnum text-base-content/50">
						{config.widgets.length} widget{config.widgets.length === 1 ? '' : 's'}
					</span>
					{overview && overview.certificates_expiring_soon > 0 && (
						<span className="font-mono text-sm tnum text-warning">
							{overview.certificates_expiring_soon} cert{overview.certificates_expiring_soon === 1 ? '' : 's'} expiring
						</span>
					)}
					{isEditing && (
						<span className="ml-auto font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
							Arrange mode
						</span>
					)}
				</div>
			</section>

			{!hasWidgets ? (
				<EmptyState
					icon="chart-bars"
					title="Empty dashboard"
					hint="Add your first widget — charts, gauges, stats, or AI insights."
					action={
						<button
							className="btn btn-primary btn-sm gap-1.5"
							onClick={() => setIsModalOpen(true)}
						>
							<Icon name="plus" className="size-4" />
							Add Widget
						</button>
					}
				/>
			) : (
				<ResponsiveGrid
					className={`layout ${isEditing ? 'layout--editing' : ''}`}
					layouts={layouts}
					breakpoints={BREAKPOINTS}
					cols={COLS}
					rowHeight={ROW_HEIGHT}
					margin={GRID_MARGIN}
					containerPadding={[0, 0]}
					draggableHandle=".widget-drag-handle"
					isDraggable={isEditing}
					isResizable={isEditing}
					compactType="vertical"
					preventCollision={false}
					measureBeforeMount
					onBreakpointChange={(bp: string) => setBreakpoint(bp)}
					onLayoutChange={handleLayoutChange}
				>
					{config.widgets.map((widget) => (
						<div key={widget.id} className="h-full">
							<WidgetContainer
								config={widget}
								editing={isEditing}
								onRemove={() => removeWidget(widget.id)}
								onEdit={() => setEditingWidget(widget.id)}
							/>
						</div>
					))}
				</ResponsiveGrid>
			)}

			<AddWidgetModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onAdd={(widget) => {
					addWidget(widget)
					setIsModalOpen(false)
				}}
			/>

			<EditWidgetModal
				isOpen={editingWidget !== null}
				widget={config.widgets.find((w) => w.id === editingWidget) || null}
				onClose={() => setEditingWidget(null)}
				onSave={(widgetId, updates) => {
					updateWidget(widgetId, updates)
					setEditingWidget(null)
				}}
			/>
		</div>
	)
}
