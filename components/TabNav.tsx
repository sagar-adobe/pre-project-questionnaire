'use client'

import { useState, useRef, useEffect } from 'react'

export type TabItem = {
  id: string
  label: string
  icon: string
  answered: number
  total: number
  isOverview?: boolean
  isCustom?: boolean       // custom sheet (can rename + delete)
  isBuiltin?: boolean      // built-in sheet (can hide)
}

type Props = {
  items: TabItem[]
  activeId: string
  hiddenBuiltinCount: number
  editMode: boolean
  onSelect: (id: string) => void
  onAddTab: () => void
  onRenameTab: (id: string, newName: string) => void
  onDeleteTab: (id: string) => void   // custom sheets
  onHideTab: (id: string) => void     // built-in sheets
  onRestoreAllTabs: () => void
}

export default function TabNav({
  items,
  activeId,
  hiddenBuiltinCount,
  editMode,
  onSelect,
  onAddTab,
  onRenameTab,
  onDeleteTab,
  onHideTab,
  onRestoreAllTabs,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus()
  }, [renamingId])

  function startRename(id: string, currentLabel: string) {
    setRenamingId(id)
    setRenameValue(currentLabel)
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      onRenameTab(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {items.map((item) => {
        const isActive = activeId === item.id
        const pct = item.total === 0 ? 0 : Math.round((item.answered / item.total) * 100)
        const isRenaming = renamingId === item.id

        return (
          <div key={item.id} className="relative shrink-0 group/tab">
            <button
              onClick={() => !isRenaming && onSelect(item.id)}
              onDoubleClick={() => item.isCustom && startRename(item.id, item.label)}
              title={item.isCustom ? 'Double-click to rename' : undefined}
              className={`flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : item.isOverview
                  ? 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  : item.isCustom
                  ? 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-purple-200 dark:border-purple-700'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <span>{item.icon}</span>

              {/* Rename input for custom tabs */}
              {isRenaming ? (
                <input
                  ref={renameRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setRenamingId(null)
                    e.stopPropagation()
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-24 bg-transparent border-b border-white outline-none text-sm font-medium"
                />
              ) : (
                <span>{item.label}</span>
              )}

              {/* Progress badge (not shown for overview) */}
              {!item.isOverview && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive
                    ? pct === 100 ? 'bg-green-400 text-white' : 'bg-indigo-400 text-white'
                    : pct === 100 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {pct}%
                </span>
              )}

              {/* Actions for custom tabs */}
              {editMode && item.isCustom && !isRenaming && (
                <span
                  className="flex items-center gap-0.5 ml-0.5 opacity-0 group-hover/tab:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Pencil */}
                  <span
                    onClick={() => startRename(item.id, item.label)}
                    className={`p-0.5 rounded hover:bg-white/20 cursor-pointer text-[10px] ${isActive ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500'}`}
                    title="Rename tab"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </span>
                  {/* × */}
                  {confirmDeleteId === item.id ? (
                    <span className="flex items-center gap-0.5">
                      <button
                        onClick={() => { onDeleteTab(item.id); setConfirmDeleteId(null) }}
                        className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded font-medium"
                      >
                        Del
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <span
                      onClick={() => setConfirmDeleteId(item.id)}
                      className={`p-0.5 rounded hover:bg-red-500 hover:text-white cursor-pointer ${isActive ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500'}`}
                      title="Delete tab"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  )}
                </span>
              )}

              {/* Hide action for built-in tabs */}
              {editMode && item.isBuiltin && !isRenaming && (
                <span
                  className="ml-0.5 opacity-0 group-hover/tab:opacity-100 transition-opacity cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onHideTab(item.id) }}
                  title="Hide this tab"
                >
                  <svg className={`w-3 h-3 ${isActive ? 'text-indigo-200' : 'text-gray-300 dark:text-gray-600'} hover:text-red-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        )
      })}

      {/* Add Tab button — only in edit mode */}
      {editMode && <button
        onClick={onAddTab}
        title="Add custom tab"
        className="shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:inline text-xs font-medium">Tab</span>
      </button>}

      {/* Restore hidden tabs button — only in edit mode */}
      {editMode && hiddenBuiltinCount > 0 && (
        <button
          onClick={onRestoreAllTabs}
          title="Restore hidden tabs"
          className="shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="hidden sm:inline">{hiddenBuiltinCount} hidden</span>
        </button>
      )}
    </div>
  )
}
