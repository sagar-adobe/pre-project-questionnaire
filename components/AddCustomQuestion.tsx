'use client'

import { useState } from 'react'
import type { FieldType } from '@/lib/questionTypes'
import type { CustomQuestion } from '@/lib/projectStorage'
import { generateId } from '@/lib/projectStorage'

type Props = {
  sheet: string
  category: string
  onSave: (q: CustomQuestion) => void
  onCancel: () => void
}

const TYPE_OPTIONS: { value: FieldType; label: string; hint: string }[] = [
  { value: 'textarea', label: 'Text (open-ended)', hint: 'Client types a free-form answer' },
  { value: 'radio', label: 'Yes / No (single choice)', hint: 'Client picks one option from a list' },
  { value: 'checkbox', label: 'Multiple choice', hint: 'Client picks one or more options' },
]

const DEFAULT_RADIO_OPTIONS = ['Yes', 'No', 'TBD']

export default function AddCustomQuestion({ sheet, category, onSave, onCancel }: Props) {
  const [questionText, setQuestionText] = useState('')
  const [description, setDescription] = useState('')
  const [fieldType, setFieldType] = useState<FieldType>('textarea')
  const [optionsRaw, setOptionsRaw] = useState(DEFAULT_RADIO_OPTIONS.join('\n'))
  const [required, setRequired] = useState(false)
  const [error, setError] = useState('')

  function handleTypeChange(t: FieldType) {
    setFieldType(t)
    if (t === 'radio' && optionsRaw === '') {
      setOptionsRaw(DEFAULT_RADIO_OPTIONS.join('\n'))
    }
    if (t === 'checkbox' && optionsRaw === DEFAULT_RADIO_OPTIONS.join('\n')) {
      setOptionsRaw('')
    }
  }

  function handleSave() {
    if (!questionText.trim()) {
      setError('Question text is required.')
      return
    }
    if (fieldType !== 'textarea') {
      const opts = optionsRaw.split('\n').map(o => o.trim()).filter(Boolean)
      if (opts.length < 2) {
        setError('Please add at least 2 options.')
        return
      }
    }

    const options = fieldType !== 'textarea'
      ? optionsRaw.split('\n').map(o => o.trim()).filter(Boolean)
      : undefined

    onSave({
      id: `custom_${generateId()}`,
      sheet,
      category,
      question: questionText.trim(),
      description: description.trim() || undefined,
      type: fieldType,
      options,
      required: required || undefined,
    })
  }

  const showOptions = fieldType !== 'textarea'

  return (
    <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add custom question to &ldquo;{category}&rdquo;
      </h4>

      {/* Question text */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Question <span className="text-red-400">*</span>
        </label>
        <textarea
          value={questionText}
          onChange={(e) => { setQuestionText(e.target.value); setError('') }}
          placeholder="e.g. What is the expected response time for API calls?"
          rows={2}
          className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 resize-none"
        />
      </div>

      {/* Description / hint */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Hint / description <span className="text-gray-400 dark:text-gray-500">(optional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Context or clarification shown as a hint"
          className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
        />
      </div>

      {/* Answer type */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Answer type</label>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => handleTypeChange(t.value)}
              className={`flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-all ${
                fieldType === t.value
                  ? 'border-amber-400 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <span className="text-xs font-medium">{t.label}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Options (for radio / checkbox) */}
      {showOptions && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Options <span className="text-gray-400 dark:text-gray-500">(one per line)</span>
          </label>
          <textarea
            value={optionsRaw}
            onChange={(e) => { setOptionsRaw(e.target.value); setError('') }}
            placeholder={'Yes\nNo\nTBD'}
            rows={4}
            className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 font-mono"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Preview: {optionsRaw.split('\n').filter(Boolean).slice(0, 5).join(' · ')}{optionsRaw.split('\n').filter(Boolean).length > 5 ? ' ...' : ''}
          </p>
        </div>
      )}

      {/* Required toggle */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 text-red-500 focus:ring-red-400"
          />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Mark as required</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">(answer must be provided before exporting)</span>
        </label>
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
        >
          Add question
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
