import { useId, useState, useCallback, useEffect, useRef } from 'react'

interface DualInputProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  decimals?: number
  hint?: string
  error?: string
  disabled?: boolean
  resetSignal?: unknown
  textValue?: string
  onTextChange?: (value: string) => void
  onChange: (value: number) => void
}

export default function DualInput({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  decimals = 2,
  hint,
  error,
  disabled = false,
  resetSignal,
  textValue,
  onTextChange,
  onChange,
}: DualInputProps) {
  const id = useId()
  const labelId = `${id}-label`

  // ── Internal text state for the number input ──────────────────────────────
  // This decouples the display from the controlled value so the user can
  // freely type (including clearing the field, typing a minus sign, etc.)
  // without the value snapping on every keystroke.
  const [text, setText] = useState(textValue ?? value.toFixed(decimals))
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCommitted = useRef(value)

  const cancelCommit = useCallback(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current)
    commitTimer.current = null
  }, [])

  useEffect(() => cancelCommit, [cancelCommit])

  useEffect(() => {
    cancelCommit()
    setText(textValue ?? value.toFixed(decimals))
    lastCommitted.current = value
  // A reset signal deliberately resynchronizes even when the numeric value is unchanged.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal])

  // Sync external value → internal text (when value changes from slider or parent)
  useEffect(() => {
    cancelCommit()
    if (Math.abs(value - lastCommitted.current) > 1e-9) {
      setText(value.toFixed(decimals))
      lastCommitted.current = value
    }
  }, [value, decimals, min, max, step, disabled, cancelCommit])

  useEffect(() => {
    if (textValue !== undefined) setText(textValue)
  }, [textValue])

  const clamp = useCallback(
    (v: number) => Math.min(max, Math.max(min, v)),
    [min, max]
  )

  // Round to step precision to avoid floating-point display artifacts
  const roundToStep = useCallback(
    (v: number) => min + Math.round((v - min) / step) * step,
    [min, step]
  )

  const parseText = useCallback((raw: string) => {
    const trimmed = raw.trim()
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }, [])

  const commitValue = useCallback(
    (v: number) => {
      const clamped = clamp(roundToStep(v))
      lastCommitted.current = clamped
      onChange(clamped)
    },
    [clamp, roundToStep, onChange]
  )

  // Slider → commit immediately
  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value)
    const clamped = clamp(roundToStep(v))
    setText(clamped.toFixed(decimals))
    onTextChange?.(clamped.toFixed(decimals))
    commitValue(clamped)
  }

  // Number input → debounced commit
  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setText(raw)
    onTextChange?.(raw)
    cancelCommit()
    commitTimer.current = setTimeout(() => {
      const parsed = parseText(raw)
      if (parsed !== null && parsed >= min && parsed <= max) commitValue(parsed)
    }, 400)
  }

  // Commit on blur (user clicks away) or Enter
  function handleTextCommit() {
    cancelCommit()
    const parsed = parseText(text)
    if (parsed === null || parsed < min || parsed > max) {
      const restored = lastCommitted.current.toFixed(decimals)
      setText(restored)
      onTextChange?.(restored)
    } else {
      const clamped = clamp(roundToStep(parsed))
      setText(clamped.toFixed(decimals))
      onTextChange?.(clamped.toFixed(decimals))
      commitValue(clamped)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleTextCommit()
      ;(e.target as HTMLInputElement).blur()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const v = clamp(roundToStep(value + step))
      setText(v.toFixed(decimals))
      onTextChange?.(v.toFixed(decimals))
      commitValue(v)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const v = clamp(roundToStep(value - step))
      setText(v.toFixed(decimals))
      onTextChange?.(v.toFixed(decimals))
      commitValue(v)
    }
  }

  // Filled-track percentage for visual feedback
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label id={labelId} htmlFor={id} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
        <span className="text-xs font-mono tabular-nums text-[var(--color-accent)]">
          {value.toFixed(decimals)}{unit}
        </span>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={[hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
        onChange={handleSlider}
        style={{
          background: `linear-gradient(to right, var(--color-accent) ${pct}%, var(--color-border-md) ${pct}%)`,
        }}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-[var(--color-accent)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(99,102,241,0.25)]
          [&::-webkit-slider-thumb]:transition-shadow
          [&::-webkit-slider-thumb]:hover:shadow-[0_0_0_5px_rgba(99,102,241,0.35)]
          [&::-moz-range-thumb]:border-none
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[var(--color-accent)]
          [&::-moz-range-thumb]:cursor-pointer
          [&::-moz-range-track]:bg-transparent
          [&::-moz-range-progress]:bg-[var(--color-accent)]
          [&::-moz-range-progress]:rounded-full"
      />

      <input
        id={`${id}-value`}
        type="text"
        aria-labelledby={labelId}
        inputMode="decimal"
        value={text}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={[hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
        onChange={handleTextChange}
        onBlur={handleTextCommit}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm rounded font-mono tabular-nums
          bg-[var(--color-bg-input)]
          border border-[var(--color-border-md)]
          text-[var(--color-text)]
          focus:outline-none focus:border-[var(--color-accent)]"
      />
      {hint && <p id={`${id}-hint`} className="text-xs text-[var(--color-text-muted)]">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
