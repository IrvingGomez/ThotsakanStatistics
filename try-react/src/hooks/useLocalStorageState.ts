import { useState, useEffect, useCallback } from 'react'

interface UseLocalStorageStateOptions<T> {
  key: string
  defaultValue: T
  validate?: (parsed: unknown) => parsed is T
}

function readStorage<T>(
  key: string,
  defaultValue: T,
  validate?: (v: unknown) => v is T,
): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return defaultValue
    const parsed: unknown = JSON.parse(raw)
    if (validate && !validate(parsed)) return defaultValue
    return parsed as T
  } catch {
    return defaultValue
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // QuotaExceededError, SecurityError — silently degrade
  }
}

export function useLocalStorageState<T>(
  options: UseLocalStorageStateOptions<T>,
): [T, (value: T | ((prev: T) => T)) => void] {
  const { key, defaultValue, validate } = options

  const [value, setValueRaw] = useState<T>(() =>
    readStorage(key, defaultValue, validate),
  )

  // Write-through on every change
  useEffect(() => {
    writeStorage(key, value)
  }, [key, value])

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => setValueRaw(next),
    [],
  )

  return [value, setValue]
}
