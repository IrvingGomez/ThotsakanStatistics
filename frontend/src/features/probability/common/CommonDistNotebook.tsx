import { DISTRIBUTIONS, type DistParams } from '../../../hooks/useDistribution'
import { Formula, Section } from '../../../components/notebook/NotebookParts'
import MathFormula from '../../../components/MathFormula'
import { DIST_FORMULAS } from './distributionFormulas'

interface CommonDistNotebookProps {
  distParams: DistParams
}

export default function CommonDistNotebook({ distParams }: CommonDistNotebookProps) {
  const { distName } = distParams
  const dist = DISTRIBUTIONS.find((d) => d.name === distName)
  const formula = DIST_FORMULAS[distName]

  if (!formula) return null
  return (
    <div>
      <Section title="About">
        <p className="text-xs leading-relaxed text-[var(--color-text)]">{formula.description}</p>
      </Section>

      <Section title="Formula">
        <Formula label={dist?.type === 'discrete' ? 'Probability mass function' : 'Probability density function'}><MathFormula tex={formula.density} /></Formula>
        <Formula label="Support"><MathFormula tex={formula.support} /></Formula>
        <div className="mb-2">
          <p className="text-xs text-[var(--color-text-muted)]">Parameters</p>
          <ul className="text-xs text-[var(--color-text)]">
            {formula.parameters.map((param) => (
              <li key={param.tex} className="flex flex-wrap items-baseline gap-x-2">
                <MathFormula tex={param.tex} />
                <span className="text-[var(--color-text-muted)]">{param.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
        <Formula label="Mean"><MathFormula tex={formula.mean} /></Formula>
        <Formula label="Variance"><MathFormula tex={formula.variance} /></Formula>
      </Section>
    </div>
  )
}
