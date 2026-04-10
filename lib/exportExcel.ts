import ExcelJS from 'exceljs'
import type { Sheet } from './parseExcel'
import type { Meta } from './exportPdf'
import type { CustomQuestion, CustomCategory } from './projectStorage'
import { NA_VALUE, getQuestionType, formatAnswerForExport, parseCheckboxAnswer } from './questionTypes'
import { parseAttachments } from './attachmentStorage'

type ExportOptions = {
  hiddenQuestions?: string[]
  hiddenCategories?: string[]
  customQuestions?: CustomQuestion[]
  customCategories?: CustomCategory[]
  mandatoryQuestions?: string[]
}

function resolveAnswer(rawAnswer: string | undefined, questionText: string): string {
  if (!rawAnswer) return ''
  if (rawAnswer === NA_VALUE) return 'N/A'
  const typeConfig = getQuestionType(questionText)
  return formatAnswerForExport(rawAnswer, typeConfig)
}

function resolveCustomAnswer(rawAnswer: string | undefined, cq: CustomQuestion): string {
  if (!rawAnswer) return ''
  if (rawAnswer === NA_VALUE) return 'N/A'
  if (cq.type === 'checkbox') {
    const items = parseCheckboxAnswer(rawAnswer)
    return items.join(', ')
  }
  return rawAnswer.trim()
}

function buildLinksText(attachmentsJson: string | undefined): string {
  const attachments = parseAttachments(attachmentsJson)
  const links = attachments.filter((a) => a.type === 'link')
  const images = attachments.filter((a) => a.type === 'image')
  const parts: string[] = []
  if (links.length > 0) parts.push(links.map((l) => l.label ? `${l.label}: ${l.url}` : l.url!).join('\n'))
  if (images.length > 0) parts.push('Images: ' + images.map((i) => i.imageName ?? 'image').join(', '))
  return parts.join('\n')
}

export async function exportExcel(
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

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Dev Questionnaire App'
  workbook.created = new Date()

  // ── Info sheet ────────────────────────────────────────────────────────
  const cover = workbook.addWorksheet('Info')
  cover.getColumn('A').width = 30
  cover.getColumn('B').width = 60

  const titleRow = cover.addRow(['Developer Pre-Project Questionnaire', ''])
  titleRow.getCell(1).font = { bold: true, size: 16 }
  titleRow.height = 28

  cover.addRow([])
  cover.addRow(['Project Name', meta.projectName || ''])
  cover.addRow(['Client Name', meta.clientName || ''])
  cover.addRow(['Date', meta.date || ''])
  cover.addRow([])

  let totalQ = 0, answeredQ = 0, mandatoryUnanswered = 0

  sheets.forEach((s) =>
    s.categories.forEach((c) =>
      c.questions.filter((q) => !hiddenSet.has(q.id) && !hiddenCatSet.has(`${s.name}::${c.name}`)).forEach((q) => {
        totalQ++
        const ans = answers[q.id]
        const isAns = !!ans && ans !== NA_VALUE && ans.trim() !== '' && ans !== '[]'
        const isNA = ans === NA_VALUE
        if (isAns || isNA) answeredQ++
        if (mandatorySet.has(q.id) && !isAns && !isNA) mandatoryUnanswered++
      })
    )
  )
  customQuestions.forEach((cq) => {
    totalQ++
    const ans = answers[cq.id]
    const isAns = !!ans && ans !== NA_VALUE
    if (isAns) answeredQ++
    if (mandatorySet.has(cq.id) && !isAns) mandatoryUnanswered++
  })

  cover.addRow(['Total Questions (visible)', totalQ])
  cover.addRow(['Answered', answeredQ])
  cover.addRow(['Unanswered', totalQ - answeredQ])
  cover.addRow(['Required Unanswered', mandatoryUnanswered])
  cover.addRow(['Custom Questions Added', customQuestions.length])
  cover.addRow(['Questions Hidden', hiddenSet.size])

  ;[3, 4, 5, 7, 8, 9, 10, 11, 12].forEach((r) => {
    const row = cover.getRow(r)
    row.getCell(1).font = { bold: true }
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }
  })

  // ── One worksheet per sheet ───────────────────────────────────────────
  sheets.forEach((sheet) => {
    const ws = workbook.addWorksheet(sheet.name)

    const headerRow = ws.addRow(['Category', 'Question', 'Answer', 'Notes', 'Attachments', 'Type', 'Source', 'Required'])
    headerRow.height = 20
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF1E1B4B' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF6366F1' } } }
    })

    ws.getColumn('A').width = 28
    ws.getColumn('B').width = 55
    ws.getColumn('C').width = 40
    ws.getColumn('D').width = 25
    ws.getColumn('E').width = 35  // Attachments
    ws.getColumn('F').width = 16
    ws.getColumn('G').width = 12
    ws.getColumn('H').width = 10  // Required

    const sheetCustomCats = customCategories.filter((cc) => cc.sheet === sheet.name)

    sheet.categories.forEach((cat, ci) => {
      if (hiddenCatSet.has(`${sheet.name}::${cat.name}`)) return

      const catColor = ci % 2 === 0 ? 'FFF5F3FF' : 'FFF0F9FF'
      const visibleQs = cat.questions.filter((q) => !hiddenSet.has(q.id))
      const catCustom = customQuestions.filter(
        (cq) => cq.sheet === sheet.name && cq.category === cat.name
      )

      if (visibleQs.length === 0 && catCustom.length === 0) return

      // Regular questions
      visibleQs.forEach((q, qi) => {
        const answerText = resolveAnswer(answers[q.id], q.question)
        const notesText = answers[q.id + '_notes'] || ''
        const linksText = buildLinksText(answers[q.id + '_attachments'])
        const typeConfig = getQuestionType(q.question)
        const typeLabel = typeConfig.type === 'textarea' ? 'Text' : typeConfig.type === 'radio' ? 'Single choice' : 'Multi-select'
        const isMandatory = mandatorySet.has(q.id)

        const row = ws.addRow([
          qi === 0 ? cat.name : '',
          q.question,
          answerText,
          notesText,
          linksText,
          typeLabel,
          'Standard',
          isMandatory ? 'Yes' : '',
        ])
        row.height = 40
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'top', wrapText: true }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catColor } }
        })

        if (qi === 0) {
          row.getCell(1).font = { bold: true, color: { argb: 'FF4F46E5' } }
        }

        if (answerText && answerText !== 'N/A') {
          row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
        } else if (answerText === 'N/A') {
          row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
          row.getCell(3).font = { italic: true, color: { argb: 'FF9CA3AF' } }
        } else if (isMandatory) {
          row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
        }

        if (isMandatory) {
          row.getCell(8).font = { bold: true, color: { argb: 'FFDC2626' } }
        }
      })

      // Custom questions (highlighted amber)
      catCustom.forEach((cq, cqi) => {
        const answerText = resolveCustomAnswer(answers[cq.id], cq)
        const notesText = answers[cq.id + '_notes'] || ''
        const linksText = buildLinksText(answers[cq.id + '_attachments'])
        const typeLabel = cq.type === 'textarea' ? 'Text' : cq.type === 'radio' ? 'Single choice' : 'Multi-select'
        const isMandatory = mandatorySet.has(cq.id)

        const row = ws.addRow([
          visibleQs.length === 0 && cqi === 0 ? cat.name : '',
          cq.question,
          answerText,
          notesText,
          linksText,
          typeLabel,
          'Custom',
          isMandatory ? 'Yes' : '',
        ])
        row.height = 40
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'top', wrapText: true }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
        })

        if (visibleQs.length === 0 && cqi === 0) {
          row.getCell(1).font = { bold: true, color: { argb: 'FF4F46E5' } }
        }
        row.getCell(7).font = { italic: true, color: { argb: 'FFD97706' } }

        if (answerText && answerText !== 'N/A') {
          row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
        }

        if (isMandatory) {
          row.getCell(8).font = { bold: true, color: { argb: 'FFDC2626' } }
        }
      })

      ws.addRow([]) // spacer
    })

    // Custom categories
    sheetCustomCats.forEach((cc) => {
      const catCustom = customQuestions.filter((cq) => cq.category === cc.id)
      if (catCustom.length === 0) return

      catCustom.forEach((cq, cqi) => {
        const answerText = resolveCustomAnswer(answers[cq.id], cq)
        const notesText = answers[cq.id + '_notes'] || ''
        const linksText = buildLinksText(answers[cq.id + '_attachments'])
        const typeLabel = cq.type === 'textarea' ? 'Text' : cq.type === 'radio' ? 'Single choice' : 'Multi-select'
        const isMandatory = mandatorySet.has(cq.id)

        const row = ws.addRow([
          cqi === 0 ? `${cc.name} (Custom)` : '',
          cq.question,
          answerText,
          notesText,
          linksText,
          typeLabel,
          'Custom',
          isMandatory ? 'Yes' : '',
        ])
        row.height = 40
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'top', wrapText: true }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } }
        })

        if (cqi === 0) {
          row.getCell(1).font = { bold: true, color: { argb: 'FF7C3AED' } }
        }
        row.getCell(7).font = { italic: true, color: { argb: 'FFD97706' } }

        if (answerText && answerText !== 'N/A') {
          row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
        }

        if (isMandatory) {
          row.getCell(8).font = { bold: true, color: { argb: 'FFDC2626' } }
        }
      })

      ws.addRow([])
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(meta.projectName || 'questionnaire').replace(/\s+/g, '_')}_${meta.date || 'export'}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
