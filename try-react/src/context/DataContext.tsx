// context/DataContext.tsx
// Global data store using React Context + useReducer

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react'
import { parseFile, extractNumeric, uniqueValues, type ParsedDataset } from '../utils/parseFile'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataState {
  // Raw parsed dataset
  dataset: ParsedDataset | null
  filename: string

  // Active filters: { colName: selectedValues[] }
  filters: Record<string, string[]>

  // Manually overridden column types
  numericCols: string[]
  categoricalCols: string[]

  // Display settings
  displayPrecision: number

  // Status
  status: 'idle' | 'loading' | 'ready' | 'error'
  errorMsg: string
}

const initialState: DataState = {
  dataset: null,
  filename: '',
  filters: {},
  numericCols: [],
  categoricalCols: [],
  displayPrecision: 4,
  status: 'idle',
  errorMsg: '',
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOADING' }
  | { type: 'LOADED'; payload: { dataset: ParsedDataset; filename: string } }
  | { type: 'ERROR'; payload: string }
  | { type: 'CLEAR' }
  | { type: 'SET_FILTER'; payload: { col: string; values: string[] } }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'RECLASSIFY'; payload: { col: string; to: 'numeric' | 'categorical' } }
  | { type: 'SET_PRECISION'; payload: number }

function reducer(state: DataState, action: Action): DataState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: 'loading', errorMsg: '' }

    case 'LOADED': {
      const { dataset, filename } = action.payload
      return {
        ...state,
        dataset,
        filename,
        numericCols: dataset.numericCols,
        categoricalCols: dataset.categoricalCols,
        filters: {},
        status: 'ready',
        errorMsg: '',
      }
    }

    case 'ERROR':
      return { ...state, status: 'error', errorMsg: action.payload }

    case 'CLEAR':
      return { ...initialState }

    case 'SET_FILTER': {
      const { col, values } = action.payload
      const newFilters = { ...state.filters }
      if (values.length === 0) delete newFilters[col]
      else newFilters[col] = values
      return { ...state, filters: newFilters }
    }

    case 'CLEAR_FILTERS':
      return { ...state, filters: {} }

    case 'RECLASSIFY': {
      const { col, to } = action.payload
      if (to === 'numeric') {
        return {
          ...state,
          numericCols: [...state.numericCols.filter((c) => c !== col), col],
          categoricalCols: state.categoricalCols.filter((c) => c !== col),
        }
      } else {
        return {
          ...state,
          categoricalCols: [...state.categoricalCols.filter((c) => c !== col), col],
          numericCols: state.numericCols.filter((c) => c !== col),
        }
      }
    }

    case 'SET_PRECISION':
      return { ...state, displayPrecision: action.payload }

    default:
      return state
  }
}

// ─── Computed helpers ─────────────────────────────────────────────────────────

/** Apply active filters to the dataset rows */
function applyFilters(
  rows: Record<string, string>[],
  filters: Record<string, string[]>
): Record<string, string>[] {
  const entries = Object.entries(filters).filter(([, vals]) => vals.length > 0)
  if (entries.length === 0) return rows
  return rows.filter((row) =>
    entries.every(([col, vals]) => vals.includes(row[col] ?? ''))
  )
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DataContextValue {
  state: DataState

  // Derived
  filteredRows: Record<string, string>[]
  getNumericData: (col: string) => number[]
  getUniqueValues: (col: string) => string[]

  // Actions
  loadFile: (file: File) => Promise<void>
  clearData: () => void
  setFilter: (col: string, values: string[]) => void
  clearFilters: () => void
  reclassify: (col: string, to: 'numeric' | 'categorical') => void
  setPrecision: (p: number) => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const filteredRows = state.dataset
    ? applyFilters(state.dataset.rows, state.filters)
    : []

  const loadFile = useCallback(async (file: File) => {
    dispatch({ type: 'LOADING' })
    try {
      const dataset = await parseFile(file)
      dispatch({ type: 'LOADED', payload: { dataset, filename: file.name } })
    } catch (e) {
      dispatch({ type: 'ERROR', payload: String(e) })
    }
  }, [])

  const clearData = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  const setFilter = useCallback((col: string, values: string[]) =>
    dispatch({ type: 'SET_FILTER', payload: { col, values } }), [])

  const clearFilters = useCallback(() => dispatch({ type: 'CLEAR_FILTERS' }), [])

  const reclassify = useCallback((col: string, to: 'numeric' | 'categorical') =>
    dispatch({ type: 'RECLASSIFY', payload: { col, to } }), [])

  const setPrecision = useCallback((p: number) =>
    dispatch({ type: 'SET_PRECISION', payload: p }), [])

  const getNumericData = useCallback((col: string) =>
    state.dataset ? extractNumeric(filteredRows, col) : [], [state.dataset, filteredRows])

  const getUniqueValues = useCallback((col: string) =>
    state.dataset ? uniqueValues(state.dataset.rows, col) : [], [state.dataset])

  return (
    <DataContext.Provider value={{
      state,
      filteredRows,
      getNumericData,
      getUniqueValues,
      loadFile,
      clearData,
      setFilter,
      clearFilters,
      reclassify,
      setPrecision,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
