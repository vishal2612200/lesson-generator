import { supabaseAdmin } from '@/lib/supabase/server'

async function seed() {
  console.log('Seeding database...')

  const { data, error } = await (supabaseAdmin.from('lessons') as any).insert([
    {
      title: 'Introduction to Photosynthesis',
      outline: 'Create a quiz about photosynthesis with 5 questions covering the basic process, chlorophyll, and the chemical equation.',
      status: 'queued',
    },
    {
      title: 'JavaScript Basics',
      outline: 'Create a quiz about JavaScript fundamentals including variables, functions, and control flow.',
      status: 'queued',
    },
  ]).select()

  if (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  }

  console.log('Seeded lessons:', data)
  console.log('Seeding complete!')
}

seed()

