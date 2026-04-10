import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Sheet } from './parseExcel'
import type { CustomQuestion, CustomCategory } from './projectStorage'
import { NA_VALUE, getQuestionType, formatAnswerForExport } from './questionTypes'
import { parseAttachments } from './attachmentStorage'

export type Meta = {
  projectName: string
  clientName: string
  date: string
}

type ExportOptions = {
  hiddenQuestions?: string[]
  hiddenCategories?: string[]
  customQuestions?: CustomQuestion[]
  customCategories?: CustomCategory[]
  mandatoryQuestions?: string[]
}

function getAnswerText(rawAnswer: string | undefined, rawNotes: string | undefined, questionText: string, attachmentsJson: string | undefined): string {
  if (!rawAnswer) return '—'
  const typeConfig = getQuestionType(questionText)
  const main = formatAnswerForExport(rawAnswer, typeConfig)
  let text = main
  if (rawNotes?.trim()) text += `\n[Notes: ${rawNotes.trim()}]`
  const attachments = parseAttachments(attachmentsJson)
  const links = attachments.filter((a) => a.type === 'link')
  const images = attachments.filter((a) => a.type === 'image')
  if (links.length > 0) text += '\n[Links: ' + links.map((l) => l.label ? `${l.label}: ${l.url}` : l.url).join(', ') + ']'
  if (images.length > 0) text += '\n[Images: ' + images.map((i) => i.imageName ?? 'image').join(', ') + ']'
  return text
}

function getCustomAnswerText(rawAnswer: string | undefined, rawNotes: string | undefined, cq: CustomQuestion, attachmentsJson: string | undefined): string {
  if (!rawAnswer) return '—'
  if (rawAnswer === NA_VALUE) return 'N/A'
  const typeConfig = cq.type === 'textarea'
    ? { type: 'textarea' as const }
    : { type: cq.type, options: cq.options ?? [] }
  const main = formatAnswerForExport(rawAnswer, typeConfig)
  let text = main
  if (rawNotes?.trim()) text += `\n[Notes: ${rawNotes.trim()}]`
  const attachments = parseAttachments(attachmentsJson)
  const links = attachments.filter((a) => a.type === 'link')
  const images = attachments.filter((a) => a.type === 'image')
  if (links.length > 0) text += '\n[Links: ' + links.map((l) => l.label ? `${l.label}: ${l.url}` : l.url).join(', ') + ']'
  if (images.length > 0) text += '\n[Images: ' + images.map((i) => i.imageName ?? 'image').join(', ') + ']'
  return text
}

export function exportPdf(
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

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // ── Cover block ────────────────────────────────────────────────────────
  doc.setFillColor(17, 24, 39)
  doc.rect(0, 0, pageWidth, 60, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Developer Pre-Project Questionnaire', pageWidth / 2, 24, { align: 'center' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(meta.projectName || 'Untitled Project', pageWidth / 2, 37, { align: 'center' })
  doc.text(`Client: ${meta.clientName || '—'}   ·   Date: ${meta.date || '—'}`, pageWidth / 2, 45, { align: 'center' })

  // Stats
  let totalQ = 0
  let answeredQ = 0
  let mandatoryUnanswered = 0

  sheets.forEach((s) =>
    s.categories.forEach((c) =>
      c.questions.forEach((q) => {
        if (hiddenSet.has(q.id)) return
        if (hiddenCatSet.has(`${s.name}::${c.name}`)) return
        totalQ++
        const ans = answers[q.id]
        const isAns = ans && ans !== NA_VALUE && ans.trim() !== '' && ans !== '[]'
        const isNA = ans === NA_VALUE
        if (isAns || isNA) answeredQ++
        if (mandatorySet.has(q.id) && !isAns && !isNA) mandatoryUnanswered++
      })
    )
  )
  customQuestions.forEach((cq) => {
    totalQ++
    const ans = answers[cq.id]
    const isAns = ans && ans !== NA_VALUE
    if (isAns) answeredQ++
    if (mandatorySet.has(cq.id) && !isAns) mandatoryUnanswered++
  })

  doc.setTextColor(156, 163, 175)
  doc.setFontSize(9)
  let summaryLine = `${answeredQ} of ${totalQ} questions answered`
  if (mandatoryUnanswered > 0) summaryLine += `  ·  ${mandatoryUnanswered} required unanswered`
  doc.text(summaryLine, pageWidth / 2, 53, { align: 'center' })

  let yPos = 70

  sheets.forEach((sheet) => {
    if (yPos > 250) { doc.addPage(); yPos = 20 }

    doc.setTextColor(17, 24, 39)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`${sheet.name} Questions`, 14, yPos)
    yPos += 6

    const sheetCustomCats = customCategories.filter((cc) => cc.sheet === sheet.name)

    sheet.categories.forEach((cat) => {
      if (hiddenCatSet.has(`${sheet.name}::${cat.name}`)) return

      const visibleQs = cat.questions.filter((q) => !hiddenSet.has(q.id))
      const catCustom = customQuestions.filter(
        (cq) => cq.sheet === sheet.name && cq.category === cat.name
      )

      if (visibleQs.length === 0 && catCustom.length === 0) return

      if (yPos > 260) { doc.addPage(); yPos = 20 }

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(79, 70, 229)
      doc.text(cat.name, 14, yPos)
      yPos += 4

      const tableRows = [
        ...visibleQs.map((q) => {
          const label = mandatorySet.has(q.id) ? `${q.question} *` : q.question
          return [label, getAnswerText(answers[q.id], answers[q.id + '_notes'], q.question, answers[q.id + '_attachments'])]
        }),
        ...catCustom.map((cq) => {
          const label = `[Custom] ${cq.question}${mandatorySet.has(cq.id) ? ' *' : ''}`
          return [label, getCustomAnswerText(answers[cq.id], answers[cq.id + '_notes'], cq, answers[cq.id + '_attachments'])]
        }),
      ]

      autoTable(doc, {
        startY: yPos,
        head: [['Question', 'Answer']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [238, 242, 255], textColor: [49, 46, 129], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
        columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 75 } },
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
          doc.setFontSize(8)
          doc.setTextColor(156, 163, 175)
          doc.text(`Page ${pageCount}`, pageWidth - 20, 290)
        },
      })

      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    })

    // Custom categories
    sheetCustomCats.forEach((cc) => {
      const catCustom = customQuestions.filter((cq) => cq.category === cc.id)
      if (catCustom.length === 0) return

      if (yPos > 260) { doc.addPage(); yPos = 20 }

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(124, 58, 237)
      doc.text(`${cc.name} (Custom)`, 14, yPos)
      yPos += 4

      const tableRows = catCustom.map((cq) => {
        const label = `[Custom] ${cq.question}${mandatorySet.has(cq.id) ? ' *' : ''}`
        return [label, getCustomAnswerText(answers[cq.id], answers[cq.id + '_notes'], cq, answers[cq.id + '_attachments'])]
      })

      autoTable(doc, {
        startY: yPos,
        head: [['Question', 'Answer']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [245, 243, 255], textColor: [88, 28, 135], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
        columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 75 } },
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
          doc.setFontSize(8)
          doc.setTextColor(156, 163, 175)
          doc.text(`Page ${pageCount}`, pageWidth - 20, 290)
        },
      })

      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    })

    yPos += 4
  })

  const filename = `${(meta.projectName || 'questionnaire').replace(/\s+/g, '_')}_${meta.date || 'export'}.pdf`
  doc.save(filename)
}
