'use client'

import type { Sheet } from '@/lib/parseExcel'
import type { ProjectData } from '@/lib/projectStorage'
import { isAnswered } from '@/lib/questionTypes'

type Props = {
  sheets: Sheet[]
  projectData: ProjectData
}

function DonutChart({
  pct,
  answered,
  total,
  size = 140,
}: {
  pct: number
  answered: number
  total: number
  size?: number
}) {
  const r = 48
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const dashOffset = circ - (pct / 100) * circ
  const color = pct === 100 ? '#22c55e' : pct >= 50 ? '#6366f1' : '#f59e0b'

  return (
    <svg width={size} height={size} className="overflow-visible">
      {/* Background track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-gray-200 dark:text-gray-700" />
      {/* Progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        strokeDashoffset={dashOffset}
        style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dashoffset 0.6s ease' }}
      />
      {/* Center label */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="700" fill={color}>
        {pct}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="currentColor" className="text-gray-500">
        {answered}/{total}
      </text>
    </svg>
  )
}

function MiniBar({ pct, color = '#6366f1' }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

export default function OverviewTab({ sheets, projectData }: Props) {
  const {
    answers,
    hiddenQuestions,
    hiddenCategories,
    hiddenSheets,
    customQuestions,
    customCategories,
    customSheets,
    mandatoryQuestions,
  } = projectData

  const hiddenSet = new Set(hiddenQuestions)
  const hiddenCatSet = new Set(hiddenCategories)
  const hiddenSheetSet = new Set(hiddenSheets)
  const mandatorySet = new Set(mandatoryQuestions)

  // ── Overall stats ──────────────────────────────────────────────────────
  let totalQ = 0
  let answeredQ = 0
  let mandatoryTotal = 0
  let mandatoryAnswered = 0

  // Built-in sheets
  for (const sheet of sheets) {
    if (hiddenSheetSet.has(sheet.name)) continue
    for (const cat of sheet.categories) {
      if (hiddenCatSet.has(`${sheet.name}::${cat.name}`)) continue
      for (const q of cat.questions) {
        if (hiddenSet.has(q.id)) continue
        totalQ++
        if (isAnswered(answers[q.id])) answeredQ++
        if (mandatorySet.has(q.id)) {
          mandatoryTotal++
          if (isAnswered(answers[q.id])) mandatoryAnswered++
        }
      }
    }
  }
  // Custom questions (all sheets)
  for (const cq of customQuestions) {
    totalQ++
    if (isAnswered(answers[cq.id])) answeredQ++
    if (mandatorySet.has(cq.id)) {
      mandatoryTotal++
      if (isAnswered(answers[cq.id])) mandatoryAnswered++
    }
  }

  const pctOverall = totalQ === 0 ? 0 : Math.round((answeredQ / totalQ) * 100)
  const mandatoryUnanswered = mandatoryTotal - mandatoryAnswered

  // ── Per-sheet stats ────────────────────────────────────────────────────
  type SheetStat = { name: string; answered: number; total: number; pct: number; isCustom?: boolean }

  const sheetStats: SheetStat[] = []

  for (const sheet of sheets) {
    if (hiddenSheetSet.has(sheet.name)) continue
    let sa = 0, st = 0
    for (const cat of sheet.categories) {
      if (hiddenCatSet.has(`${sheet.name}::${cat.name}`)) continue
      for (const q of cat.questions) {
        if (hiddenSet.has(q.id)) continue
        st++
        if (isAnswered(answers[q.id])) sa++
      }
    }
    const custQ = customQuestions.filter((cq) => cq.sheet === sheet.name)
    custQ.forEach((cq) => { st++; if (isAnswered(answers[cq.id])) sa++ })
    sheetStats.push({ name: sheet.name, answered: sa, total: st, pct: st === 0 ? 0 : Math.round((sa / st) * 100) })
  }

  for (const cs of customSheets) {
    let sa = 0, st = 0
    const custQ = customQuestions.filter((cq) => cq.sheet === cs.id)
    custQ.forEach((cq) => { st++; if (isAnswered(answers[cq.id])) sa++ })
    sheetStats.push({ name: cs.name, answered: sa, total: st, pct: st === 0 ? 0 : Math.round((sa / st) * 100), isCustom: true })
  }

  // ── Category breakdown ─────────────────────────────────────────────────
  type CatStat = { name: string; sheet: string; answered: number; total: number; pct: number }
  const catStats: CatStat[] = []

  for (const sheet of sheets) {
    if (hiddenSheetSet.has(sheet.name)) continue
    for (const cat of sheet.categories) {
      if (hiddenCatSet.has(`${sheet.name}::${cat.name}`)) continue
      const visQ = cat.questions.filter((q) => !hiddenSet.has(q.id))
      const catCust = customQuestions.filter((cq) => cq.sheet === sheet.name && cq.category === cat.name)
      const total = visQ.length + catCust.length
      if (total === 0) continue
      const ans = [...visQ.map((q) => answers[q.id]), ...catCust.map((cq) => answers[cq.id])].filter(isAnswered).length
      catStats.push({ name: cat.name, sheet: sheet.name, answered: ans, total, pct: Math.round((ans / total) * 100) })
    }
  }

  // Custom categories
  for (const cc of customCategories) {
    const catCust = customQuestions.filter((cq) => cq.category === cc.id)
    if (catCust.length === 0) continue
    const ans = catCust.map((cq) => answers[cq.id]).filter(isAnswered).length
    catStats.push({ name: cc.name, sheet: cc.sheet, answered: ans, total: catCust.length, pct: Math.round((ans / catCust.length) * 100) })
  }

  const done = catStats.filter((c) => c.pct === 100).length
  const inProgress = catStats.filter((c) => c.pct > 0 && c.pct < 100).length
  const notStarted = catStats.filter((c) => c.pct === 0).length

  // Count attachments
  const attachmentCount = Object.keys(answers).filter((k) => k.endsWith('_attachments') && answers[k] && answers[k] !== '[]').length

  const sheetBarColors = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6']

  return (
    <div className="space-y-6">
      {/* ── Top section: Donut + Stats ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Overall progress card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-6">
          <DonutChart pct={pctOverall} answered={answeredQ} total={totalQ} />
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Overall Progress</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {totalQ - answeredQ} question{totalQ - answeredQ !== 1 ? 's' : ''} remaining
            </p>
            {mandatoryTotal > 0 && (
              <div className={`text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 font-medium ${
                mandatoryUnanswered === 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                <span>{mandatoryUnanswered === 0 ? '✓' : '!'}</span>
                {mandatoryUnanswered === 0
                  ? `All ${mandatoryTotal} required answered`
                  : `${mandatoryUnanswered} of ${mandatoryTotal} required unanswered`}
              </div>
            )}
          </div>
        </div>

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Answered', value: answeredQ, sub: `of ${totalQ}`, color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Custom Q', value: customQuestions.length, sub: customCategories.length > 0 ? `${customCategories.length} custom cat.` : 'added', color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Required', value: mandatoryTotal, sub: `${mandatoryUnanswered} pending`, color: 'text-red-600 dark:text-red-400' },
            { label: 'Attachments', value: attachmentCount, sub: 'links & images', color: 'text-cyan-600 dark:text-cyan-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sheet completion ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Sheet Completion</h3>
        <div className="space-y-3">
          {sheetStats.map((ss, i) => (
            <div key={ss.name} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 dark:text-gray-400 w-24 shrink-0 truncate">
                {ss.name}
                {ss.isCustom && <span className="ml-1 text-purple-500 text-[10px]">custom</span>}
              </span>
              <MiniBar pct={ss.pct} color={sheetBarColors[i % sheetBarColors.length]} />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-10 text-right shrink-0">
                {ss.pct}%
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 w-14 text-right shrink-0">
                {ss.answered}/{ss.total}
              </span>
            </div>
          ))}
          {sheetStats.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No sheets visible</p>
          )}
        </div>
      </div>

      {/* ── Category status ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category Breakdown</h3>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />{done} done</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />{inProgress} partial</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 inline-block" />{notStarted} empty</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {catStats.map((cs) => (
            <div
              key={`${cs.sheet}::${cs.name}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${
                cs.pct === 100
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  : cs.pct > 0
                  ? 'border-indigo-100 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20'
                  : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  cs.pct === 100 ? 'bg-green-400' : cs.pct > 0 ? 'bg-indigo-400' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{cs.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{cs.sheet}</p>
              </div>
              <span className={`text-xs font-semibold shrink-0 ${
                cs.pct === 100 ? 'text-green-600 dark:text-green-400' : cs.pct > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {cs.answered}/{cs.total}
              </span>
            </div>
          ))}
          {catStats.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4 col-span-2">
              No categories yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
