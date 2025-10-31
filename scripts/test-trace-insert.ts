#!/usr/bin/env tsx

/**
 * Test script to verify traces can be inserted
 * Run with: npx tsx scripts/test-trace-insert.ts
 */

import { createClient } from '@supabase/supabase-js'

// Create admin client with proper environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error(' SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required')
  process.exit(1)
}

if (!supabaseServiceRoleKey) {
  console.error(' SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

async function testTraceInsert() {
  console.log('🧪 Testing trace insertion...\n')

  try {
    // First, get or create a test lesson
    console.log('1️⃣  Finding or creating test lesson...')

    let testLesson: any

    const { data: existingLessons } = await (supabaseAdmin
      .from('lessons') as any)
      .select('*')
      .eq('title', '[TEST] Trace Test Lesson')
      .limit(1)

    if (existingLessons && existingLessons.length > 0) {
      testLesson = existingLessons[0]
      console.log(`    Using existing test lesson: ${testLesson.id}`)
    } else {
      const { data: newLesson, error: createError } = await (supabaseAdmin
        .from('lessons') as any)
        .insert({
          title: '[TEST] Trace Test Lesson',
          outline: 'Test outline for trace debugging',
          status: 'generated',
        })
        .select()
        .single()

      if (createError) {
        console.error('    Failed to create test lesson:', createError)
        return
      }

      testLesson = newLesson
      console.log(`    Created test lesson: ${testLesson.id}`)
    }

    console.log()

    // Test inserting a trace
    console.log('2️⃣  Attempting to insert test trace...')

    const testTrace = {
      lesson_id: testLesson.id,
      attempt_number: 999, // Use high number to identify test traces
      timestamp: new Date().toISOString(),
      prompt: 'TEST PROMPT: This is a test trace',
      model: 'test-model',
      response: 'TEST RESPONSE: This is a test response',
      tokens: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
      },
      validation: {
        passed: true,
        errors: [],
      },
      compilation: {
        success: true,
        tsc_errors: [],
      },
    }

    console.log('   Trace data:', JSON.stringify(testTrace, null, 2))
    console.log()

    const { data: insertedTrace, error: insertError } = await (supabaseAdmin
      .from('traces') as any)
      .insert(testTrace)
      .select()
      .single()

    if (insertError) {
      console.error('    Failed to insert trace:', insertError)
      console.log('\n💡 Common causes:')
      console.log('   1. Database permissions issue')
      console.log('   2. Missing required fields')
      console.log('   3. Foreign key constraint (lesson_id must exist)')
      console.log('   4. SUPABASE_SERVICE_ROLE_KEY not set correctly')
      return
    }

    console.log('    Successfully inserted trace!')
    console.log('   Trace ID:', insertedTrace.id)
    console.log()

    // Verify trace can be read back
    console.log('3️⃣  Verifying trace can be read...')

    const { data: readTrace, error: readError } = await (supabaseAdmin
      .from('traces') as any)
      .select('*')
      .eq('id', insertedTrace.id)
      .single()

    if (readError) {
      console.error('    Failed to read trace:', readError)
      return
    }

    console.log('    Successfully read trace back!')
    console.log()

    // Check all traces for this lesson
    console.log('4️⃣  Checking all traces for test lesson...')

    const { data: allTraces, error: allTracesError } = await (supabaseAdmin
      .from('traces') as any)
      .select('*')
      .eq('lesson_id', testLesson.id)
      .order('attempt_number', { ascending: true })

    if (allTracesError) {
      console.error('    Failed to fetch traces:', allTracesError)
      return
    }

    console.log(`    Found ${allTraces?.length || 0} trace(s) for this lesson`)

    if (allTraces && allTraces.length > 0) {
      allTraces.forEach((trace: any) => {
        console.log(`      - Attempt ${trace.attempt_number}: ${trace.model}`)
      })
    }

    console.log()

    // Cleanup test trace
    console.log('5️⃣  Cleaning up test trace...')

    const { error: deleteError } = await (supabaseAdmin
      .from('traces') as any)
      .delete()
      .eq('id', insertedTrace.id)

    if (deleteError) {
      console.error('     Failed to delete test trace:', deleteError)
      console.log('   You may need to manually delete it.')
    } else {
      console.log('    Test trace cleaned up')
    }

    console.log()
    console.log('═══════════════════════════════════════')
    console.log(' ALL TESTS PASSED!')
    console.log('═══════════════════════════════════════')
    console.log()
    console.log('The database is configured correctly for traces.')
    console.log('If traces still don\'t appear for real lessons, check:')
    console.log('  1. Worker is actually running')
    console.log('  2. Worker logs for insertion errors')
    console.log('  3. Environment variables are set correctly')
    console.log()
  } catch (error) {
    console.error(' Unexpected error:', error)
    console.log('\n💡 This might indicate a configuration issue.')
    console.log('Check your DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  }
}

testTraceInsert()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

