import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
} from 'docx'
import type { Sheet } from './parseExcel'
import type { Meta } from './exportPdf'
import type { CustomQuestion, CustomCategory } from './projectStorage'
import { NA_VALUE, getQuestionType, formatAnswerForExport } from './questionTypes'
import { parseAttachments } from './attachmentStorage'

type ExportOptions = {
  hiddenQuestions?: string[]
  hiddenCategories?: string[]
  customQuestions?: CustomQuestion[]
  customCategories?: CustomCategory[]
  mandatoryQuestions?: string[]
}

function resolveAnswer(rawAnswer: string | undefined, questionText: string): string {
  if (!rawAnswer || rawAnswer.trim() === '' || rawAnswer === '[]') return '—'
  if (rawAnswer === NA_VALUE) return 'N/A'
  return formatAnswerForExport(rawAnswer, getQuestionType(questionText))
}

function resolveCustomAnswer(rawAnswer: string | undefined, cq: CustomQuestion): string {
  if (!rawAnswer || rawAnswer.trim() === '' || rawAnswer === '[]') return '—'
  if (rawAnswer === NA_VALUE) return 'N/A'
  const cfg = cq.type === 'textarea'
    ? { type: 'textarea' as const }
    : { type: cq.type, options: cq.options ?? [] }
  return formatAnswerForExport(rawAnswer, cfg)
}

function buildAnswerText(
  answerText: string,
  notes: string | undefined,
  attachmentsJson: string | undefined
): string {
  let text = answerText
  if (notes?.trim()) text += `\n[Notes: ${notes.trim()}]`
  const attachments = parseAttachments(attachmentsJson)
  const links = attachments.filter((a) => a.type === 'link')
  const images = attachments.filter((a) => a.type === 'image')
  if (links.length > 0) {
    text += '\n[Links: ' + links.map((l) => l.label ? `${l.label} (${l.url})` : l.url).join(', ') + ']'
  }
  if (images.length > 0) {
    text += '\n[Images: ' + images.map((i) => i.imageName ?? 'image').join(', ') + ']'
  }
  return text
}

function makeHeaderRow(): TableRow {
  const cellStyle = {
    shading: { type: ShadingType.SOLID, color: 'E0E7FF', fill: 'E0E7FF' },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  }
  return new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        ...cellStyle,
        width: { size: 45, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: 'Question', bold: true, color: '312E81', size: 18 })],
        })],
      }),
      new TableCell({
        ...cellStyle,
        width: { size: 40, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: 'Answer', bold: true, color: '312E81', size: 18 })],
        })],
      }),
      new TableCell({
        ...cellStyle,
        width: { size: 15, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: 'Flags', bold: true, color: '312E81', size: 18 })],
        })],
      }),
    ],
  })
}

function makeQuestionRow(
  questionText: string,
  answerText: string,
  isMandatory: boolean,
  isCustom: boolean,
  isAnswered: boolean
): TableRow {
  const flags: string[] = []
  if (isMandatory) flags.push('Required')
  if (isCustom) flags.push('Custom')

  const rowBg = isAnswered ? 'F0FDF4' : isMandatory ? 'FFF1F1' : 'FFFFFF'

  const cellStyle = {
    shading: { type: ShadingType.SOLID, color: rowBg, fill: rowBg },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
  }

  const questionRuns: TextRun[] = [
    new TextRun({ text: questionText, size: 17 }),
  ]
  if (isMandatory) {
    questionRuns.push(new TextRun({ text: ' *', bold: true, color: 'DC2626', size: 17 }))
  }

  // Split answer on newlines for multi-paragraph rendering
  const answerLines = answerText.split('\n')
  const answerParagraphs = answerLines.map((line, i) =>
    new Paragraph({
      children: [new TextRun({
        text: line,
        size: 17,
        color: answerText === '—' ? '9CA3AF' : '111827',
        italics: line.startsWith('['),
      })],
      spacing: i === 0 ? {} : { before: 40 },
    })
  )

  return new TableRow({
    children: [
      new TableCell({
        ...cellStyle,
        width: { size: 45, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: questionRuns })],
      }),
      new TableCell({
        ...cellStyle,
        width: { size: 40, type: WidthType.PERCENTAGE },
        children: answerParagraphs,
      }),
      new TableCell({
        ...cellStyle,
        width: { size: 15, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: flags.map((f, i) => new TextRun({
            text: (i > 0 ? ' · ' : '') + f,
            size: 15,
            color: f === 'Required' ? 'DC2626' : 'D97706',
            bold: true,
          })),
        })],
      }),
    ],
  })
}

export async function exportDocx(
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

  let totalQ = 0
  let answeredQ = 0

  const children: (Paragraph | Table)[] = []

  // ── Cover section ─────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      text: 'Developer Pre-Project Questionnaire',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: meta.projectName || 'Untitled Project', bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Client: ${meta.clientName || '—'}   ·   Date: ${meta.date || '—'}`, size: 20, color: '6B7280' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  // ── Sheets ────────────────────────────────────────────────────────────────
  for (const sheet of sheets) {
    const sheetCustomCats = customCategories.filter((cc) => cc.sheet === sheet.name)

    children.push(
      new Paragraph({
        text: `${sheet.name} Questions`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        pageBreakBefore: children.length > 3,
      })
    )

    const allCats: { name: string; rows: TableRow[] }[] = []

    // Regular categories
    for (const cat of sheet.categories) {
      if (hiddenCatSet.has(`${sheet.name}::${cat.name}`)) continue

      const visibleQs = cat.questions.filter((q) => !hiddenSet.has(q.id))
      const catCustom = customQuestions.filter(
        (cq) => cq.sheet === sheet.name && cq.category === cat.name
      )
      if (visibleQs.length === 0 && catCustom.length === 0) continue

      const rows: TableRow[] = [makeHeaderRow()]

      for (const q of visibleQs) {
        totalQ++
        const ans = resolveAnswer(answers[q.id], q.question)
        const isAns = ans !== '—'
        if (isAns) answeredQ++
        const ansText = buildAnswerText(ans, answers[q.id + '_notes'], answers[q.id + '_attachments'])
        rows.push(makeQuestionRow(q.question, ansText, mandatorySet.has(q.id), false, isAns))
      }

      for (const cq of catCustom) {
        totalQ++
        const ans = resolveCustomAnswer(answers[cq.id], cq)
        const isAns = ans !== '—'
        if (isAns) answeredQ++
        const ansText = buildAnswerText(ans, answers[cq.id + '_notes'], answers[cq.id + '_attachments'])
        rows.push(makeQuestionRow(`[Custom] ${cq.question}`, ansText, mandatorySet.has(cq.id), true, isAns))
      }

      allCats.push({ name: cat.name, rows })
    }

    // Custom categories
    for (const cc of sheetCustomCats) {
      const catCustom = customQuestions.filter((cq) => cq.category === cc.id)
      if (catCustom.length === 0) continue

      const rows: TableRow[] = [makeHeaderRow()]
      for (const cq of catCustom) {
        totalQ++
        const ans = resolveCustomAnswer(answers[cq.id], cq)
        const isAns = ans !== '—'
        if (isAns) answeredQ++
        const ansText = buildAnswerText(ans, answers[cq.id + '_notes'], answers[cq.id + '_attachments'])
        rows.push(makeQuestionRow(`[Custom] ${cq.question}`, ansText, mandatorySet.has(cq.id), true, isAns))
      }

      allCats.push({ name: `${cc.name} (Custom Category)`, rows })
    }

    for (const { name, rows } of allCats) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: name, bold: true, color: '4F46E5', size: 22 })],
          spacing: { before: 300, after: 100 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          },
          rows,
        })
      )
    }
  }

  // Add summary at top (after cover)
  const summaryPara = new Paragraph({
    children: [
      new TextRun({ text: `${answeredQ} of ${totalQ} questions answered`, size: 20, color: '6B7280' }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
  })
  children.splice(3, 0, summaryPara)

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      children,
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(meta.projectName || 'questionnaire').replace(/\s+/g, '_')}_${meta.date || 'export'}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
