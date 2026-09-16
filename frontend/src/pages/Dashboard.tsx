import { useState, useRef, useLayoutEffect, useCallback } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { useDashboardConfig } from '../hooks'
import { WidgetContainer } from '../components/widgets'
import AddWidgetModal from '../components/AddWidgetModal'
import EditWidgetModal from '../components/EditWidgetModal'
import { PageHeader, EmptyState } from '../components/ui'
import Icon from '../components/Icon'
import toast from 'react-hot-toast'

const GRID_COLUMNS = 5
const GRID_MARGIN: [number, number] = [8, 6]
const ROW_HEIGHT = 90
const HEIGHT_PADDING = 0
const ROW_UNIT = ROW_HEIGHT + GRID_MARGIN[1]
const MAX_AUTO_ROWS = 6

export default function Dashboard() {
	const { config, addWidget, removeWidget, updateWidget, exportConfig, importConfig, saveConfig } = useDashboardConfig()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingWidget, setEditingWidget] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)
	const gridContainerRef = useRef<HTMLDivElement>(null)
	const [gridWidth, setGridWidth] = useState(0)

	// Measure the grid's own container, not the window:
	// - window.innerWidth is the wrong number, and it is only replaced after the
	//   first effect runs, which snapped the grid on every load;
	// - collapsing the sidebar resizes this element without a window resize,
	//   which a window listener never saw.
	// useLayoutEffect + ResizeObserver keeps it correct from first paint.
	// Re-runs when the grid appears, since the container is unmounted while empty.
	useLayoutEffect(() => {
		const element = gridContainerRef.current
		if (!element) return

		const measure = (): void => {
			const next = element.getBoundingClientRect().width
			setGridWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next))
		}

		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(element)
		return () => observer.disconnect()
	}, [config.widgets.length])

	const handleLayoutChange = (newLayout: GridLayout.Layout[]) => {
		// Update widget positions when layout changes
		newLayout.forEach((item) => {
			const widget = config.widgets.find((w) => w.id === item.i)
			if (widget) {
				updateWidget(item.i, {
					position: {
						x: item.x,
						y: item.y,
						w: item.w,
						h: item.h,
					},
				})
			}
		})
	}

	const layout = config.widgets.map((widget) => {
		const position = widget.position ?? { x: 0, y: Infinity, w: 1, h: 1 }
		return {
			i: widget.id,
			x: position.x ?? 0,
			y: position.y ?? Infinity,
			w: Math.max(position.w ?? 1, 1),
			h: Math.max(position.h ?? 1, 1),
			minW: 1,
			minH: 1,
			maxW: GRID_COLUMNS,
		}
	})

	const handleWidgetHeightChange = useCallback(
		(widgetId: string, contentHeight: number) => {
			const widget = config.widgets.find((w) => w.id === widgetId)
			if (!widget) return

			const position = widget.position ?? { x: 0, y: Infinity, w: 1, h: 1 }
			const currentRows = Math.max(position.h ?? 1, 1)
			const desiredPixelHeight = contentHeight + HEIGHT_PADDING
			const targetRows = Math.min(
				MAX_AUTO_ROWS,
				Math.max(1, Math.ceil(desiredPixelHeight / ROW_UNIT))
			)

			if (Math.abs(targetRows - currentRows) >= 1) {
				updateWidget(widgetId, {
					position: {
						...position,
						h: targetRows,
					},
				})
			}
		},
		[config.widgets, updateWidget]
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

	return (
		<div className="space-y-5">
			<PageHeader
				title="Dashboard"
				hint="Live telemetry, arranged your way — changes auto-save"
				actions={
					<>
						<button
							className="btn btn-ghost btn-sm gap-1.5"
							onClick={handleSaveDashboard}
							disabled={isSaving}
						>
							{isSaving ? (
								<span className="loading loading-spinner loading-xs" />
							) : (
								<Icon name="check" className="size-4" />
							)}
							Save Now
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

			{config.widgets.length === 0 ? (
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
			<div className="w-full" ref={gridContainerRef}>
				{gridWidth > 0 && (
				<GridLayout
					className="layout"
					layout={layout}
					cols={GRID_COLUMNS}
					rowHeight={ROW_HEIGHT}
					width={gridWidth}
					onLayoutChange={handleLayoutChange}
					draggableHandle=".drag-handle"
					compactType="vertical"
					preventCollision={false}
					isResizable={true}
					isDraggable={true}
					margin={GRID_MARGIN}
					containerPadding={[0, 0]}
				>
					{config.widgets.map((widget) => (
						<div key={widget.id} className="h-full">
							<WidgetContainer
								config={widget}
								onRemove={() => removeWidget(widget.id)}
								onEdit={() => setEditingWidget(widget.id)}
								onHeightChange={(height: number) => handleWidgetHeightChange(widget.id, height)}
							/>
						</div>
					))}
				</GridLayout>
				)}
			</div>
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
