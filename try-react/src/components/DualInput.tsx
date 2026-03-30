import { useId, useState, useCallback, useEffect, useRef } from 'react'

interface DualInputProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  decimals?: number
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
  onChange,
}: DualInputProps) {
  const id = useId()

  // ── Internal text state for the number input ──────────────────────────────
  // This decouples the display from the controlled value so the user can
  // freely type (including clearing the field, typing a minus sign, etc.)
  // without the value snapping on every keystroke.
  const [text, setText] = useState(value.toFixed(decimals))
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external value → internal text (when value changes from slider or parent)
  const lastCommitted = useRef(value)
  useEffect(() => {
    // Only sync if the external value actually changed (not from our own commit)
    if (Math.abs(value - lastCommitted.current) > 1e-9) {
      setText(value.toFixed(decimals))
      lastCommitted.current = value
    }
  }, [value, decimals])

  const clamp = useCallback(
    (v: number) => Math.min(max, Math.max(min, v)),
    [min, max]
  )

  // Round to step precision to avoid floating-point display artifacts
  const roundToStep = useCallback(
    (v: number) => {
      const inv = 1 / step
      return Math.round(v * inv) / inv
    },
    [step]
  )

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
    commitValue(clamped)
  }

  // Number input → debounced commit
  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setText(raw)
    if (commitTimer.current) clearTimeout(commitTimer.current)
    commitTimer.current = setTimeout(() => {
      const v = parseFloat(raw)
      if (!isNaN(v)) commitValue(v)
    }, 400)
  }

  // Commit on blur (user clicks away) or Enter
  function handleTextCommit() {
    if (commitTimer.current) clearTimeout(commitTimer.current)
    const v = parseFloat(text)
    if (isNaN(v)) {
      // Revert to current value
      setText(value.toFixed(decimals))
    } else {
      const clamped = clamp(roundToStep(v))
      setText(clamped.toFixed(decimals))
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
      commitValue(v)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const v = clamp(roundToStep(value - step))
      setText(v.toFixed(decimals))
      commitValue(v)
    }
  }

  // Filled-track percentage for visual feedback
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-[var(--color-text)]">
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
        type="text"
        inputMode="decimal"
        value={text}
        onChange={handleTextChange}
        onBlur={handleTextCommit}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm rounded font-mono tabular-nums
          bg-[var(--color-bg-input)]
          border border-[var(--color-border-md)]
          text-[var(--color-text)]
          focus:outline-none focus:border-[var(--color-accent)]"
      />
    </div>
  )
}
