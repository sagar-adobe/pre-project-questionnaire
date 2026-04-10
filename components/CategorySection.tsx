'use client'

import { useState } from 'react'
import type { Category } from '@/lib/parseExcel'
import type { CustomQuestion } from '@/lib/projectStorage'
import { isAnswered } from '@/lib/questionTypes'
import QuestionItem from './QuestionItem'
import AddCustomQuestion from './AddCustomQuestion'
import ConfirmModal from './ConfirmModal'
import type { QuestionOverride } from '@/lib/projectStorage'

type Props = {
  sheet: string
  category: Category
  answers: Record<string, string>
  hiddenQuestions: Set<string>
  customQuestions: CustomQuestion[]   // already filtered to this sheet+category
  questionOffset: number              // for numbering
  projectId: string
  mandatoryQuestions: Set<string>
  questionOverrides: Record<string, QuestionOverride>
  editMode: boolean
  isCustomCategory?: boolean          // true when this is a user-added category
  customCategoryId?: string           // id of the custom category (for delete)
  onChange: (id: string, value: string) => void
  onNotes: (id: string, value: string) => void
  onHide: (id: string) => void
  onUnhide: (id: string) => void
  onAddCustom: (q: CustomQuestion) => void
  onDeleteCustom: (id: string) => void
  onToggleMandatory: (id: string) => void
  onEditQuestion: (id: string, question: string, description: string | undefined) => void
  onHideCategory?: (sheetCatKey: string) => void        // for existing categories
  onDeleteCustomCategory?: (id: string) => void         // for custom categories
}

export default function CategorySection({
  sheet,
  category,
  answers,
  hiddenQuestions,
  customQuestions,
  questionOffset,
  projectId,
  mandatoryQuestions,
  questionOverrides,
  editMode,
  isCustomCategory = false,
  customCategoryId,
  onChange,
  onNotes,
  onHide,
  onUnhide,
  onAddCustom,
  onDeleteCustom,
  onToggleMandatory,
  onEditQuestion,
  onHideCategory,
  onDeleteCustomCategory,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const visibleQuestions = category.questions.filter((q) => !hiddenQuestions.has(q.id))
  const hiddenInCat = category.questions.filter((q) => hiddenQuestions.has(q.id))

  const allQuestions = [
    ...visibleQuestions.map((q) => ({ id: q.id, isCustom: false })),
    ...customQuestions.map((q) => ({ id: q.id, isCustom: true })),
  ]
  const total = allQuestions.length
  const answered = allQuestions.filter(({ id }) => isAnswered(answers[id])).length
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100)
  const allDone = total > 0 && answered === total

  const mandatoryUnanswered = allQuestions.filter(
    ({ id }) => mandatoryQuestions.has(id) && !isAnswered(answers[id])
  ).length

  function handleDeleteCategory() {
    if (isCustomCategory && customCategoryId && onDeleteCustomCategory) {
      onDeleteCustomCategory(customCategoryId)
    } else if (!isCustomCategory && onHideCategory) {
      onHideCategory(`${sheet}::${category.name}`)
    }
    setShowDeleteConfirm(false)
  }

  return (
    <>
      {showDeleteConfirm && (
        <ConfirmModal
          title={isCustomCategory ? `Delete category "${category.name}"?` : `Hide category "${category.name}"?`}
          message={
            isCustomCategory
              ? 'This will permanently delete this category and all its questions. This cannot be undone.'
              : 'This category will be hidden for this project. You can restore it from the hidden categories section at the bottom.'
          }
          confirmLabel={isCustomCategory ? 'Delete' : 'Hide'}
          onConfirm={handleDeleteCategory}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      <div className="mb-4">
        {/* Category header */}
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
          isCustomCategory
            ? 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border-purple-100 dark:border-purple-800'
            : 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800'
        }`}>
          {/* Clickable collapse area */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className={`text-sm font-semibold truncate ${isCustomCategory ? 'text-purple-800 dark:text-purple-300' : 'text-indigo-800 dark:text-indigo-300'}`}>
                {category.name}
              </span>
              {isCustomCategory && (
                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 font-medium">
                  Custom
                </span>
              )}
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                allDone
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : isCustomCategory
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                  : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
              }`}>
                {answered}/{total}
              </span>
              {hiddenInCat.length > 0 && (
                <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{hiddenInCat.length} hidden</span>
              )}
              {customQuestions.length > 0 && !isCustomCategory && (
                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                  +{customQuestions.length} custom
                </span>
              )}
              {mandatoryUnanswered > 0 && (
                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium">
                  {mandatoryUnanswered} required
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className={`hidden sm:block w-20 h-1.5 rounded-full overflow-hidden ${isCustomCategory ? 'bg-purple-200 dark:bg-purple-800' : 'bg-indigo-200 dark:bg-indigo-800'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-green-400' : isCustomCategory ? 'bg-purple-500' : 'bg-indigo-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-sm ${isCustomCategory ? 'text-purple-400 dark:text-purple-500' : 'text-indigo-400 dark:text-indigo-500'}`}>
                {collapsed ? '▸' : '▾'}
              </span>
            </div>
          </button>

          {/* Delete / Hide button — only in edit mode */}
          {editMode && (onHideCategory || (isCustomCategory && onDeleteCustomCategory)) && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }}
              className="ml-2 shrink-0 p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0"
              title={isCustomCategory ? 'Delete category' : 'Hide category'}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isCustomCategory ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                )}
              </svg>
            </button>
          )}
        </div>

        {!collapsed && (
          <div className="mt-2 pl-2">
            {/* Visible regular questions */}
            <div className="space-y-2">
              {visibleQuestions.map((q, idx) => {
                const ov = questionOverrides[q.id]
                const displayQ = ov ? { ...q, question: ov.question ?? q.question, description: ov.description ?? q.description } : q
                return (
                  <QuestionItem
                    key={q.id}
                    question={displayQ}
                    questionNumber={questionOffset + idx + 1}
                    answer={answers[q.id] || ''}
                    notes={answers[q.id + '_notes'] || ''}
                    attachmentsJson={answers[q.id + '_attachments'] || ''}
                    projectId={projectId}
                    isMandatory={mandatoryQuestions.has(q.id)}
                    editMode={editMode}
                    onChange={onChange}
                    onNotes={onNotes}
                    onHide={onHide}
                    onToggleMandatory={onToggleMandatory}
                    onEdit={onEditQuestion}
                  />
                )
              })}
            </div>

            {/* Hidden questions */}
            {hiddenInCat.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowHidden(!showHidden)}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 py-1"
                >
                  <span>{showHidden ? '▾' : '▸'}</span>
                  <span>{showHidden ? 'Hide' : 'Show'} {hiddenInCat.length} hidden question{hiddenInCat.length !== 1 ? 's' : ''}</span>
                </button>
                {showHidden && (
                  <div className="mt-1 space-y-2 opacity-60">
                    {hiddenInCat.map((q) => (
                      <div key={q.id} className="relative rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-through">{q.question}</p>
                          <button
                            onClick={() => onUnhide(q.id)}
                            className="shrink-0 text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            Restore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Custom questions */}
            {customQuestions.length > 0 && (
              <div className="mt-2 space-y-2">
                {customQuestions.map((cq, idx) => (
                  <QuestionItem
                    key={cq.id}
                    customQuestion={cq}
                    questionNumber={questionOffset + visibleQuestions.length + idx + 1}
                    answer={answers[cq.id] || ''}
                    notes={answers[cq.id + '_notes'] || ''}
                    attachmentsJson={answers[cq.id + '_attachments'] || ''}
                    projectId={projectId}
                    isMandatory={mandatoryQuestions.has(cq.id)}
                    isCustom
                    editMode={editMode}
                    onChange={onChange}
                    onNotes={onNotes}
                    onDelete={onDeleteCustom}
                    onToggleMandatory={onToggleMandatory}
                    onEdit={onEditQuestion}
                  />
                ))}
              </div>
            )}

            {/* Add custom question — only in edit mode */}
            {editMode && (showAddForm ? (
              <AddCustomQuestion
                sheet={sheet}
                category={isCustomCategory && customCategoryId ? customCategoryId : category.name}
                onSave={(q) => { onAddCustom(q); setShowAddForm(false) }}
                onCancel={() => setShowAddForm(false)}
              />
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className={`mt-3 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 px-3 py-2 rounded-lg border border-dashed transition-all w-full justify-center ${
                  isCustomCategory
                    ? 'hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700'
                    : 'hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700'
                } border-gray-200 dark:border-gray-700`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add question to this category
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
