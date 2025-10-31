import { LessonRepository } from '@domains/lesson/domain/repositories/LessonRepository'
import { LessonRepositorySupabase } from '@domains/lesson/infrastructure/supabase/LessonRepositorySupabase'

export function makeLessonRepository(): LessonRepository {
  return new LessonRepositorySupabase()
}
