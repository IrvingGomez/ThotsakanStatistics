// features/estimation/graphical/GraphicalControls.tsx
// Left panel: variable, graph type and overlays. Everything updates the plot automatically.

import { useEffect, useId, useRef } from 'react'
import type { GraphicalTabState } from './useGraphicalTabState'
import DualInput from '../../../components/DualInput'
import { AnalysisActions, Divider, SectionLabel, SelectField, SwitchField, TextField } from '../../../components/ControlPrimitives'
import type { GraphType } from '../../../api/graphical'
import { LABELS, confidenceReadout, estimatorOptions } from '../../../labels'
import { BOUNDS, supportedOverlays } from './graphicalState'

// ─── Small UI pieces ──────────────────────────────────────────────────────────

/** Indented block revealed by the switch above it. */
function Nested({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-3 pl-3 mb-2 border-l border-[var(--color-border-md)]">
      {children}
    </div>
  )
}

const GRAPH_TYPES: { value: GraphType; label: string }[] = [
  { value: 'Histogram', label: 'Histogram' },
  { value: 'PMF', label: 'Empirical PMF' },
  { value: 'ECDF', label: 'ECDF (cumulative proportion)' },
]

export default function GraphicalControls({ state }: { state: GraphicalTabState }) {
  const { cfg, winsorRaw, autoBins, hasData, numericCols, muEstimators, deviationEstimators,
    estimatorNotice, fieldErrors, resetVersion, updateConfig: set,
    setWinsorRaw, setAutoBins, reset } = state
  const rootRef = useRef<HTMLDivElement>(null)
  const graphName = useId()
  const shows = supportedOverlays(cfg.graphType)
  const isEcdf = cfg.graphType === 'ECDF'

  useEffect(() => {
    if (Object.keys(fieldErrors).length) rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [fieldErrors])

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 pt-10 pb-6 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          No dataset loaded. Go to the <strong className="text-[var(--color-text)]">Data</strong> tab to upload a CSV file.
        </p>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-0">

      <SectionLabel>Variable</SectionLabel>
      <SelectField
        label="Variable"
        value={cfg.column}
        onChange={(v) => set('column', v)}
        options={numericCols}
        error={fieldErrors.column}
        placeholder="— select column —"
      />

      <Divider />

      <fieldset className="mb-3">
        <legend className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">Graph</legend>
        <div className="flex flex-col gap-1">
          {GRAPH_TYPES.map((graph) => (
            <label key={graph.value} className="flex min-h-9 items-center gap-2 rounded-md border border-[var(--color-border-md)] px-3 py-2 text-sm cursor-pointer">
              <input type="radio" name={graphName} value={graph.value} checked={cfg.graphType === graph.value}
                onChange={() => set('graphType', graph.value)} className="accent-[var(--color-accent)]" />
              {graph.label}
            </label>
          ))}
        </div>
      </fieldset>

      {shows.bins && (
        <>
          <SwitchField label="Automatic bin count" checked={autoBins} onChange={setAutoBins} />
          {!autoBins && (
            <Nested>
              <DualInput
                label="Bins"
                value={cfg.bins ?? 20}
                min={BOUNDS.bins.min}
                max={BOUNDS.bins.max}
                step={BOUNDS.bins.step}
                decimals={0}
                resetSignal={resetVersion}
                onChange={(v) => set('bins', v)}
              />
            </Nested>
          )}
        </>
      )}

      <Divider />

      <SectionLabel>Overlays</SectionLabel>

      {shows.kde && (
        <SwitchField label="KDE (smoothed density)" checked={cfg.addKde} onChange={(v) => set('addKde', v)} />
      )}
      {shows.rug && (
        <SwitchField label="Show data (rug)" checked={cfg.addData} onChange={(v) => set('addData', v)} />
      )}

      {shows.confBand && (
        <>
          <SwitchField
            label="Confidence band for the ECDF"
            checked={cfg.addConfBand}
            onChange={(v) => set('addConfBand', v)}
            hint="Dvoretzky–Kiefer–Wolfowitz band"
          />
          {cfg.addConfBand && (
            <Nested>
              <DualInput
                label={LABELS.alpha}
                value={cfg.alpha}
                min={BOUNDS.alpha.min}
                max={BOUNDS.alpha.max}
                step={BOUNDS.alpha.step}
                decimals={3}
                hint={confidenceReadout(cfg.alpha)}
                resetSignal={resetVersion}
                onChange={(v) => set('alpha', v)}
              />
            </Nested>
          )}
        </>
      )}

      {shows.normal ? (
        <>
          <SwitchField
            label={isEcdf ? 'Normal CDF' : 'Normal density'}
            checked={cfg.addNormal}
            onChange={(v) => set('addNormal', v)}
          />
          {cfg.addNormal && (
            <Nested>
              {estimatorNotice && <p role="status" className="text-xs text-amber-300 mb-3">{estimatorNotice}</p>}
              <SelectField
                label={LABELS.muEstimator}
                value={cfg.muEstimator}
                onChange={(v) => set('muEstimator', v)}
                options={estimatorOptions(muEstimators)}
              />
              {cfg.muEstimator === 'Trimmed Mean' && (
                <Nested>
                  <DualInput
                    label={LABELS.trimFraction}
                    value={cfg.trimParam ?? 0.1}
                    min={BOUNDS.trim.min}
                    max={BOUNDS.trim.max}
                    step={BOUNDS.trim.step}
                    decimals={2}
                    resetSignal={resetVersion}
                    onChange={(v) => set('trimParam', v)}
                  />
                </Nested>
              )}
              {cfg.muEstimator === 'Winsorized Mean' && (
                <Nested>
                  <TextField label={LABELS.winsorFractions} value={winsorRaw} onChange={setWinsorRaw} placeholder="0.1, 0.1"
                    hint="Fraction to replace in each tail; two values from 0 up to 0.5." error={fieldErrors.winsorLimits} />
                </Nested>
              )}
              {cfg.muEstimator === 'Weighted Mean' && (
                <Nested>
                  <SelectField
                    label={LABELS.weightsColumn}
                    value={cfg.weightsColumn ?? ''}
                    onChange={(v) => set('weightsColumn', v || null)}
                    options={numericCols.filter((c) => c !== cfg.column)}
                    error={fieldErrors.weightsColumn}
                    placeholder="— select column —"
                  />
                </Nested>
              )}
              <SelectField
                label={LABELS.sigmaEstimator}
                value={cfg.sigmaEstimator}
                onChange={(v) => set('sigmaEstimator', v)}
                options={estimatorOptions(deviationEstimators)}
              />
            </Nested>
          )}
        </>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)] leading-snug mb-2">
          The empirical PMF plots probability, so a density curve would not be on the same scale.
        </p>
      )}

      <Divider />

      <AnalysisActions onReset={reset} />
    </div>
  )
}
