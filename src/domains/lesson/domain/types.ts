export interface Lesson {
  id?: string
  title: string
  description?: string
  type: 'quiz' | 'one-pager' | 'explanation' | 'rich-content'
  content: any
}



