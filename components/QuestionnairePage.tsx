'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import type { Sheet } from '@/lib/parseExcel'
import {
  getProject,
  saveProject,
  createProject,
  generateId,
  type ProjectData,
  type CustomQuestion,
  type CustomCategory,
  type CustomSheet,
} from '@/lib/projectStorage'
import { isAnswered } from '@/lib/questionTypes'
import TabNav, { type TabItem } from './TabNav'
import CategorySection from './CategorySection'
import ProgressBar from './ProgressBar'
import ProjectMetaForm from './ProjectMetaForm'
import ExportButtons from './ExportButtons'
import AddCustomCategoryForm from './AddCustomCategoryForm'
import OverviewTab from './OverviewTab'
import ThemeToggle from './ThemeToggle'

const TAB_ICONS: Record<string, string> = {
  Project: '📋',
  Design: '🎨',
  Backend: '⚙️',
  Other: '📝',
}

type AddTabFormState = { sheet: string } | null

type Props = {
  projectId: string
}

export default function QuestionnairePage({ projectId }: Props) {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [sheetsLoaded, setSheetsLoaded] = useState(false)
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [activeTabId, setActiveTabId] = useState<string>('overview')
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [addTabForm, setAddTabForm] = useState<AddTabFormState>(null)
  const [newTabName, setNewTabName] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch questions from the static JSON file (generated at build time from Excel)
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    fetch(`${base}/questions.json`)
      .then((r) => r.json())
      .then((data: Sheet[]) => { setSheets(data); setSheetsLoaded(true) })
      .catch(() => setSheetsLoaded(true)) // show UI even if fetch fails
  }, [])

  useEffect(() => {
    let data = getProject(projectId)
    if (!data) {
      const fresh = createProject()
      data = { ...fresh, meta: { ...fresh.meta, id: projectId } }
      saveProject(data)
    }
    setProjectData(data)
  }, [projectId])

  const debouncedSave = useCallback((data: ProjectData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveProject(data), 300)
  }, [])

  // ── Answer updates ────────────────────────────────────────────────────
  const handleAnswer = useCallback((id: string, value: string) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const updated: ProjectData = {
        ...prev,
        answers: { ...prev.answers, [id]: value },
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      debouncedSave(updated)
      return updated
    })
  }, [debouncedSave])

  const handleNotes = useCallback((id: string, value: string) => handleAnswer(id, value), [handleAnswer])

  // ── Meta ──────────────────────────────────────────────────────────────
  const handleMeta = useCallback((updated: { projectName: string; clientName: string; date: string }) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const next: ProjectData = { ...prev, meta: { ...prev.meta, ...updated, updatedAt: new Date().toISOString() } }
      saveProject(next)
      return next
    })
  }, [])

  // ── Questions: hide/unhide ────────────────────────────────────────────
  const handleHide = useCallback((id: string) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const next: ProjectData = {
        ...prev,
        hiddenQuestions: [...prev.hiddenQuestions.filter((q) => q !== id), id],
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      return next
    })
  }, [])

  const handleUnhide = useCallback((id: string) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const next: ProjectData = {
        ...prev,
        hiddenQuestions: prev.hiddenQuestions.filter((q) => q !== id),
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      return next
    })
  }, [])

  // ── Mandatory ─────────────────────────────────────────────────────────
  const handleToggleMandatory = useCallback((id: string) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const already = prev.mandatoryQuestions.includes(id)
      const next: ProjectData = {
        ...prev,
        mandatoryQuestions: already
          ? prev.mandatoryQuestions.filter((q) => q !== id)
          : [...prev.mandatoryQuestions, id],
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      return next
    })
  }, [])

  // ── Custom questions ──────────────────────────────────────────────────
  const handleAddCustom = useCallback((q: CustomQuestion) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const next: ProjectData = {
        ...prev,
        customQuestions: [...prev.customQuestions, q],
        mandatoryQuestions: q.required ? [...prev.mandatoryQuestions, q.id] : prev.mandatoryQuestions,
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      return next
    })
  }, [])

  const handleDeleteCustom = useCallback((id: string) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const next: ProjectData = {
        ...prev,
        customQuestions: prev.customQuestions.filter((q) => q.id !== id),
        mandatoryQuestions: prev.mandatoryQuestions.filter((q) => q !== id),
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      return next
    })
  }, [])

  // ── Categories: hide/unhide/add/delete ────────────────────────────────
  const handleHideCategory = useCallback((key: string) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const next: ProjectData = {
        ...prev,
        hiddenCategories: [...prev.hiddenCategories.filter((k) => k !== key), key],
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      return next
    })
  }, [])

  const handleUnhideCategory = useCallback((key: string) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const next: ProjectData = {
        ...prev,
        hiddenCategories: prev.hiddenCategories.filter((k) => k !== key),
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      return next
    })
  }, [])

  const handleAddCustomCategory = useCallback((sheet: string, name: string) => {
    const cc: CustomCategory = { id: generateId(), sheet, name }
    setProjectData((prev) => {
      if (!prev) return prev
      const next: ProjectData = {
        ...prev,
        customCategories: [...prev.customCategories, cc],
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      return next
    })
  }, [])

  const handleDeleteCustomCategory = useCallback((id: string) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const deletedIds = prev.customQuestions.filter((q) => q.category === id).map((q) => q.id)
      const next: ProjectData = {
        ...prev,
        customCategories: prev.customCategories.filter((cc) => cc.id !== id),
        customQuestions: prev.customQuestions.filter((q) => q.category !== id),
        mandatoryQuestions: prev.mandatoryQuestions.filter((q) => !deletedIds.includes(q)),
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      return next
    })
  }, [])

  // ── Sheets: hide/restore/add/rename/delete ────────────────────────────
  const handleHideSheet = useCallback((sheetName: string) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const next: ProjectData = {
        ...prev,
        hiddenSheets: [...(prev.hiddenSheets ?? []).filter((s) => s !== sheetName), sheetName],
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      // Switch away from the hidden tab
      setActiveTabId((cur) => cur === sheetName ? 'overview' : cur)
      return next
    })
  }, [])

  const handleRestoreAllSheets = useCallback(() => {
    setProjectData((prev) => {
      if (!prev) return prev
      const next: ProjectData = { ...prev, hiddenSheets: [], meta: { ...prev.meta, updatedAt: new Date().toISOString() } }
      saveProject(next)
      return next
    })
  }, [])

  const handleAddCustomSheet = useCallback((name: string) => {
    const cs: CustomSheet = { id: generateId(), name }
    setProjectData((prev) => {
      if (!prev) return prev
      const next: ProjectData = {
        ...prev,
        customSheets: [...(prev.customSheets ?? []), cs],
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      setActiveTabId(cs.id)
      return next
    })
  }, [])

  const handleRenameCustomSheet = useCallback((id: string, newName: string) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const next: ProjectData = {
        ...prev,
        customSheets: (prev.customSheets ?? []).map((cs) => cs.id === id ? { ...cs, name: newName } : cs),
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      return next
    })
  }, [])

  const handleDeleteCustomSheet = useCallback((id: string) => {
    setProjectData((prev) => {
      if (!prev) return prev
      const deletedQIds = prev.customQuestions.filter((q) => q.sheet === id).map((q) => q.id)
      const next: ProjectData = {
        ...prev,
        customSheets: (prev.customSheets ?? []).filter((cs) => cs.id !== id),
        customCategories: prev.customCategories.filter((cc) => cc.sheet !== id),
        customQuestions: prev.customQuestions.filter((q) => q.sheet !== id),
        mandatoryQuestions: prev.mandatoryQuestions.filter((q) => !deletedQIds.includes(q)),
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
      saveProject(next)
      setActiveTabId((cur) => cur === id ? 'overview' : cur)
      return next
    })
  }, [])

  // ── Loading ───────────────────────────────────────────────────────────
  if (!projectData || !sheetsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  const {
    answers, hiddenQuestions, customQuestions, customCategories,
    mandatoryQuestions, hiddenCategories, customSheets = [],
    hiddenSheets = [],
  } = projectData
  const hiddenSet = new Set(hiddenQuestions)
  const hiddenCatSet = new Set(hiddenCategories)
  const mandatorySet = new Set(mandatoryQuestions)
  const hiddenSheetSet = new Set(hiddenSheets)

  const visibleBuiltinSheets = sheets.filter((s) => !hiddenSheetSet.has(s.name))

  // ── Stats per sheet ───────────────────────────────────────────────────
  function countForSheet(sheet: Sheet) {
    const visibleRegular = sheet.categories
      .filter((cat) => !hiddenCatSet.has(`${sheet.name}::${cat.name}`))
      .flatMap((c) => c.questions)
      .filter((q) => !hiddenSet.has(q.id))
    const custom = customQuestions.filter((cq) => cq.sheet === sheet.name)
    const total = visibleRegular.length + custom.length
    const answered = [...visibleRegular.map((q) => answers[q.id]), ...custom.map((q) => answers[q.id])].filter(isAnswered).length
    return { total, answered }
  }

  function countForCustomSheet(sheetId: string) {
    const cqs = customQuestions.filter((cq) => cq.sheet === sheetId)
    return { total: cqs.length, answered: cqs.map((q) => answers[q.id]).filter(isAnswered).length }
  }

  const builtinStats = visibleBuiltinSheets.map(countForSheet)
  const customSheetStats = customSheets.map((cs) => countForCustomSheet(cs.id))

  const totalAll = [...builtinStats, ...customSheetStats].reduce((s, p) => s + p.total, 0)
  const answeredAll = [...builtinStats, ...customSheetStats].reduce((s, p) => s + p.answered, 0)

  // ── Tab items for TabNav ──────────────────────────────────────────────
  const tabItems: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: '📊', answered: answeredAll, total: totalAll, isOverview: true },
    ...visibleBuiltinSheets.map((s, i) => ({
      id: s.name,
      label: s.name,
      icon: TAB_ICONS[s.name] ?? '📄',
      answered: builtinStats[i].answered,
      total: builtinStats[i].total,
      isBuiltin: true,
    })),
    ...customSheets.map((cs, i) => ({
      id: cs.id,
      label: cs.name,
      icon: '📝',
      answered: customSheetStats[i].answered,
      total: customSheetStats[i].total,
      isCustom: true,
    })),
  ]

  // All tab IDs in order (for prev/next nav)
  const allTabIds = tabItems.map((t) => t.id)
  const currentTabIdx = allTabIds.indexOf(activeTabId)

  // ── Active tab content ─────────────────────────────────────────────────
  const isOverviewActive = activeTabId === 'overview'
  const activeBuiltinSheet = visibleBuiltinSheets.find((s) => s.name === activeTabId)
  const activeCustomSheet = customSheets.find((cs) => cs.id === activeTabId)

  // Question offset for numbering
  let catOffset = 0
  if (activeBuiltinSheet) {
    // Count all questions before this sheet
    for (let i = 0; i < visibleBuiltinSheets.indexOf(activeBuiltinSheet); i++) {
      catOffset += builtinStats[i].total
    }
  } else if (activeCustomSheet) {
    catOffset = builtinStats.reduce((s, p) => s + p.total, 0)
    for (let i = 0; i < customSheets.indexOf(activeCustomSheet); i++) {
      catOffset += customSheetStats[i].total
    }
  }

  const exportMeta = {
    projectName: projectData.meta.projectName,
    clientName: projectData.meta.clientName,
    date: projectData.meta.date,
  }

  const hiddenCatsForActiveSheet = activeBuiltinSheet
    ? activeBuiltinSheet.categories.filter((cat) => hiddenCatSet.has(`${activeBuiltinSheet.name}::${cat.name}`))
    : []

  const customCatsForActiveSheet = activeBuiltinSheet
    ? customCategories.filter((cc) => cc.sheet === activeBuiltinSheet.name)
    : activeCustomSheet
    ? customCategories.filter((cc) => cc.sheet === activeCustomSheet.id)
    : []

  function renderSheetContent(sheetId: string, sheet?: Sheet) {
    const currentCatOffset = { value: catOffset }

    return (
      <div>
        {/* Regular categories */}
        {sheet?.categories
          .filter((cat) => !hiddenCatSet.has(`${sheet.name}::${cat.name}`))
          .map((cat) => {
            const catCustom = customQuestions.filter(
              (cq) => cq.sheet === sheet.name && cq.category === cat.name
            )
            const offset = currentCatOffset.value
            const visibleInCat = cat.questions.filter((q) => !hiddenSet.has(q.id)).length
            currentCatOffset.value += visibleInCat + catCustom.length

            return (
              <CategorySection
                key={cat.name}
                sheet={sheet.name}
                category={cat}
                answers={answers}
                hiddenQuestions={hiddenSet}
                customQuestions={catCustom}
                questionOffset={offset}
                projectId={projectId}
                mandatoryQuestions={mandatorySet}
                onChange={handleAnswer}
                onNotes={handleNotes}
                onHide={handleHide}
                onUnhide={handleUnhide}
                onAddCustom={handleAddCustom}
                onDeleteCustom={handleDeleteCustom}
                onToggleMandatory={handleToggleMandatory}
                onHideCategory={handleHideCategory}
              />
            )
          })}

        {/* Custom categories for this sheet */}
        {customCatsForActiveSheet.map((cc) => {
          const catCustom = customQuestions.filter((cq) => cq.category === cc.id)
          const offset = currentCatOffset.value
          currentCatOffset.value += catCustom.length

          return (
            <CategorySection
              key={cc.id}
              sheet={sheetId}
              category={{ name: cc.name, questions: [] }}
              answers={answers}
              hiddenQuestions={hiddenSet}
              customQuestions={catCustom}
              questionOffset={offset}
              projectId={projectId}
              mandatoryQuestions={mandatorySet}
              isCustomCategory
              customCategoryId={cc.id}
              onChange={handleAnswer}
              onNotes={handleNotes}
              onHide={handleHide}
              onUnhide={handleUnhide}
              onAddCustom={handleAddCustom}
              onDeleteCustom={handleDeleteCustom}
              onToggleMandatory={handleToggleMandatory}
              onDeleteCustomCategory={handleDeleteCustomCategory}
            />
          )
        })}

        {/* Add custom category */}
        {showAddCategory ? (
          <AddCustomCategoryForm
            sheet={sheetId}
            onSave={(name) => {
              handleAddCustomCategory(sheetId, name)
              setShowAddCategory(false)
            }}
            onCancel={() => setShowAddCategory(false)}
          />
        ) : (
          <button
            onClick={() => setShowAddCategory(true)}
            className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-3 py-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all w-full justify-center"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add custom category
          </button>
        )}

        {/* Restore hidden categories */}
        {hiddenCatsForActiveSheet.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              {hiddenCatsForActiveSheet.length} hidden categor{hiddenCatsForActiveSheet.length !== 1 ? 'ies' : 'y'}:
            </p>
            <div className="space-y-1">
              {hiddenCatsForActiveSheet.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500 line-through">{cat.name}</span>
                  <button
                    onClick={() => handleUnhideCategory(`${sheet?.name ?? sheetId}::${cat.name}`)}
                    className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const activeSheetStats = activeBuiltinSheet
    ? countForSheet(activeBuiltinSheet)
    : activeCustomSheet
    ? countForCustomSheet(activeCustomSheet.id)
    : null

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors"
                title="All projects"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                  {projectData.meta.projectName || 'Unnamed Project'}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {projectData.meta.clientName || 'No client set'} · Dev Pre-Project Questionnaire
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:block w-40">
                <ProgressBar answered={answeredAll} total={totalAll} />
              </div>
              <ThemeToggle />
              <ExportButtons
                sheets={sheets}
                answers={answers}
                meta={exportMeta}
                hiddenQuestions={hiddenQuestions}
                hiddenCategories={hiddenCategories}
                customQuestions={customQuestions}
                customCategories={customCategories}
                mandatoryQuestions={mandatoryQuestions}
                projectId={projectId}
              />
            </div>
          </div>
          <div className="sm:hidden mb-2">
            <ProgressBar answered={answeredAll} total={totalAll} />
          </div>
          <TabNav
            items={tabItems}
            activeId={activeTabId}
            hiddenBuiltinCount={hiddenSheets.length}
            onSelect={(id) => { setActiveTabId(id); setShowAddCategory(false) }}
            onAddTab={() => {
              setAddTabForm({ sheet: 'new' })
              setNewTabName('')
            }}
            onRenameTab={handleRenameCustomSheet}
            onDeleteTab={handleDeleteCustomSheet}
            onHideTab={handleHideSheet}
            onRestoreAllTabs={handleRestoreAllSheets}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">

        {/* Add tab inline form */}
        {addTabForm && (
          <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-3">New custom tab</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="e.g. Infrastructure, Security, Compliance..."
                className="flex-1 text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTabName.trim()) {
                    handleAddCustomSheet(newTabName.trim())
                    setAddTabForm(null)
                  }
                  if (e.key === 'Escape') setAddTabForm(null)
                }}
              />
              <button
                onClick={() => {
                  if (newTabName.trim()) {
                    handleAddCustomSheet(newTabName.trim())
                    setAddTabForm(null)
                  }
                }}
                disabled={!newTabName.trim()}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-40 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setAddTabForm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Overview tab */}
        {isOverviewActive && (
          <>
            <ProjectMetaForm meta={exportMeta} onChange={handleMeta} />
            <OverviewTab sheets={sheets} projectData={projectData} />
          </>
        )}

        {/* Built-in sheet tab */}
        {activeBuiltinSheet && (
          <>
            <ProjectMetaForm meta={exportMeta} onChange={handleMeta} />
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{activeBuiltinSheet.name} Questions</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeBuiltinSheet.categories.length} categories · {activeSheetStats?.total ?? 0} visible questions
                  {hiddenSet.size > 0 && <span className="text-gray-400 dark:text-gray-500"> · {hiddenSet.size} hidden</span>}
                  {mandatorySet.size > 0 && <span className="text-red-400"> · {mandatorySet.size} required</span>}
                </p>
              </div>
              <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                {activeSheetStats?.answered ?? 0}/{activeSheetStats?.total ?? 0} answered
              </div>
            </div>
            {renderSheetContent(activeBuiltinSheet.name, activeBuiltinSheet)}
          </>
        )}

        {/* Custom sheet tab */}
        {activeCustomSheet && (
          <>
            <ProjectMetaForm meta={exportMeta} onChange={handleMeta} />
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {activeCustomSheet.name}
                  <span className="ml-2 text-sm font-medium text-purple-500 dark:text-purple-400">Custom Tab</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeSheetStats?.total ?? 0} questions
                </p>
              </div>
              <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                {activeSheetStats?.answered ?? 0}/{activeSheetStats?.total ?? 0} answered
              </div>
            </div>
            {renderSheetContent(activeCustomSheet.id)}
          </>
        )}

        {/* Bottom navigation */}
        <div className="flex justify-between mt-8 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => currentTabIdx > 0 && setActiveTabId(allTabIds[currentTabIdx - 1])}
            disabled={currentTabIdx <= 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500 self-center">{currentTabIdx + 1} / {allTabIds.length}</span>
          <button
            onClick={() => currentTabIdx < allTabIds.length - 1 && setActiveTabId(allTabIds[currentTabIdx + 1])}
            disabled={currentTabIdx >= allTabIds.length - 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
        Answers auto-saved · Hover a question for actions (hide, mark required, delete)
      </footer>
    </div>
  )
}
