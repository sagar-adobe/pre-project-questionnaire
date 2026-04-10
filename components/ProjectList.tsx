'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllProjects, createProject, deleteProject, type ProjectData } from '@/lib/projectStorage'
import { isAnswered } from '@/lib/questionTypes'
import { exportProjectBackup, importProjectBackup } from '@/lib/projectBackup'
import ThemeToggle from './ThemeToggle'

export default function ProjectList() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setProjects(getAllProjects())
    setHydrated(true)
  }, [])

  function handleNew() {
    const project = createProject()
    router.push(`/?project=${project.meta.id}`)
  }

  function handleOpen(id: string) {
    router.push(`/?project=${id}`)
  }

  function handleDelete(id: string) {
    deleteProject(id)
    setProjects((prev) => prev.filter((p) => p.meta.id !== id))
    setDeletingId(null)
  }

  async function handleExport(e: React.MouseEvent, project: ProjectData) {
    e.stopPropagation()
    setExportingId(project.meta.id)
    try {
      await exportProjectBackup(project)
    } finally {
      setExportingId(null)
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true)
    setImportError(null)
    try {
      await importProjectBackup(file)
      setProjects(getAllProjects())
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setImporting(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  function getAnswerCount(project: ProjectData): number {
    return Object.values(project.answers).filter(isAnswered).length
  }

  function formatDate(iso: string): string {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return iso
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">Dev Pre-Project Questionnaire</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">Capture the right answers before starting a project</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />

            {/* Import button */}
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              title="Import project from backup JSON"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
            >
              {importing ? (
                <span className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
              <span className="hidden sm:inline">{importing ? 'Importing…' : 'Import'}</span>
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImportFile(file)
              }}
            />

            <button
              onClick={handleNew}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
        {/* Import error banner */}
        {importError && (
          <div className="max-w-4xl mx-auto px-4 pb-3">
            <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
              <span>{importError}</span>
              <button onClick={() => setImportError(null)} className="shrink-0 text-red-400 hover:text-red-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {projects.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No projects yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto text-sm">
              Create your first project to start capturing pre-development answers from your client.
            </p>
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create first project
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((project) => {
                const answerCount = getAnswerCount(project)
                const customCount = project.customQuestions?.length ?? 0
                const hiddenCount = project.hiddenQuestions?.length ?? 0
                const isConfirmingDelete = deletingId === project.meta.id
                const isExporting = exportingId === project.meta.id

                return (
                  <div
                    key={project.meta.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all cursor-pointer group"
                    onClick={() => !isConfirmingDelete && handleOpen(project.meta.id)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {project.meta.projectName || 'Unnamed Project'}
                        </h3>
                        {project.meta.clientName && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{project.meta.clientName}</p>
                        )}
                      </div>
                      {/* Actions */}
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Delete?</span>
                          <button
                            onClick={() => handleDelete(project.meta.id)}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => e.stopPropagation()}>
                          {/* Export backup */}
                          <button
                            onClick={(e) => handleExport(e, project)}
                            disabled={isExporting}
                            className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all disabled:opacity-50"
                            title="Export project backup (JSON)"
                          >
                            {isExporting ? (
                              <span className="w-4 h-4 block border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            )}
                          </button>
                          {/* Delete */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingId(project.meta.id) }}
                            className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Delete project"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                      <span>{formatDate(project.meta.updatedAt)}</span>
                      <span>·</span>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">{answerCount} answered</span>
                      {customCount > 0 && (
                        <>
                          <span>·</span>
                          <span>{customCount} custom Q</span>
                        </>
                      )}
                      {hiddenCount > 0 && (
                        <>
                          <span>·</span>
                          <span>{hiddenCount} hidden</span>
                        </>
                      )}
                    </div>

                    <div className="mt-3">
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:underline">
                        Open project →
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
