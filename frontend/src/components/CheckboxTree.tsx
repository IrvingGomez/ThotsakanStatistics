import type { ReactNode } from 'react'

export interface CheckboxNode {
  id: string
  label: string
  hint?: string
  disabled?: boolean
  /** Options that only apply when this node is ticked. */
  children?: readonly CheckboxNode[]
  /** Extra controls (a parameter field, a dropdown…) shown only while this node is ticked. */
  detail?: ReactNode
}

/**
 * Ids that are ticked *and* whose ancestors are all ticked. A control that is hidden is never sent
 * (see doc/interaction_contract.md, rule 1), so requests must be built from this, not from `checked`.
 */
export function visibleChecked(nodes: readonly CheckboxNode[], checked: readonly string[]): string[] {
  const on = new Set(checked)
  const out: string[] = []
  const walk = (list: readonly CheckboxNode[]) => {
    for (const node of list) {
      if (!on.has(node.id)) continue
      out.push(node.id)
      if (node.children) walk(node.children)
    }
  }
  walk(nodes)
  return out
}

function Branch({ nodes, checked, onToggle, disabled, depth }: {
  nodes: readonly CheckboxNode[]; checked: ReadonlySet<string>
  onToggle: (id: string) => void; disabled?: boolean; depth: number
}) {
  return (
    <ul className={depth === 0 ? 'm-0 list-none p-0' : 'ml-6 list-none p-0'}>
      {nodes.map((node) => {
        const isOn = checked.has(node.id)
        return (
          <li key={node.id}>
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-[var(--color-text)]">
              <input type="checkbox" checked={isOn} disabled={disabled || node.disabled}
                onChange={() => onToggle(node.id)} className="h-4 w-4 accent-[var(--color-accent)]" />
              {node.label}
            </label>
            {node.hint && <p className="ml-6 text-xs text-[var(--color-text-muted)]">{node.hint}</p>}
            {isOn && node.detail && <div className="ml-6 mt-1 mb-1">{node.detail}</div>}
            {isOn && node.children && (
              <Branch nodes={node.children} checked={checked} onToggle={onToggle} disabled={disabled} depth={depth + 1} />
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Checkbox list where an option's sub-options and extra controls appear only while it is ticked.
 * `checked` holds every ticked id; unticking a parent hides its children but keeps their state, so
 * re-ticking restores them. Build requests from `visibleChecked`.
 */
export default function CheckboxTree({ label, nodes, checked, onChange, disabled }: {
  label: string; nodes: readonly CheckboxNode[]; checked: readonly string[]
  onChange: (next: string[]) => void; disabled?: boolean
}) {
  const on = new Set(checked)
  const toggle = (id: string) => {
    const next = new Set(on)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }
  return (
    <fieldset className="mb-3" disabled={disabled}>
      <legend className="mb-1 text-sm text-[var(--color-text)]">{label}</legend>
      <Branch nodes={nodes} checked={on} onToggle={toggle} disabled={disabled} depth={0} />
    </fieldset>
  )
}
