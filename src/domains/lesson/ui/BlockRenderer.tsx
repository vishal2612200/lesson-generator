'use client'

import React from 'react'
import { ContentBlock } from '@domains/lesson/domain/blocks'
import TextBlock from '@domains/lesson/ui/blocks/TextBlock'
import ImageBlock from '@domains/lesson/ui/blocks/ImageBlock'
import VideoBlock from '@domains/lesson/ui/blocks/VideoBlock'
import QuizBlock from '@domains/lesson/ui/blocks/QuizBlock'
import CodeBlock from '@domains/lesson/ui/blocks/CodeBlock'
import CalloutBlock from '@domains/lesson/ui/blocks/CalloutBlock'
import TwoColumnBlock from '@domains/lesson/ui/blocks/TwoColumnBlock'
import TabsBlock from '@domains/lesson/ui/blocks/TabsBlock'
import HTMLBlock from '@domains/lesson/ui/blocks/HTMLBlock'
import SVGBlock from '@domains/lesson/ui/blocks/SVGBlock'

interface BlockRendererProps {
  block: ContentBlock
  onComplete?: () => void
  onInteraction?: () => void
  onQuizAttempt?: (score?: number) => void
}

function BlockRendererComponent({ block, onComplete, onInteraction, onQuizAttempt }: BlockRendererProps) {
  switch (block.type) {
    case 'text':
      return <TextBlock {...block} />
    case 'image':
      return <ImageBlock {...block} />
    case 'video':
      return <VideoBlock {...block} />
    case 'quiz':
      return <QuizBlock {...block} onInteraction={onInteraction} onQuizAttempt={onQuizAttempt} />
    case 'code':
      return <CodeBlock {...block} />
    case 'callout':
      return <CalloutBlock {...block} />
    case 'two-column':
      return <TwoColumnBlock {...block} />
    case 'tabs':
      return <TabsBlock {...block} />
    case 'html':
      return <HTMLBlock {...block} />
    case 'svg':
      return <SVGBlock {...block} />
    default:
      console.error('Unknown block type:', (block as any).type)
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          Unknown block type: {(block as any).type}
        </div>
      )
  }
}

const BlockRenderer = React.memo(BlockRendererComponent, (prev, next) => {
  // Shallow compare by block reference and handler identities for stability
  return (
    prev.block === next.block &&
    prev.onComplete === next.onComplete &&
    prev.onInteraction === next.onInteraction &&
    prev.onQuizAttempt === next.onQuizAttempt
  )
})

export default BlockRenderer


