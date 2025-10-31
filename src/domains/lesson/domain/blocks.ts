'use client'

// Block-based content system for rich, varied lessons

export type ContentBlock = 
  | TextBlock
  | ImageBlock
  | VideoBlock
  | QuizBlock
  | CodeBlock
  | CalloutBlock
  | TwoColumnBlock
  | TabsBlock
  | HTMLBlock
  | SVGBlock

export interface TextBlock {
  type: 'text'
  content: string
  style?: 'normal' | 'large' | 'small'
}

export interface ImageBlock {
  type: 'image'
  url: string
  alt: string
  caption?: string
  size?: 'small' | 'medium' | 'large' | 'full'
}

export interface VideoBlock {
  type: 'video'
  url: string
  title?: string
  description?: string
  platform?: 'youtube' | 'vimeo' | 'embed'
}

export interface QuizBlock {
  type: 'quiz'
  questions: QuizQuestion[]
}

export interface QuizQuestion {
  q: string
  options: string[]
  correct: number
  explanation?: string
}

export interface CodeBlock {
  type: 'code'
  language: string
  code: string
  title?: string
  highlightLines?: number[]
}

export interface CalloutBlock {
  type: 'callout'
  variant: 'info' | 'warning' | 'success' | 'tip' | 'danger'
  title?: string
  content: string
  icon?: string
}

export interface TwoColumnBlock {
  type: 'two-column'
  left: ContentBlock[]
  right: ContentBlock[]
  ratio?: '50-50' | '60-40' | '40-60'
}

export interface TabsBlock {
  type: 'tabs'
  tabs: {
    label: string
    content: ContentBlock[]
  }[]
}

export interface HTMLBlock {
  type: 'html'
  html: string  // Will be sanitized
}

export interface SVGBlock {
  type: 'svg'
  svg: string
  title?: string
  description?: string
}

export interface RichContent {
  type: 'rich-content'
  blocks: ContentBlock[]
}

export type LessonContent = RichContent



