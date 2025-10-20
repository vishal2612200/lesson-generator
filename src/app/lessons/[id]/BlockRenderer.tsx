'use client'

import { ContentBlock } from './types/blocks'
import TextBlock from './blocks/TextBlock'
import ImageBlock from './blocks/ImageBlock'
import VideoBlock from './blocks/VideoBlock'
import QuizBlock from './blocks/QuizBlock'
import CodeBlock from './blocks/CodeBlock'
import CalloutBlock from './blocks/CalloutBlock'
import TwoColumnBlock from './blocks/TwoColumnBlock'
import TabsBlock from './blocks/TabsBlock'
import HTMLBlock from './blocks/HTMLBlock'
import SVGBlock from './blocks/SVGBlock'

interface BlockRendererProps {
  block: ContentBlock
  onComplete?: () => void
  onInteraction?: () => void
  onQuizAttempt?: (score?: number) => void
}

export default function BlockRenderer({ block, onComplete, onInteraction, onQuizAttempt }: BlockRendererProps) {
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

