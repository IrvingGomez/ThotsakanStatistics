// features/estimation/graphical/GraphicalControls.tsx
// Left panel: variable, graph type and overlays. Everything updates the plot automatically.

import { useEffect, useRef } from 'react'
import type { GraphicalTabState } from './useGraphicalTabState'
import DualInput from '../../../components/DualInput'
import { AnalysisActions, Divider, RadioGroup, SectionLabel, SelectField, SwitchField, TextField, VariableSection } from '../../../components/ControlPrimitives'
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
  const { cfg, winsorRaw, autoBins, sessionId, numericCols, muEstimators, deviationEstimators,
    fieldErrors, resetVersion, updateConfig: set,
    setWinsorRaw, setAutoBins, reset } = state
  const rootRef = useRef<HTMLDivElement>(null)
  const shows = supportedOverlays(cfg.graphType)
  const isEcdf = cfg.graphType === 'ECDF'

  useEffect(() => {
    if (Object.keys(fieldErrors).length) rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [fieldErrors])

  return (
    <div ref={rootRef} className="flex flex-col gap-0">

      <VariableSection value={cfg.column} onChange={(v) => set('column', v)} options={numericCols}
        error={fieldErrors.column} loaded={!!sessionId} />

      <RadioGroup label="Graph" value={cfg.graphType} onChange={(v) => set('graphType', v)} options={GRAPH_TYPES} />

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
