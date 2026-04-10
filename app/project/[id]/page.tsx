import QuestionnairePage from '@/components/QuestionnairePage'

// Pre-generate at least one HTML shell so the JS bundle is included in the
// static output. The 404.html trick (see deploy workflow) handles real runtime
// project IDs that aren't known at build time.
export function generateStaticParams() {
  return [{ id: 'new' }]
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <QuestionnairePage projectId={id} />
}
