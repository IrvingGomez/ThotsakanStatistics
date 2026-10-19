import { useMemo } from 'react';
import type { HypothesisResponse } from '../../api/hypothesis';

interface HypothesisNotebookProps {
  result: HypothesisResponse | null;
  precision: number;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3 pb-1 border-b border-[var(--color-border-md)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function parseTable(result: HypothesisResponse | null): any[] {
  if (!result || !result.table) return [];
  try {
    return JSON.parse(result.table);
  } catch (e) {
    return [];
  }
}

/**
 * The result table is not all numeric: pingouin returns `CI95` as an array and
 * `BF10` as a string, and the ANOVA "Within" row is all nulls. A blanket
 * numeric format would print NaN across three columns.
 */
function formatCell(value: any, precision: number): string {
  if (value === null || value === undefined) return '–';
  if (typeof value === 'number') {
    if (value !== 0 && Math.abs(value) < 10 ** -precision) return value.toExponential(precision);
    return Number.isInteger(value) ? String(value) : value.toFixed(precision);
  }
  if (Array.isArray(value)) return `[${value.map(item => formatCell(item, precision)).join(', ')}]`;
  return String(value);
}

function RawTable({ rows, precision }: { rows: any[]; precision: number }) {
  if (rows.length === 0) return null;
  const headers = Object.keys(rows[0]);

  return (
    <div className="mb-4 bg-[var(--color-bg)] rounded-md border border-[var(--color-border-md)] overflow-hidden">
      <div className="overflow-x-auto" role="region" aria-label="Detailed test output" tabIndex={0}>
        <table className="w-full text-left text-xs text-[var(--color-text)] whitespace-nowrap">
          <thead className="bg-[var(--color-bg-input)]">
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-medium text-[var(--color-text-muted)] text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-md)]">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-[var(--color-bg-hover)]">
                {headers.map((h) => (
                  <td key={h} className="px-3 py-2 font-mono text-right">{formatCell(row[h], precision)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HypothesisNotebook({ result, precision }: HypothesisNotebookProps) {
  const rows = useMemo(() => parseTable(result), [result]);

  if (!result) {
    return (
      <div className="py-4 text-sm text-[var(--color-text-muted)]">
        Complete the test settings to see the result.
      </div>
    );
  }

  const region = result.rejection_region;
  const dofLabel = region.dof.map((d) => formatCell(d, precision)).join(', ');
  const crit = region.critical_values.map((c) => formatCell(c, precision));
  const critLabel = region.tail === 'two-sided' ? `±${formatCell(Math.abs(region.critical_values[1]), precision)}` : crit.join(', ');

  return (
    <div className="py-4">
      <Section title="Hypotheses">
        <div className="font-mono text-sm space-y-1 break-words text-[var(--color-text)]">
          <p><span className="text-[var(--color-text-muted)]">H₀:</span> {result.h0}</p>
          <p><span className="text-[var(--color-text-muted)]">H₁:</span> {result.h1}</p>
        </div>
      </Section>

      <Section title="Result">
        <div className="text-sm font-mono space-y-1 text-[var(--color-text)]">
          <p><span className="text-[var(--color-text-muted)]">Statistic </span>{formatCell(result.statistic, precision)}</p>
          <p><span className="text-[var(--color-text-muted)]">Degrees of freedom </span>{dofLabel}</p>
          <p><span className="text-[var(--color-text-muted)]">Critical boundary </span>{critLabel}</p>
          <p><span className="text-[var(--color-text-muted)]">Significance level α </span>{result.alpha}</p>
          <p><span className="text-[var(--color-text-muted)]">p-value </span>{formatCell(result.p_value, precision)}</p>
        </div>
      </Section>

      {result.group_summary && result.group_summary.length > 0 && (
        <Section title="Groups">
          <div className="space-y-2">
            {result.group_summary.map((group, index) => <div key={index} className="bg-[var(--color-bg-input)] rounded-md border border-[var(--color-border-md)] p-3">
              <h4 className="text-sm font-semibold break-words">{group.name}</h4>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt>Sample size n</dt><dd className="font-mono text-right break-all">{group.n}</dd>
                <dt>Mean</dt><dd className="font-mono text-right break-all">{formatCell(group.mean, precision)}</dd>
                <dt><abbr title="Standard deviation">SD</abbr></dt><dd className="font-mono text-right break-all">{formatCell(group.sd, precision)}</dd>
              </dl>
            </div>)}
          </div>
        </Section>
      )}

      {result.warnings.length > 0 && (
        <Section title="Warnings">
          <ul className="text-sm text-amber-500 space-y-1 list-disc list-inside">
            {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </Section>
      )}

      <details className="mb-6 rounded-md border border-[var(--color-border)] p-3">
          <summary className="cursor-pointer text-sm font-medium mb-2">Detailed output</summary>
          <RawTable rows={rows} precision={precision} />
          <p className="text-xs text-[var(--color-text-muted)]">
            Values use up to {precision} decimal places; very small values use scientific notation.
            Any CI95 interval has 95% confidence, regardless of α.
          </p>
        </details>
    </div>
  );
}
