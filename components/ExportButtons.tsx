'use client'

import { useState, useRef, useEffect } from 'react'
import type { Sheet } from '@/lib/parseExcel'
import type { Meta } from '@/lib/exportPdf'
import type { CustomQuestion, CustomCategory } from '@/lib/projectStorage'
import { loadAllImages } from '@/lib/attachmentStorage'

type Props = {
  sheets: Sheet[]
  answers: Record<string, string>
  meta: Meta
  projectId: string
  hiddenQuestions?: string[]
  hiddenCategories?: string[]
  customQuestions?: CustomQuestion[]
  customCategories?: CustomCategory[]
  mandatoryQuestions?: string[]
}

export default function ExportButtons({
  sheets, answers, meta, projectId,
  hiddenQuestions = [], hiddenCategories = [],
  customQuestions = [], customCategories = [],
  mandatoryQuestions = [],
}: Props) {
  const [open, setOpen] = useState(false)
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const sharedOptions = { hiddenQuestions, hiddenCategories, customQuestions, customCategories, mandatoryQuestions }

  async function handleExport(format: string) {
    setLoadingFormat(format)
    setOpen(false)
    try {
      if (format === 'pdf') {
        const { exportPdf } = await import('@/lib/exportPdf')
        exportPdf(sheets, answers, meta, sharedOptions)
      } else if (format === 'excel') {
        const { exportExcel } = await import('@/lib/exportExcel')
        await exportExcel(sheets, answers, meta, sharedOptions)
      } else if (format === 'docx') {
        const { exportDocx } = await import('@/lib/exportDocx')
        await exportDocx(sheets, answers, meta, sharedOptions)
      } else if (format === 'json') {
        const { exportJson } = await import('@/lib/exportJson')
        const imageData = await loadAllImages(answers)
        exportJson(sheets, answers, meta, { ...sharedOptions, imageData })
      }
    } finally {
      setLoadingFormat(null)
    }
  }

  const formats = [
    {
      id: 'pdf',
      label: 'PDF',
      hint: 'Formatted document for sharing',
      color: 'text-red-600 dark:text-red-400',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'excel',
      label: 'Excel',
      hint: 'Spreadsheet with answers filled in',
      color: 'text-green-600 dark:text-green-400',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'docx',
      label: 'Word',
      hint: 'Editable Word document',
      color: 'text-blue-600 dark:text-blue-400',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'json',
      label: 'JSON Backup',
      hint: 'Full backup including images',
      color: 'text-gray-600 dark:text-gray-400',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
  ]

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loadingFormat !== null}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-60"
      >
        {loadingFormat ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        <span className="hidden sm:inline">Export</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <p className="px-3 pt-2.5 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Export as
          </p>
          {formats.map((f) => (
            <button
              key={f.id}
              onClick={() => handleExport(f.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className={f.color}>{f.icon}</span>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{f.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{f.hint}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
