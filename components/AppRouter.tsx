'use client'

import { useSearchParams } from 'next/navigation'
import ProjectList from './ProjectList'
import QuestionnairePage from './QuestionnairePage'

// Reads ?project=<id> from the URL.
// Wrapped in <Suspense> by the root page (required for useSearchParams with output: export).
export default function AppRouter() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  if (projectId) return <QuestionnairePage projectId={projectId} />
  return <ProjectList />
}
