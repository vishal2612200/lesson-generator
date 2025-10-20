#!/usr/bin/env tsx

/**
 * Diagnostic script to check traces in the database
 * Run with: npx tsx scripts/check-traces.ts [lesson-id]
 */

import { createClient } from '@supabase/supabase-js'

// Create admin client with proper environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required')
  process.exit(1)
}

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkTraces(lessonId?: string) {
  console.log('🔍 Checking traces in database...\n')

  try {
    // Check if traces table exists
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('traces')
      .select('id')
      .limit(1)

    if (tablesError) {
      console.error('❌ Error accessing traces table:', tablesError.message)
      console.log('\n💡 The traces table might not exist. Run:')
      console.log('   psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql')
      return
    }

    console.log('✅ Traces table exists\n')

    if (lessonId) {
      // Check specific lesson
      console.log(`📋 Checking traces for lesson: ${lessonId}\n`)

      const { data: lesson, error: lessonError } = await (supabaseAdmin
        .from('lessons') as any)
        .select('*')
        .eq('id', lessonId)
        .single()

      if (lessonError || !lesson) {
        console.error('❌ Lesson not found:', lessonId)
        return
      }

      console.log('📖 Lesson Info:')
      console.log(`   Title: ${lesson.title}`)
      console.log(`   Status: ${lesson.status}`)
      console.log(`   Created: ${lesson.created_at}`)
      console.log()

      const { data: traces, error: tracesError } = await (supabaseAdmin
        .from('traces') as any)
        .select('*')
        .eq('lesson_id', lessonId)
        .order('attempt_number', { ascending: true })

      if (tracesError) {
        console.error('❌ Error fetching traces:', tracesError.message)
        return
      }

      if (!traces || traces.length === 0) {
        console.log('❌ No traces found for this lesson')
        console.log('\n💡 Possible reasons:')
        console.log('   1. Lesson was created before tracing was implemented')
        console.log('   2. Generation worker is not saving traces')
        console.log('   3. Database permissions issue')
        console.log('\n🔧 Debug steps:')
        console.log('   1. Check worker logs for errors')
        console.log('   2. Generate a new lesson to test')
        console.log('   3. Check database permissions')
        return
      }

      console.log(`✅ Found ${traces.length} trace(s):\n`)

      traces.forEach((trace: any) => {
        const status = trace.compilation?.success
          ? '✅ Success'
          : !trace.validation?.passed
          ? '⚠️  Validation Failed'
          : '🔧 Compilation Failed'

        console.log(`   Attempt ${trace.attempt_number}: ${status}`)
        console.log(`   Model: ${trace.model}`)
        console.log(`   Tokens: ${trace.tokens?.total_tokens || 'N/A'}`)
        console.log(`   Timestamp: ${trace.timestamp}`)
        console.log()
      })
    } else {
      // List all lessons with trace counts
      console.log('📊 Trace statistics for all lessons:\n')

      const { data: lessons, error: lessonsError } = await (supabaseAdmin
        .from('lessons') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (lessonsError || !lessons) {
        console.error('❌ Error fetching lessons:', lessonsError)
        return
      }

      console.log(`Found ${lessons.length} recent lessons:\n`)

      for (const lesson of lessons) {
        const { data: traces } = await (supabaseAdmin
          .from('traces') as any)
          .select('id')
          .eq('lesson_id', lesson.id)

        const traceCount = traces?.length || 0
        const icon = traceCount > 0 ? '✅' : '❌'

        console.log(`${icon} ${lesson.title.substring(0, 50)}...`)
        console.log(`   ID: ${lesson.id}`)
        console.log(`   Status: ${lesson.status}`)
        console.log(`   Traces: ${traceCount}`)
        console.log(`   Created: ${new Date(lesson.created_at).toLocaleString()}`)
        console.log()
      }

      const { data: allTraces } = await (supabaseAdmin
        .from('traces') as any)
        .select('id')

      console.log(`\n📈 Total traces in database: ${allTraces?.length || 0}`)

      if (!allTraces || allTraces.length === 0) {
        console.log('\n❌ No traces found in the database!')
        console.log('\n💡 This means traces are NOT being saved.')
        console.log('\n🔧 Troubleshooting:')
        console.log('   1. Check if the worker is running')
        console.log('   2. Check worker logs for errors')
        console.log('   3. Verify database permissions')
        console.log('   4. Generate a new test lesson')
        console.log('   5. Check if supabaseAdmin client is configured correctly')
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Parse command line arguments
const lessonId = process.argv[2]

checkTraces(lessonId)
  .then(() => {
    console.log('\n✅ Check complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

