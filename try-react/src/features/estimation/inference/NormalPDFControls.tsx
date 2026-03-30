import DualInput from '../../../components/DualInput'
import type { NormalPDFParams } from '../../../hooks/useNormalPDF'

type Mode = 'pdf' | 'cdf'

interface NormalPDFControlsProps {
  params: NormalPDFParams
  mode: Mode
  onParamsChange: (p: Partial<NormalPDFParams>) => void
  onModeChange: (m: Mode) => void
  onReset: () => void
}

export const DEFAULT_PARAMS: NormalPDFParams = {
  mean: 0,
  std: 1,
  n: 30,
  alpha: 0.05,
}

export default function NormalPDFControls({
  params,
  mode,
  onParamsChange,
  onModeChange,
  onReset,
}: NormalPDFControlsProps) {
  return (
    <div className="flex flex-col gap-5">

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest
          text-[var(--color-text-muted)] mb-3">
          Distribution Parameters
        </h3>
        <div className="flex flex-col gap-4">
          <DualInput
            label="Mean (μ)"
            value={params.mean}
            min={-10} max={10} step={0.1}
            decimals={2}
            onChange={(v) => onParamsChange({ mean: v })}
          />
          <DualInput
            label="Std Dev (σ)"
            value={params.std}
            min={0.1} max={5} step={0.1}
            decimals={2}
            onChange={(v) => onParamsChange({ std: v })}
          />
        </div>
      </div>

      <div className="h-px bg-[var(--color-border)]" />

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest
          text-[var(--color-text-muted)] mb-3">
          Inference Parameters
        </h3>
        <div className="flex flex-col gap-4">
          <DualInput
            label="Sample Size (n)"
            value={params.n}
            min={2} max={200} step={1}
            decimals={0}
            onChange={(v) => onParamsChange({ n: Math.round(v) })}
          />
          <DualInput
            label="Significance (α)"
            value={params.alpha}
            min={0.01} max={0.20} step={0.01}
            decimals={2}
            onChange={(v) => onParamsChange({ alpha: v })}
          />
        </div>
      </div>

      <div className="h-px bg-[var(--color-border)]" />

      {/* Mode toggle */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest
          text-[var(--color-text-muted)] mb-3">
          Display Mode
        </h3>
        <div className="flex rounded-md overflow-hidden border border-[var(--color-border-md)]">
          {(['pdf', 'cdf'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`flex-1 py-1.5 text-sm transition-colors cursor-pointer
                ${mode === m
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-input)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      <button
        type="button"
        onClick={onReset}
        className="mt-auto w-full py-2 text-sm rounded-md border border-[var(--color-border-md)]
          text-[var(--color-text-muted)] hover:text-[var(--color-text)]
          hover:border-[var(--color-accent)] transition-colors cursor-pointer"
      >
        ⟲ Reset Defaults
      </button>

    </div>
  )
}
