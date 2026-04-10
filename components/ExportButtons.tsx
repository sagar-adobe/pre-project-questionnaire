'use client'

import { useState } from 'react'
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
  const [pdfLoading, setPdfLoading] = useState(false)
  const [xlsxLoading, setXlsxLoading] = useState(false)
  const [jsonLoading, setJsonLoading] = useState(false)
  const [docxLoading, setDocxLoading] = useState(false)

  const sharedOptions = {
    hiddenQuestions,
    hiddenCategories,
    customQuestions,
    customCategories,
    mandatoryQuestions,
  }

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      const { exportPdf } = await import('@/lib/exportPdf')
      exportPdf(sheets, answers, meta, sharedOptions)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleExcel = async () => {
    setXlsxLoading(true)
    try {
      const { exportExcel } = await import('@/lib/exportExcel')
      await exportExcel(sheets, answers, meta, sharedOptions)
    } finally {
      setXlsxLoading(false)
    }
  }

  const handleJson = async () => {
    setJsonLoading(true)
    try {
      const { exportJson } = await import('@/lib/exportJson')
      // Pre-load all images from IndexedDB so they're embedded in the JSON
      const imageData = await loadAllImages(answers)
      exportJson(sheets, answers, meta, { ...sharedOptions, imageData })
    } finally {
      setJsonLoading(false)
    }
  }

  const handleDocx = async () => {
    setDocxLoading(true)
    try {
      const { exportDocx } = await import('@/lib/exportDocx')
      await exportDocx(sheets, answers, meta, sharedOptions)
    } finally {
      setDocxLoading(false)
    }
  }

  type BtnProps = {
    onClick: () => void
    loading: boolean
    color: string
    hoverColor: string
    icon: React.ReactNode
    label: string
  }

  function Btn({ onClick, loading, color, hoverColor, icon, label }: BtnProps) {
    return (
      <button
        onClick={onClick}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${color} ${hoverColor} text-white rounded-lg transition-colors disabled:opacity-60 shadow-sm`}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : icon}
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  return (
    <div className="flex gap-1.5">
      <Btn
        onClick={handlePdf}
        loading={pdfLoading}
        color="bg-red-600"
        hoverColor="hover:bg-red-700"
        label="PDF"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        }
      />
      <Btn
        onClick={handleExcel}
        loading={xlsxLoading}
        color="bg-green-600"
        hoverColor="hover:bg-green-700"
        label="Excel"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />
      <Btn
        onClick={handleDocx}
        loading={docxLoading}
        color="bg-blue-600"
        hoverColor="hover:bg-blue-700"
        label="Word"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />
      <Btn
        onClick={handleJson}
        loading={jsonLoading}
        color="bg-gray-700"
        hoverColor="hover:bg-gray-800"
        label="JSON"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        }
      />
    </div>
  )
}
