export type Persona = 'generalist' | 'socratic' | 'communicator'

export function getSelectedPersona(): Persona {
  const env = (process.env.GEN_PERSONA || 'generalist').toLowerCase()
  if (env === 'socratic') return 'socratic'
  if (env === 'communicator') return 'communicator'
  return 'generalist'
}

export function getPersonaIntro(persona: Persona): string {
  switch (persona) {
    case 'socratic':
      return `You are a Socratic tutor and expert explainer. Produce an interactive React (TSX) component that teaches the requested Topic to any audience through clear steps, examples, and guided questions.`
    case 'communicator':
      return `You are a public science communicator. Produce an interactive React (TSX) component that makes the requested Topic intuitive and memorable for any audience.`
    default:
      return `You are a master generalist educator and science communicator. Produce an interactive React (TSX) component that teaches the requested Topic to any audience with clarity, accuracy, and engagement.`
  }
}


