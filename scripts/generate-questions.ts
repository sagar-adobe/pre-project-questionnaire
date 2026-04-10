/**
 * Build-time script: reads the Excel file, runs the same parseExcel logic,
 * and writes the result to public/questions.json so the static site can
 * fetch it on the client instead of relying on a Node.js server.
 *
 * Run via:  npx tsx scripts/generate-questions.ts
 * (automatically called by the prebuild / predev npm hooks)
 */

import * as XLSX from 'xlsx'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Sheet, Category } from '../lib/parseExcel'

// ── Inline the extra questions (mirrors parseExcel.ts) ───────────────────────

const EXTRA_QUESTIONS = {
  sheet: 'Project',
  category: 'Frontend Setup & Tooling',
  questions: [
    {
      question: 'Is TypeScript required? What strictness level is expected (strict, noImplicitAny, etc.)?',
      description: 'TypeScript strict mode catches many bugs early. Confirm the baseline config with the team.',
    },
    {
      question: 'What state management approach is preferred? (Redux Toolkit, Zustand, Context API, Jotai, TanStack Query for server state)',
      description: 'Misaligned state management choices cause rework. Agree before building the first component.',
    },
    {
      question: 'Are there preferred UI component libraries? (shadcn/ui, MUI, Ant Design, Radix, or fully custom)',
      description: 'Influences design system, bundle size, and theming strategy.',
    },
    {
      question: 'What bundler/build tool is expected? (Webpack, Vite, Turbopack, Parcel)',
      description: 'Affects dev server speed, config compatibility, and CI build times.',
    },
    {
      question: 'Is there a monorepo setup? (Turborepo, Nx, plain npm/yarn workspaces)',
      description: 'Monorepo structure affects how shared packages and apps are developed and deployed.',
    },
    {
      question: 'Are there environment variables that must be exposed to the browser (NEXT_PUBLIC_*)? Who owns and manages .env files?',
      description: 'Leaked secrets and missing vars are common deployment blockers.',
    },
    {
      question: 'What minimum code/test coverage percentage is expected? Which testing frameworks? (Jest, Vitest, Cypress, Playwright)',
      description: 'Setting coverage expectations early avoids last-minute scrambles before release.',
    },
    {
      question: 'Is there a design token / style dictionary pipeline already in place? Should tokens be auto-synced from Figma?',
      description: 'Determines whether CSS variables should come from a generated token file or be written manually.',
    },
  ],
}

// ── Excel parsing (same logic as lib/parseExcel.ts) ─────────────────────────

function sheetToCategories(ws: XLSX.WorkSheet, sheetName: string): Category[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
    header: ['category', 'question', 'answer', 'description'],
    defval: '',
  })

  const categories: Category[] = []
  let currentCategory: Category | null = null
  let categoryIdx = 0
  let questionIdx = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const cat = (row.category || '').trim().replace(/\n+/g, '')
    const q = (row.question || '').trim()
    const desc = (row.description || '').trim()

    if (!q) continue

    if (cat) {
      currentCategory = { name: cat, questions: [] }
      categories.push(currentCategory)
      categoryIdx = categories.length - 1
      questionIdx = 0
    }

    if (!currentCategory) continue

    currentCategory.questions.push({
      id: `${sheetName.toLowerCase()}-${categoryIdx}-${questionIdx}`,
      question: q,
      description: desc || undefined,
    })
    questionIdx++
  }

  return categories
}

async function main() {
  const filePath = join(process.cwd(), '..', 'Frontend_Developer_Questions.xlsx')
  const fileBuffer = require('fs').readFileSync(filePath)
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })

  const sheetOrder = ['Project', 'Design', 'Backend', 'Other']
  const sheets: Sheet[] = []

  for (const name of sheetOrder) {
    const wsName = workbook.SheetNames.find((n: string) => n === name)
    if (!wsName) continue
    const ws = workbook.Sheets[wsName]
    const categories = sheetToCategories(ws, name)

    if (name === 'Project') {
      categories.push({
        name: EXTRA_QUESTIONS.category,
        questions: EXTRA_QUESTIONS.questions.map((q, qi) => ({
          id: `project-extra-${qi}`,
          question: q.question,
          description: q.description,
        })),
      })
    }

    sheets.push({ name, categories })
  }

  const outDir = join(process.cwd(), 'public')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'questions.json'), JSON.stringify(sheets))
  console.log(`✓ Generated public/questions.json (${sheets.length} sheets, ${sheets.reduce((s, sh) => s + sh.categories.reduce((c, cat) => c + cat.questions.length, 0), 0)} questions)`)
}

main().catch((err) => { console.error(err); process.exit(1) })
