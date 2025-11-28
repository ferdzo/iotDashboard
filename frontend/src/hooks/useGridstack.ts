import { useEffect, useRef, useCallback } from 'react'
import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'

// Define the widget type based on gridstack.js structure
export type GridStackWidget = {
  id?: string | number
  x?: number
  y?: number
  w?: number
  h?: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  noResize?: boolean
  noMove?: boolean
  locked?: boolean
  [key: string]: any // Allow additional properties
}

interface UseGridstackOptions {
  columns?: number
  cellHeight?: number
  margin?: number
  minRow?: number
  onLayoutChange?: (items: GridStackWidget[]) => void
  disableResize?: boolean
  disableDrag?: boolean
}

export function useGridstack(options: UseGridstackOptions = {}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const gridInstanceRef = useRef<GridStack | null>(null)
  const {
    columns = 4,
    cellHeight = 150,
    margin = 12,
    minRow = 1,
    onLayoutChange,
    disableResize = false,
    disableDrag = false,
  } = options

  // Initialize gridstack
  useEffect(() => {
    if (!gridRef.current) return

    // Clean up existing instance
    if (gridInstanceRef.current) {
      gridInstanceRef.current.destroy(false)
    }

    // Create new gridstack instance
    // Gridstack will automatically detect and manage elements with data-gs-* attributes
    const grid = GridStack.init(
      {
        column: columns,
        cellHeight,
        margin,
        minRow,
        resizable: {
          handles: 'e, se, s, sw, w',
        },
        disableResize,
        disableDrag,
        float: false,
        animate: true,
        acceptWidgets: false,
        // Removed handle option - entire widget is draggable for better UX
      },
      gridRef.current
    )

    // Handle layout change
    if (onLayoutChange) {
      grid.on('change', (event, items) => {
        const serialized = grid.save(false) as GridStackWidget[]
        onLayoutChange(serialized)
      })
    }

    gridInstanceRef.current = grid

    return () => {
      if (gridInstanceRef.current) {
        gridInstanceRef.current.destroy(false)
        gridInstanceRef.current = null
      }
    }
  }, [columns, cellHeight, margin, minRow, disableResize, disableDrag, onLayoutChange])

  // Convert existing elements to gridstack widgets
  const makeWidgets = useCallback(() => {
    if (gridInstanceRef.current && gridRef.current) {
      const items = gridRef.current.querySelectorAll('.grid-stack-item:not(.ui-draggable)')
      items.forEach((item) => {
        gridInstanceRef.current!.makeWidget(item as HTMLElement)
      })
    }
  }, [])

  // Load items into grid
  const loadItems = useCallback((items: GridStackWidget[]) => {
    if (gridInstanceRef.current) {
      gridInstanceRef.current.load(items)
    }
  }, [])

  // Add item to grid
  const addItem = useCallback((item: GridStackWidget) => {
    if (gridInstanceRef.current) {
      gridInstanceRef.current.addWidget(item)
    }
  }, [])

  // Remove item from grid
  const removeItem = useCallback((id: string) => {
    if (gridInstanceRef.current) {
      const el = gridInstanceRef.current.el.querySelector(`[gs-id="${id}"]`)
      if (el) {
        gridInstanceRef.current.removeWidget(el as HTMLElement, false)
      }
    }
  }, [])

  // Update item
  const updateItem = useCallback((id: string, updates: Partial<GridStackWidget>) => {
    if (gridInstanceRef.current) {
      const el = gridInstanceRef.current.el.querySelector(`[gs-id="${id}"]`)
      if (el) {
        gridInstanceRef.current.update(el as HTMLElement, updates)
      }
    }
  }, [])

  // Get current layout
  const getLayout = useCallback((): GridStackWidget[] => {
    if (gridInstanceRef.current) {
      return gridInstanceRef.current.save(false) as GridStackWidget[]
    }
    return []
  }, [])

  return {
    gridRef,
    makeWidgets,
    loadItems,
    addItem,
    removeItem,
    updateItem,
    getLayout,
  }
}

