import { LessonContent } from './contentCreator'

/**
 * Convert multi-agent content to TypeScript code
 * 
 * Since multi-agent system produces structured content objects,
 * we need to convert them to TypeScript code that can be compiled
 */
export function convertContentToTypeScript(content: LessonContent): string {
  const interfaceDefinition = `
export interface Lesson {
  id?: string;
  title: string;
  description?: string;
  type: 'quiz' | 'one-pager' | 'explanation';
  content: any;
}
`.trim()

  const lessonObject = `
const lesson: Lesson = ${JSON.stringify(
    {
      title: content.title,
      description: content.description || undefined,
      type: content.type,
      content: content.content
    },
    null,
    2
  )};
`.trim()

  const exportStatement = `
export default lesson as Lesson;
`.trim()

  return `${interfaceDefinition}\n\n${lessonObject}\n\n${exportStatement}`
}

/**
 * Add thinking comments to TypeScript code
 * Useful for debugging and understanding agent decisions
 */
export function addThinkingComments(
  typeScriptCode: string,
  planningThinking: string,
  creatorThinking: string
): string {
  const comments = `
/**
 * Multi-Agent Generated Lesson
 * 
 * PLANNING DECISIONS:
 * ${planningThinking.split('\n').map(line => ` * ${line}`).join('\n')}
 * 
 * CONTENT CREATION DECISIONS:
 * ${creatorThinking.split('\n').map(line => ` * ${line}`).join('\n')}
 */
`.trim()

  return `${comments}\n\n${typeScriptCode}`
}

