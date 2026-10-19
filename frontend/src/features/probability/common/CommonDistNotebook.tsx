import { DISTRIBUTIONS, type DistParams } from '../../../hooks/useDistribution'
import { Formula, Row, Section } from '../../../components/notebook/NotebookParts'
import MathFormula from '../../../components/MathFormula'
import { DIST_FORMULAS } from './distributionFormulas'

interface CommonDistNotebookProps {
  distParams: DistParams
}

export default function CommonDistNotebook({ distParams }: CommonDistNotebookProps) {
  const { distName, paramValues } = distParams
  const dist = DISTRIBUTIONS.find((d) => d.name === distName)
  const formula = DIST_FORMULAS[distName]

  return (
    <div>
      <Section title="Parameters">
        {dist?.params.map((p) => <Row key={p.key} label={p.label} value={String(paramValues[p.key] ?? p.default)} />)}
      </Section>

      {formula && (
        <Section title="Formula">
          <Formula label={dist?.type === 'discrete' ? 'Probability mass function' : 'Probability density function'}><MathFormula tex={formula.density} /></Formula>
          <Formula label="Support"><MathFormula tex={formula.support} /></Formula>
          <Formula label="Parameters"><MathFormula tex={formula.parameters} /></Formula>
          <Formula label="Mean"><MathFormula tex={formula.mean} /></Formula>
          <Formula label="Variance"><MathFormula tex={formula.variance} /></Formula>
        </Section>
      )}
    </div>
  )
}
