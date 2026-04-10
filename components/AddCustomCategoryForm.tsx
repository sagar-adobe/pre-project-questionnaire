'use client'

import { useState } from 'react'

type Props = {
  sheet: string
  onSave: (name: string) => void
  onCancel: () => void
}

export default function AddCustomCategoryForm({ sheet, onSave, onCancel }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Category name is required.')
      return
    }
    onSave(trimmed)
  }

  return (
    <div className="mt-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add custom category to &ldquo;{sheet}&rdquo;
      </h4>

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Category name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          placeholder="e.g. Performance Requirements"
          className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Add category
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
