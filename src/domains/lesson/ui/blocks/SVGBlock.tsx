'use client'

import React from 'react'

interface SVGBlockProps {
  type: 'svg'
  svg: string
  title?: string
  description?: string
}

function SVGBlockComponent({ svg, title, description }: SVGBlockProps) {
  return (
    <div className="my-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {title}
        </h3>
      )}
      
      <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto">
        <div 
          className="flex justify-center"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      
      {description && (
        <p className="text-sm text-gray-600 mt-2 text-center">
          {description}
        </p>
      )}
    </div>
  )
}

export default React.memo(SVGBlockComponent)


