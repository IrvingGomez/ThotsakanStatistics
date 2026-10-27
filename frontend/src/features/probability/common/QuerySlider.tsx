// One track with one handle (P(X ≤ x)) or two (P(x₁ < X < x₂)); the filled part is the region the
// probability is about. Two range inputs are stacked on the same track; only their handles take the pointer.

const THUMB = `pointer-events-none absolute inset-0 h-4 w-full appearance-none bg-transparent
  [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
  [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
  [&::-webkit-slider-thumb]:bg-[var(--color-accent)] [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(99,102,241,0.25)]
  [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
  [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none
  [&::-moz-range-thumb]:bg-[var(--color-accent)] [&::-moz-range-track]:bg-transparent`

export default function QuerySlider({ min, max, step, handles, fill, onChange }: {
  min: number
  max: number
  step: number
  handles: readonly { label: string; value: number }[]
  /** The filled part of the track, in data units; null for none. */
  fill: [number, number] | null
  onChange: (index: number, value: number) => void
}) {
  const percent = (value: number) => (Math.min(max, Math.max(min, value)) - min) / (max - min || 1) * 100
  // Two handles at the right end would leave the lower one unreachable under the upper one: raise it.
  const lowerOnTop = handles.length === 2 && percent(handles[0].value) > 50
  return (
    <div className="relative mt-1 h-4">
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[var(--color-border-md)]" />
      {fill && (
        <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[var(--color-accent)]"
          style={{ left: `${percent(fill[0])}%`, width: `${Math.max(0, percent(fill[1]) - percent(fill[0]))}%` }} />
      )}
      {handles.map((handle, index) => (
        <input key={handle.label} type="range" aria-label={handle.label} min={min} max={max} step={step}
          value={Math.min(max, Math.max(min, handle.value))} onChange={(event) => onChange(index, Number(event.target.value))}
          className={THUMB} style={{ zIndex: index === 0 && lowerOnTop ? 2 : 1 }} />
      ))}
    </div>
  )
}
