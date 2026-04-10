import type { Sheet } from './parseExcel'
import type { Meta } from './exportPdf'
import type { CustomQuestion, CustomCategory } from './projectStorage'
import { NA_VALUE, getQuestionType, formatAnswerForExport } from './questionTypes'
import { parseAttachments, type Attachment } from './attachmentStorage'

type ExportOptions = {
  hiddenQuestions?: string[]
  hiddenCategories?: string[]
  customQuestions?: CustomQuestion[]
  customCategories?: CustomCategory[]
  mandatoryQuestions?: string[]
  imageData?: Record<string, string> // imageKey → base64 dataUrl
}

function resolveAnswer(rawAnswer: string | undefined, questionText: string): string {
  if (!rawAnswer) return ''
  if (rawAnswer === NA_VALUE) return 'N/A'
  return formatAnswerForExport(rawAnswer, getQuestionType(questionText))
}

function resolveCustomAnswer(rawAnswer: string | undefined, cq: CustomQuestion): string {
  if (!rawAnswer) return ''
  if (rawAnswer === NA_VALUE) return 'N/A'
  const cfg = cq.type === 'textarea'
    ? { type: 'textarea' as const }
    : { type: cq.type, options: cq.options ?? [] }
  return formatAnswerForExport(rawAnswer, cfg)
}

function buildAttachments(
  raw: string | undefined,
  imageData: Record<string, string>
): (Attachment & { dataUrl?: string })[] {
  return parseAttachments(raw).map((att) => ({
    ...att,
    dataUrl: att.imageKey ? imageData[att.imageKey] : undefined,
  }))
}

export function exportJson(
  sheets: Sheet[],
  answers: Record<string, string>,
  meta: Meta,
  options: ExportOptions = {}
) {
  const hiddenSet = new Set(options.hiddenQuestions ?? [])
  const hiddenCatSet = new Set(options.hiddenCategories ?? [])
  const customQuestions = options.customQuestions ?? []
  const customCategories = options.customCategories ?? []
  const mandatorySet = new Set(options.mandatoryQuestions ?? [])
  const imageData = options.imageData ?? {}

  let totalQ = 0
  let answeredQ = 0
  let mandatoryUnanswered = 0

  const sheetsData = sheets.map((sheet) => {
    const sheetCustomCats = customCategories.filter((cc) => cc.sheet === sheet.name)

    const categoriesData = [
      // Regular categories
      ...sheet.categories
        .filter((cat) => !hiddenCatSet.has(`${sheet.name}::${cat.name}`))
        .map((cat) => {
          const visibleQs = cat.questions.filter((q) => !hiddenSet.has(q.id))
          const catCustom = customQuestions.filter(
            (cq) => cq.sheet === sheet.name && cq.category === cat.name
          )

          const questions = [
            ...visibleQs.map((q) => {
              totalQ++
              const answerText = resolveAnswer(answers[q.id], q.question)
              const isAnswered = !!answerText && answerText !== ''
              if (isAnswered) answeredQ++
              const isMandatory = mandatorySet.has(q.id)
              if (isMandatory && !isAnswered) mandatoryUnanswered++

              return {
                id: q.id,
                question: q.question,
                description: q.description,
                type: 'textarea' as const,
                isCustom: false,
                isMandatory,
                answer: answerText,
                notes: answers[q.id + '_notes'] || '',
                attachments: buildAttachments(answers[q.id + '_attachments'], imageData),
              }
            }),
            ...catCustom.map((cq) => {
              totalQ++
              const answerText = resolveCustomAnswer(answers[cq.id], cq)
              const isAnswered = !!answerText && answerText !== ''
              if (isAnswered) answeredQ++
              const isMandatory = mandatorySet.has(cq.id)
              if (isMandatory && !isAnswered) mandatoryUnanswered++

              return {
                id: cq.id,
                question: cq.question,
                description: cq.description,
                type: cq.type,
                options: cq.options,
                isCustom: true,
                isMandatory,
                answer: answerText,
                notes: answers[cq.id + '_notes'] || '',
                attachments: buildAttachments(answers[cq.id + '_attachments'], imageData),
              }
            }),
          ]

          return { name: cat.name, isCustom: false, questions }
        }),

      // Custom categories
      ...sheetCustomCats.map((cc) => {
        const catCustom = customQuestions.filter((cq) => cq.category === cc.id)

        const questions = catCustom.map((cq) => {
          totalQ++
          const answerText = resolveCustomAnswer(answers[cq.id], cq)
          const isAnswered = !!answerText && answerText !== ''
          if (isAnswered) answeredQ++
          const isMandatory = mandatorySet.has(cq.id)
          if (isMandatory && !isAnswered) mandatoryUnanswered++

          return {
            id: cq.id,
            question: cq.question,
            description: cq.description,
            type: cq.type,
            options: cq.options,
            isCustom: true,
            isMandatory,
            answer: answerText,
            notes: answers[cq.id + '_notes'] || '',
            attachments: buildAttachments(answers[cq.id + '_attachments'], imageData),
          }
        })

        return { name: cc.name, isCustom: true, questions }
      }),
    ].filter((cat) => cat.questions.length > 0)

    return { name: sheet.name, categories: categoriesData }
  })

  const output = {
    exportedAt: new Date().toISOString(),
    project: {
      name: meta.projectName || '',
      client: meta.clientName || '',
      date: meta.date || '',
    },
    summary: {
      totalQuestions: totalQ,
      answered: answeredQ,
      unanswered: totalQ - answeredQ,
      mandatoryUnanswered,
    },
    sheets: sheetsData,
  }

  const json = JSON.stringify(output, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(meta.projectName || 'questionnaire').replace(/\s+/g, '_')}_${meta.date || 'export'}.json`
  a.click()
  URL.revokeObjectURL(url)
}
