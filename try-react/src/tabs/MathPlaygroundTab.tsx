import { useEffect, useRef, useState } from 'react'

type KatexModule = {
  renderToString: (input: string, options?: { throwOnError?: boolean; displayMode?: boolean }) => string
}

export default function MathPlaygroundTab() {
  const [latex, setLatex] = useState('\\hat{\\mu} \\pm z_{\\alpha/2}\\frac{\\sigma}{\\sqrt{n}}')
  const [katexHtml, setKatexHtml] = useState('Loading KaTeX...')
  const [katexRenderer, setKatexRenderer] = useState<KatexModule | null>(null)
  const mathFieldRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    void import('mathlive')
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadKatex = async () => {
      await import('katex/dist/katex.min.css' as unknown as string)
      const module = (await import('katex')).default
      if (!cancelled) {
        setKatexRenderer(module)
      }
    }

    void loadKatex()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!katexRenderer) {
      return
    }

    try {
      const rendered = katexRenderer.renderToString(latex, {
        throwOnError: false,
        displayMode: true,
      })
      setKatexHtml(rendered)
    } catch {
      setKatexHtml('<p>Invalid LaTeX input.</p>')
    }
  }, [katexRenderer, latex])

  useEffect(() => {
    const node = mathFieldRef.current
    if (!node) {
      return
    }

    const element = node as unknown as {
      value?: string
      addEventListener: HTMLElement['addEventListener']
      removeEventListener: HTMLElement['removeEventListener']
    }

    element.value = latex

    const onInput = (event: Event) => {
      const target = event.target as { value?: string }
      setLatex(target.value ?? '')
    }

    node.addEventListener('input', onInput)
    return () => node.removeEventListener('input', onInput)
  }, [latex])

  return (
    <section className="panel">
      <h2>Math Input + Render</h2>
      <p>Type math in the editable field below, then use the rendered preview for your UI cards/report blocks.</p>
      <math-field ref={mathFieldRef} className="math-input" />
      <div className="math-preview" dangerouslySetInnerHTML={{ __html: katexHtml }} />
    </section>
  )
}
