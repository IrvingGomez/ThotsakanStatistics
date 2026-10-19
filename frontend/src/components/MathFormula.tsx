import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * A LaTeX formula typeset with KaTeX. Only for formulas written in the source code, never for user
 * input: the rendered markup is inserted as HTML. The MathML copy keeps it readable by screen readers.
 */
export default function MathFormula({ tex }: { tex: string }) {
  const html = katex.renderToString(tex, { throwOnError: false, output: 'htmlAndMathml' })
  return <span className="block overflow-x-auto py-0.5 font-sans text-sm" dangerouslySetInnerHTML={{ __html: html }} />
}
