import { useId, type ReactNode } from 'react'

export type FieldOption = string | { value: string; label: string; disabled?: boolean }

const fieldClass = `w-full rounded-md px-3 py-2 text-sm bg-[var(--color-bg-input)]
  border border-[var(--color-border-md)] text-[var(--color-text)]
  focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]
  disabled:cursor-not-allowed disabled:opacity-50`

function descriptions(id: string, hint?: string, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
}

export function FieldShell({ id, label, hint, error, children }: {
  id: string; label: string; hint?: string; error?: string; children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 mb-3">
      <label htmlFor={id} className="text-sm text-[var(--color-text)]">{label}</label>
      {children}
      {hint && <p id={`${id}-hint`} className="text-xs text-[var(--color-text-muted)]">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function SelectField({ label, value, onChange, options, placeholder, hint, error, disabled }: {
  label: string; value: string; onChange: (value: string) => void; options: readonly FieldOption[]
  placeholder?: string; hint?: string; error?: string; disabled?: boolean
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}
        aria-invalid={!!error} aria-describedby={descriptions(id, hint, error)} className={fieldClass}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((entry) => {
          const option = typeof entry === 'string' ? { value: entry, label: entry } : entry
          return <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
        })}
      </select>
    </FieldShell>
  )
}

export function TextField({ label, value, onChange, onBlur, placeholder, hint, error, inputMode = 'text', disabled }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string
  error?: string; inputMode?: 'text' | 'decimal' | 'numeric'; disabled?: boolean; onBlur?: () => void
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input id={id} type="text" inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur} placeholder={placeholder} disabled={disabled} aria-invalid={!!error}
        aria-describedby={descriptions(id, hint, error)} className={`${fieldClass} font-mono`} />
    </FieldShell>
  )
}

export function SwitchField({ label, checked, onChange, hint, disabled }: {
  label: string; checked: boolean; onChange: (checked: boolean) => void; hint?: string; disabled?: boolean
}) {
  const hintId = useId()
  return (
    <div className="mb-2">
      <button type="button" role="switch" aria-checked={checked} aria-describedby={hint ? hintId : undefined}
        disabled={disabled} onClick={() => onChange(!checked)}
        className="flex min-h-9 w-full items-center gap-2 rounded text-left focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] disabled:opacity-50">
        <span aria-hidden="true" className={`relative h-4 w-8 shrink-0 rounded-full ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-md)]'}`}>
          <span className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
        </span>
        <span className="text-sm text-[var(--color-text)]">{label}</span>
      </button>
      {hint && <p id={hintId} className="ml-10 text-xs text-[var(--color-text-muted)]">{hint}</p>}
    </div>
  )
}

export function RadioGroup<T extends string>({ label, value, onChange, options, disabled }: {
  label: string; value: T; onChange: (value: T) => void
  options: readonly (T | { value: T; label: string })[]; disabled?: boolean
}) {
  const name = useId()
  return (
    <fieldset className="mb-3" disabled={disabled}>
      <legend className="mb-2 text-sm text-[var(--color-text)]">{label}</legend>
      <div className="flex flex-wrap gap-1">
        {options.map((entry) => {
          const option = typeof entry === 'string' ? { value: entry as T, label: entry } : entry
          return (
            <label key={option.value} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border-md)] px-3 py-2 text-sm">
              <input type="radio" name={name} value={option.value} checked={value === option.value}
                onChange={() => onChange(option.value)} className="accent-[var(--color-accent)]" />
              {option.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function Accordion({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: ReactNode
}) {
  const panelId = useId()
  return (
    <div className="mb-3 overflow-hidden rounded-md border border-[var(--color-border-md)]">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">
        {title}<span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <div id={panelId} hidden={!open} className="border-t border-[var(--color-border-md)] p-3">{children}</div>
    </div>
  )
}

export function AnalysisActions({ primaryLabel, onPrimary, primaryType = 'button', primaryDisabled, resetLabel = 'Reset', onReset, status }: {
  primaryLabel?: string; onPrimary?: () => void; primaryDisabled?: boolean
  primaryType?: 'button' | 'submit'; resetLabel?: string; onReset: () => void; status?: ReactNode
}) {
  return (
    <div className="analysis-actions pt-3">
      {status}
      <div className="flex gap-2">
        {primaryLabel && (onPrimary || primaryType === 'submit') && <button type={primaryType} onClick={onPrimary} disabled={primaryDisabled}
          className="flex-1 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {primaryLabel}
        </button>}
        <button type="button" onClick={onReset}
          className={`${primaryLabel ? '' : 'w-full'} rounded-lg border border-[var(--color-border-md)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]`}>
          {resetLabel}
        </button>
      </div>
    </div>
  )
}
