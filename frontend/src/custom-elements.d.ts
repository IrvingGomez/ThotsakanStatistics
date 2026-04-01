import { HTMLAttributes, RefObject } from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': MathFieldAttributes
    }
  }

  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'math-field': MathFieldAttributes
      }
    }
  }
}

interface MathFieldAttributes extends HTMLAttributes<HTMLElement> {
  ref?: RefObject<HTMLElement | null>
  value?: string
  className?: string
  [key: string]: unknown
}

export {}
