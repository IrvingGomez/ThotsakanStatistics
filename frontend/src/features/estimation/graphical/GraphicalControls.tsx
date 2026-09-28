// features/estimation/graphical/GraphicalControls.tsx
// Left panel: variable, graph type, display toggles (live) and the overlay
// cascade (estimators / bootstrap) which only computes on Run.

import { useEffect, useId, useRef, useState } from 'react'
import type { GraphicalTabState } from './useGraphicalTabState'
import DualInput from '../../../components/DualInput'
import { AnalysisActions, RadioGroup, SelectField, SwitchField, TextField } from '../../../components/ControlPrimitives'
import type { CIChoice, GraphType, MuSource, PIChoice } from '../../../api/graphical'
import {
  BOUNDS,
  supportedOverlays,
} from './graphicalState'

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
      {children}
    </p>
  )
}

function Divider() {
  return <div className="border-t border-[var(--color-border)] my-3" />
}

/** Indented block revealed by the checkbox above it. */
function Nested({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-3 pl-3 mb-2 border-l border-[var(--color-border-md)]">
      {children}
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRAPH_TYPES: { value: GraphType; label: string }[] = [
  { value: 'Histogram', label: 'Histogram' },
  { value: 'PMF', label: 'Empirical PMF' },
  { value: 'ECDF', label: 'ECDF (cumulative proportion)' },
]

const CI_CHOICES = ['Both', 'Mean', 'Median'] as const satisfies readonly CIChoice[]
const PI_CHOICES = ['Mean', 'Median', 'IQR', 'Bootstrap'] as const satisfies readonly PIChoice[]
const MU_SOURCES = ['Mean-based CI', 'Median-based CI'] as const satisfies readonly MuSource[]

const MEDIAN_ESTIMATORS = ['Sample Median']

export default function GraphicalControls({ state }: { state: GraphicalTabState }) {
  const { cfg, winsorRaw, autoBins, hasData, numericCols, meanEstimators, deviationEstimators,
    estimatorNotice, fieldErrors, isDirty, staleOverlays, isComputing, updateConfig: set,
    setWinsorRaw, setAutoBins, run: handleRun, reset: handleReset } = state
  const rootRef = useRef<HTMLDivElement>(null)
  const graphName = useId()
  const shows = supportedOverlays(cfg.graphType)
  const isEcdf = cfg.graphType === 'ECDF'
  const wantsEstimators = isEcdf ? cfg.addNormal : cfg.addNormal || cfg.addCi || cfg.addPi
  const anyBoot = cfg.bootstrapMean || cfg.bootstrapMedian || cfg.bootstrapPi
  const [resetGeneration, setResetGeneration] = useState(0)

  useEffect(() => {
    if (Object.keys(fieldErrors).length) rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [fieldErrors])

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 pt-10 pb-6 text-center">
        <span className="text-3xl">📂</span>
        <p className="text-sm text-[var(--color-text-muted)]">
          No dataset loaded. Go to the <strong className="text-[var(--color-text)]">Data</strong> tab to upload a CSV file.
        </p>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-0">

      {/* Variable */}
      <SectionLabel>Variable</SectionLabel>
      <SelectField
        label="Numeric column"
        value={cfg.column}
        onChange={(v) => set('column', v)}
        options={numericCols}
        error={fieldErrors.column}
        placeholder="— select column —"
      />

      <Divider />

      {/* Graph type */}
      <fieldset className="mb-3">
        <legend className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">Graph — updates automatically</legend>
        <div className="flex flex-col gap-1">
          {GRAPH_TYPES.map((graph) => (
            <label key={graph.value} className="flex items-center gap-2 rounded-md border border-[var(--color-border-md)] px-2.5 py-2 text-xs cursor-pointer">
              <input type="radio" name={graphName} value={graph.value} checked={cfg.graphType === graph.value}
                onChange={() => set('graphType', graph.value)} className="accent-[var(--color-accent)]" />
              {graph.label}
            </label>
          ))}
        </div>
      </fieldset>

      {shows.bins && (
        <>
          <SwitchField
            label="Automatic bin count"
            checked={autoBins}
            onChange={setAutoBins}
          />
          {!autoBins && (
            <Nested>
              <DualInput
                label="Bins"
                value={cfg.bins ?? 20}
                min={BOUNDS.bins.min}
                max={BOUNDS.bins.max}
                step={BOUNDS.bins.step}
                decimals={0}
                resetSignal={resetGeneration}
                onChange={(v) => set('bins', v)}
              />
            </Nested>
          )}
        </>
      )}

      <Divider />

      {/* Display / overlays */}
      <SectionLabel>Overlays</SectionLabel>
      <p className="text-sm text-[var(--color-text-muted)] mb-3 leading-relaxed">Bins, KDE, rug and ECDF band update automatically. Normal curves and intervals apply when you press Run.</p>

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
                label="Confidence level"
                value={cfg.ecdfConfLevel}
                min={BOUNDS.confLevel.min}
                max={BOUNDS.confLevel.max}
                step={BOUNDS.confLevel.step}
                decimals={3}
                resetSignal={resetGeneration}
                onChange={(v) => set('ecdfConfLevel', v)}
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
              <RadioGroup label="μ based on" value={cfg.normalMuSource} onChange={(v) => set('normalMuSource', v)} options={MU_SOURCES} />
            </Nested>
          )}
        </>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)] leading-snug mb-2">
          Density overlays are unavailable here: an empirical PMF plots probability,
          not density, so a KDE or normal curve would not be on the same scale.
        </p>
      )}

      {shows.intervals && (
        <>
          <SwitchField label="Confidence interval" checked={cfg.addCi} onChange={(v) => set('addCi', v)} />
          {cfg.addCi && (
            <Nested>
              <RadioGroup label="CI for" value={cfg.ciChoice} onChange={(v) => set('ciChoice', v)} options={CI_CHOICES} />
            </Nested>
          )}

          <SwitchField label="Prediction interval" checked={cfg.addPi} onChange={(v) => set('addPi', v)} />
          {cfg.addPi && (
            <Nested>
              <RadioGroup label="PI from" value={cfg.piChoice} onChange={(v) => set('piChoice', v)} options={PI_CHOICES} />
            </Nested>
          )}
        </>
      )}

      {/* Estimators — revealed only when an overlay needs them */}
      {wantsEstimators && (
        <>
          <Divider />
          <SectionLabel>Estimators — apply with Run</SectionLabel>
          {estimatorNotice && <p role="status" className="text-xs text-amber-300 mb-3">{estimatorNotice}</p>}
          <SelectField
            label="Mean estimator"
            value={cfg.meanEstimator}
            onChange={(v) => set('meanEstimator', v)}
            options={meanEstimators}
          />
          {cfg.meanEstimator === 'Trimmed Mean' && (
            <Nested>
              <DualInput
                label="Trimmed mean α"
                value={cfg.trimParam ?? 0.1}
                min={BOUNDS.trim.min}
                max={BOUNDS.trim.max}
                step={BOUNDS.trim.step}
                decimals={2}
                resetSignal={resetGeneration}
                onChange={(v) => set('trimParam', v)}
              />
            </Nested>
          )}
          {cfg.meanEstimator === 'Winsorized Mean' && (
            <Nested>
              <TextField label="Winsorized limits" value={winsorRaw} onChange={setWinsorRaw} placeholder="0.1, 0.1" hint="Fraction to replace in each tail; two values from 0 up to 0.5." error={fieldErrors.winsorLimits} />
            </Nested>
          )}
          {cfg.meanEstimator === 'Weighted Mean' && (
            <Nested>
              <SelectField
                label="Weights column"
                value={cfg.weightsColumn ?? ''}
                onChange={(v) => set('weightsColumn', v || null)}
                options={numericCols.filter((c) => c !== cfg.column)}
                error={fieldErrors.weightsColumn}
                placeholder="— select column —"
              />
            </Nested>
          )}
          <SelectField
            label="Median estimator"
            value={cfg.medianEstimator}
            onChange={(v) => set('medianEstimator', v)}
            options={MEDIAN_ESTIMATORS}
          />
          <SelectField
            label="Deviation estimator"
            value={cfg.sigmaEstimator}
            onChange={(v) => set('sigmaEstimator', v)}
            options={deviationEstimators}
          />

          {(cfg.addCi || cfg.addPi) && (
            <DualInput
              label="Confidence level (CI / PI)"
              value={cfg.confLevel}
              min={BOUNDS.confLevel.min}
              max={BOUNDS.confLevel.max}
              step={BOUNDS.confLevel.step}
              decimals={3}
              resetSignal={resetGeneration}
              onChange={(v) => set('confLevel', v)}
            />
          )}

          <details className="mt-3 mb-3">
          <summary className="text-sm font-medium cursor-pointer py-2">Advanced — bootstrap</summary>
          <p className="text-sm text-[var(--color-text-muted)] mb-2">Resample observations to estimate uncertainty. These settings apply with Run.</p>
          <SwitchField label="Bootstrap mean" checked={cfg.bootstrapMean} onChange={(v) => set('bootstrapMean', v)} />
          <SwitchField label="Bootstrap median" checked={cfg.bootstrapMedian} onChange={(v) => set('bootstrapMedian', v)} />
          {cfg.addPi && cfg.piChoice === 'Bootstrap' && <p className="text-xs text-[var(--color-text-muted)] mb-2">Bootstrap prediction is enabled by your interval method.</p>}
          {anyBoot && (
            <Nested>
              <DualInput
                label="Bootstrap samples"
                value={cfg.bootstrapSamples}
                min={BOUNDS.bootstrapSamples.min}
                max={BOUNDS.bootstrapSamples.max}
                step={BOUNDS.bootstrapSamples.step}
                decimals={0}
                resetSignal={resetGeneration}
                onChange={(v) => set('bootstrapSamples', v)}
              />
            </Nested>
          )}
          </details>
        </>
      )}

      <Divider />

      <AnalysisActions
        primaryLabel={isComputing ? 'Computing…' : isDirty ? 'Run — apply changes' : 'Run overlays'}
        onPrimary={handleRun}
        primaryDisabled={isComputing}
        onReset={() => { setResetGeneration(value => value + 1); handleReset() }}
        status={<>
          {isDirty && <p role="status" className="mb-2 text-xs text-amber-300">Overlay settings changed — press Run.</p>}
          {!isDirty && staleOverlays.length > 0 && <p role="status" className="mb-2 text-xs text-amber-300">Bootstrap overlays need updating — press Run.</p>}
        </>}
      />
    </div>
  )
}
