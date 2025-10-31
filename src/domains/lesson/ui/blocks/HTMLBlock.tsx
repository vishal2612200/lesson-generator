import React from 'react'
import { HTMLBlock as HTMLBlockType } from '@domains/lesson/domain/blocks'
import DOMPurify from 'isomorphic-dompurify'

function HTMLBlockComponent({ html }: HTMLBlockType) {
  const sanitizedHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'b', 'i', 'u', 'strong', 'em',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
      'img', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
      'a', 'br', 'hr', 'blockquote', 'pre', 'code'
    ],
    ALLOWED_ATTR: [
      'class', 'style', 'src', 'alt', 'title', 'href', 'target',
      'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width',
      'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points'
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  })

  return (
    <div 
      className="my-4"
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  )
}

export default React.memo(HTMLBlockComponent)


