import { parseExcel } from '@/lib/parseExcel'
import QuestionnairePage from '@/components/QuestionnairePage'

export const dynamic = 'force-dynamic'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sheets = await parseExcel()
  return <QuestionnairePage sheets={sheets} projectId={id} />
}
