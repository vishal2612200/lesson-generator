import { TextBlock as TextBlockType } from '../types/blocks'

export default function TextBlock({ content, style = 'normal' }: TextBlockType) {
  const sizeClasses = {
    normal: 'text-base leading-relaxed',
    large: 'text-lg leading-relaxed',
    small: 'text-sm leading-relaxed'
  }

  return (
    <div 
      className={`prose prose-lg max-w-none ${sizeClasses[style]} text-gray-800`}
      dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
    />
  )
}

// Simple markdown-like formatting with improved styling
function formatMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>')
    // Code inline
    .replace(/`(.*?)`/g, '<code class="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 px-2 py-0.5 rounded-md text-sm font-mono border border-gray-300">$1</code>')
    // Headers
    .replace(/^### (.*?)$/gm, '<h3 class="text-xl font-bold mt-6 mb-3 text-gray-900 border-b-2 border-gray-200 pb-2">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 class="text-2xl font-bold mt-8 mb-4 text-gray-900 border-b-2 border-blue-200 pb-2">$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1 class="text-3xl font-bold mt-10 mb-5 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">$1</h1>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-4">')
    // Wrap in paragraph if no headers
    .replace(/^(?!<h)(.+)$/gm, '<p class="mb-4 text-gray-700">$1</p>')
}


