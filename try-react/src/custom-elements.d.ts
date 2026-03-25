declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': Record<string, unknown>
    }
  }

  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'math-field': Record<string, unknown>
      }
    }
  }
}

export {}
