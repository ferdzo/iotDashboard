import { useState, useRef, useEffect, useCallback } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { useDashboardConfig } from '../hooks'
import { WidgetContainer } from '../components/widgets'
import AddWidgetModal from '../components/AddWidgetModal'
import EditWidgetModal from '../components/EditWidgetModal'

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
	const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
	const [gridWidth, setGridWidth] = useState(() => {
		if (typeof window !== 'undefined') {
			return window.innerWidth
		}
		return GRID_COLUMNS * (ROW_HEIGHT + GRID_MARGIN[0])
	})
	const gridContainerRef = useRef<HTMLDivElement>(null)

	// Update grid width on resize
	useEffect(() => {
		const updateWidth = () => {
			if (gridContainerRef.current) {
				const rect = gridContainerRef.current.getBoundingClientRect()
				setGridWidth(rect.width)
			} else if (typeof window !== 'undefined') {
				setGridWidth(window.innerWidth)
			}
		}

		updateWidth()
		window.addEventListener('resize', updateWidth)
		return () => window.removeEventListener('resize', updateWidth)
	}, [])

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
				alert('Dashboard configuration imported successfully!')
			} catch (error) {
				alert('Failed to import configuration')
				console.error(error)
			}
		}
		reader.readAsText(file)
	}

	const handleSaveDashboard = async () => {
		setIsSaving(true)
		setSaveStatus('idle')
		try {
			const success = await saveConfig()
			setSaveStatus(success ? 'success' : 'error')
		} catch (error) {
			console.error('Failed to save dashboard configuration:', error)
			setSaveStatus('error')
		} finally {
			setIsSaving(false)
			setTimeout(() => setSaveStatus('idle'), 3000)
		}
	}

	return (
		<div className="p-6 space-y-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<p className="text-base-content/70">
						Customize your view with modular widgets
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<button
						className="btn btn-success btn-sm"
						onClick={handleSaveDashboard}
						disabled={isSaving}
					>
						{isSaving ? (
							<svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
							</svg>
						) : (
							<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						)}
						Save Dashboard
					</button>
					{saveStatus === 'success' && (
						<span className="text-success text-sm">Saved!</span>
					)}
					{saveStatus === 'error' && (
						<span className="text-error text-sm">Save failed</span>
					)}
					<button
						className="btn btn-outline btn-sm"
						onClick={handleExport}
					>
						<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
						</svg>
						Export
					</button>
					<label className="btn btn-outline btn-sm">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
						</svg>
						Import
						<input
							type="file"
							accept="application/json"
							className="hidden"
							onChange={handleImport}
						/>
					</label>
					<button
						className="btn btn-primary btn-sm"
						onClick={() => setIsModalOpen(true)}
					>
						<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Add Widget
					</button>
				</div>
			</div>

			{config.widgets.length === 0 ? (
				<div className="card bg-base-200 shadow-lg">
					<div className="card-body items-center text-center py-16">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-base-content/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						<h2 className="text-2xl font-bold mt-4">No Widgets Yet</h2>
						<p className="text-base-content/60 max-w-md">
							Get started by adding your first widget. Choose from line charts, stat cards, gauges, or AI insights.
						</p>
						<button
							className="btn btn-primary mt-6"
							onClick={() => setIsModalOpen(true)}
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							Add Your First Widget
						</button>
					</div>
				</div>
			) : (
			<div className="w-full" ref={gridContainerRef}>
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
