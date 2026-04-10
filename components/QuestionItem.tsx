'use client'

import { useState } from 'react'
import type { Question } from '@/lib/parseExcel'
import type { CustomQuestion } from '@/lib/projectStorage'
import {
  NA_VALUE,
  type QuestionTypeConfig,
  getQuestionType,
  parseCheckboxAnswer,
  toggleCheckboxOption,
} from '@/lib/questionTypes'
import AttachmentField from './AttachmentField'

type BaseProps = {
  questionNumber: number
  answer: string
  notes: string
  attachmentsJson: string
  projectId: string
  isHidden?: boolean
  isCustom?: boolean
  isMandatory?: boolean
  editMode?: boolean
  onChange: (id: string, value: string) => void
  onNotes: (id: string, value: string) => void
  onHide?: (id: string) => void
  onDelete?: (id: string) => void
  onToggleMandatory?: (id: string) => void
  onEdit?: (id: string, question: string, description: string | undefined) => void
}

type RegularProps = BaseProps & {
  question: Question
  customQuestion?: undefined
}

type CustomProps = BaseProps & {
  question?: undefined
  customQuestion: CustomQuestion
}

type Props = RegularProps | CustomProps

export default function QuestionItem(props: Props) {
  const {
    questionNumber, answer, notes, attachmentsJson, projectId,
    isCustom, isMandatory, editMode, onChange, onNotes, onHide, onDelete, onToggleMandatory, onEdit,
  } = props

  const id = props.question?.id ?? props.customQuestion!.id
  const questionText = props.question?.question ?? props.customQuestion!.question
  const description = props.question?.description ?? props.customQuestion?.description

  const typeConfig: QuestionTypeConfig = isCustom && props.customQuestion
    ? (props.customQuestion.type === 'textarea'
        ? { type: 'textarea' }
        : { type: props.customQuestion.type, options: props.customQuestion.options ?? [] })
    : getQuestionType(questionText)

  const [showDesc, setShowDesc] = useState(false)
  const [showHideConfirm, setShowHideConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [editDesc, setEditDesc] = useState('')

  function startEdit() {
    setEditText(questionText)
    setEditDesc(description ?? '')
    setEditing(true)
  }

  function commitEdit() {
    if (editText.trim() && onEdit) {
      onEdit(id, editText.trim(), editDesc.trim() || undefined)
    }
    setEditing(false)
  }

  const isNA = answer === NA_VALUE
  const hasAnswer = answer && answer !== NA_VALUE && answer.trim().length > 0 && answer !== '[]'

  function renderAnswerField() {
    if (isNA) {
      return <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">Marked as Not Applicable</p>
    }

    if (typeConfig.type === 'radio') {
      return (
        <div>
          <div className="flex flex-wrap gap-2">
            {typeConfig.options.map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  answer === opt
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500'
                }`}
              >
                <input
                  type="radio"
                  name={id}
                  value={opt}
                  checked={answer === opt}
                  onChange={() => onChange(id, opt)}
                  className="sr-only"
                />
                {opt}
              </label>
            ))}
          </div>
          {answer && (
            <textarea
              value={notes}
              onChange={(e) => onNotes(id + '_notes', e.target.value)}
              placeholder="Add notes or context (optional)..."
              rows={2}
              className="mt-2 w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white dark:bg-gray-700 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 resize-none"
            />
          )}
        </div>
      )
    }

    if (typeConfig.type === 'checkbox') {
      const selected = parseCheckboxAnswer(answer)
      return (
        <div>
          <div className="flex flex-wrap gap-2">
            {typeConfig.options.map((opt) => {
              const isChecked = selected.includes(opt)
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    isChecked
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onChange(id, toggleCheckboxOption(answer, opt))}
                    className="sr-only"
                  />
                  {isChecked && (
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {opt}
                </label>
              )
            })}
          </div>
          {selected.length > 0 && (
            <textarea
              value={notes}
              onChange={(e) => onNotes(id + '_notes', e.target.value)}
              placeholder="Add notes or context (optional)..."
              rows={2}
              className="mt-2 w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white dark:bg-gray-700 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 resize-none"
            />
          )}
        </div>
      )
    }

    // textarea (default)
    return (
      <textarea
        value={answer}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder="Type your answer here..."
        rows={3}
        className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 resize-none"
      />
    )
  }

  function getTypeBadge() {
    if (typeConfig.type === 'radio') return { label: 'Single choice', color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' }
    if (typeConfig.type === 'checkbox') return { label: 'Multi-select', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' }
    return null
  }

  const typeBadge = getTypeBadge()

  // Border & background based on state
  const cardClass = isNA
    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
    : hasAnswer
    ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10'
    : isMandatory
    ? 'border-red-200 dark:border-red-800 bg-red-50/20 dark:bg-red-900/10'
    : isCustom
    ? 'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10'
    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'

  const barClass = isNA
    ? 'bg-gray-300 dark:bg-gray-600'
    : hasAnswer
    ? 'bg-green-400'
    : isMandatory
    ? 'bg-red-400'
    : isCustom
    ? 'bg-amber-400'
    : 'bg-gray-200 dark:bg-gray-600'

  return (
    <div className={`relative rounded-lg border p-4 transition-all group ${cardClass}`}>
      {/* Left status bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${barClass}`} />

      <div className="pl-3">
        {/* Inline edit form */}
        {editing ? (
          <div className="mb-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Question</label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                autoFocus
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-700 dark:text-gray-100 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hint / description <span className="text-gray-400">(optional)</span></label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={commitEdit} disabled={!editText.trim()} className="px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-40 transition-colors">Save</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            {/* Question header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <span className="text-xs font-bold text-indigo-400 dark:text-indigo-500 mt-0.5 shrink-0">Q{questionNumber}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-medium leading-relaxed ${isNA ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                    {questionText}
                    {isMandatory && (
                      <span className="ml-1 text-red-500 font-bold" title="Required">*</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {typeBadge && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeBadge.color}`}>
                        {typeBadge.label}
                      </span>
                    )}
                    {isCustom && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                        Custom
                      </span>
                    )}
                    {isMandatory && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                        Required
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons — only visible in edit mode */}
              {editMode && (
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Edit question */}
                  {onEdit && (
                    <button
                      onClick={startEdit}
                      className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all"
                      title="Edit question text"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}

                  {/* Mandatory toggle */}
                  {onToggleMandatory && (
                    <button
                      onClick={() => onToggleMandatory(id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        isMandatory
                          ? 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                          : 'text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                      title={isMandatory ? 'Unmark as required' : 'Mark as required'}
                    >
                      <svg className="w-3.5 h-3.5" fill={isMandatory ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  )}

                  {/* Delete (custom) or Hide (regular) */}
                  {isCustom && onDelete ? (
                    <button
                      onClick={() => onDelete(id)}
                      className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      title="Delete custom question"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  ) : onHide ? (
                    showHideConfirm ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500">Hide?</span>
                        <button onClick={() => { onHide(id); setShowHideConfirm(false) }} className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">Yes</button>
                        <button onClick={() => setShowHideConfirm(false)} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowHideConfirm(true)}
                        className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                        title="Hide this question"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                        </svg>
                      </button>
                    )
                  ) : null}
                </div>
              )}
            </div>

            {/* Description toggle */}
            {description && (
              <div className="mb-2">
                <button
                  onClick={() => setShowDesc(!showDesc)}
                  className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>{showDesc ? '▾' : '▸'}</span>
                  <span>{showDesc ? 'Hide hint' : 'Show hint'}</span>
                </button>
                {showDesc && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic bg-indigo-50 dark:bg-indigo-900/20 rounded-md px-3 py-2 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Answer field */}
        {renderAnswerField()}

        {/* Attachments */}
        <AttachmentField
          questionId={id}
          projectId={projectId}
          attachmentsJson={attachmentsJson}
          onUpdate={(json) => onChange(id + '_attachments', json)}
        />

        {/* N/A toggle */}
        <div className="flex justify-end mt-1.5">
          <button
            onClick={() => onChange(id, isNA ? '' : NA_VALUE)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
              isNA
                ? 'border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                : 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {isNA ? '↩ Undo N/A' : 'N/A'}
          </button>
        </div>
      </div>
    </div>
  )
}
