import { useState, useRef, useEffect } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { useDashboardConfig } from '../hooks'
import { WidgetContainer } from '../components/widgets'
import AddWidgetModal from '../components/AddWidgetModal'
import EditWidgetModal from '../components/EditWidgetModal'

export default function Dashboard() {
	const { config, addWidget, removeWidget, updateWidget, exportConfig, importConfig } = useDashboardConfig()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingWidget, setEditingWidget] = useState<string | null>(null)
	const [gridWidth, setGridWidth] = useState(1200)
	const gridContainerRef = useRef<HTMLDivElement>(null)

	// Update grid width on resize
	useEffect(() => {
		const updateWidth = () => {
			if (gridContainerRef.current) {
				setGridWidth(gridContainerRef.current.offsetWidth)
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

	const layout = config.widgets.map((widget) => ({
		i: widget.id,
		x: widget.position?.x || 0,
		y: widget.position?.y || 0,
		w: widget.position?.w || 1,
		h: widget.position?.h || 2,
		minW: 1,
		minH: 1,
		maxW: 4,
	}))

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

	return (
		<div className="p-6 space-y-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<p className="text-base-content/70">
						Customize your view with modular widgets
					</p>
				</div>
				<div className="flex gap-2">
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
						cols={4}
						rowHeight={150}
						width={gridWidth}
						onLayoutChange={handleLayoutChange}
						draggableHandle=".drag-handle"
						compactType="vertical"
						preventCollision={false}
						isResizable={true}
						isDraggable={true}
						margin={[12, 12]}
					>
						{config.widgets.map((widget) => (
							<div key={widget.id} className="h-full">
								<WidgetContainer
									config={widget}
									onRemove={() => removeWidget(widget.id)}
									onEdit={() => setEditingWidget(widget.id)}
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
