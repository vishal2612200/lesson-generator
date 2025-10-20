'use client'

import { TwoColumnBlock as TwoColumnBlockType } from '../types/blocks'
import BlockRenderer from '../BlockRenderer'

export default function TwoColumnBlock({ left, right, ratio = '50-50' }: TwoColumnBlockType) {
  const ratioClasses = {
    '50-50': 'grid-cols-1 md:grid-cols-2',
    '60-40': 'grid-cols-1 md:grid-cols-[60%_40%]',
    '40-60': 'grid-cols-1 md:grid-cols-[40%_60%]'
  }

  return (
    <div className={`grid ${ratioClasses[ratio]} gap-6 my-8`}>
      <div className="space-y-4">
        {left.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>
      <div className="space-y-4">
        {right.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>
    </div>
  )
}


