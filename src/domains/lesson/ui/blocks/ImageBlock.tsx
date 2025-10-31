import React from 'react'
import { ImageBlock as ImageBlockType } from '@domains/lesson/domain/blocks'

function ImageBlockComponent({ url, alt, caption, size = 'medium' }: ImageBlockType) {
  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'w-full'
  }

  return (
    <div className={`mx-auto ${sizeClasses[size]} my-6`}>
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
        <img 
          src={url} 
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
      {caption && (
        <p className="text-sm text-gray-600 text-center mt-2 italic">{caption}</p>
      )}
    </div>
  )
}

export default React.memo(ImageBlockComponent)


