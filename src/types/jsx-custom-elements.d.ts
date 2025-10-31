import type React from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lesson-renderer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'lesson-id'?: string
        title?: string
      }
    }
  }
}

export {}


