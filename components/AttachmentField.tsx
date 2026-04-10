'use client'

import { useState, useEffect, useRef } from 'react'
import {
  saveImage,
  loadImage,
  deleteImage,
  parseAttachments,
  type Attachment,
} from '@/lib/attachmentStorage'
import { generateId } from '@/lib/projectStorage'

type Props = {
  questionId: string
  projectId: string
  attachmentsJson: string
  onUpdate: (json: string) => void
}

export default function AttachmentField({ questionId, projectId, attachmentsJson, onUpdate }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>(() => parseAttachments(attachmentsJson))
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load image previews from IndexedDB when attachments change
  useEffect(() => {
    for (const att of attachments) {
      if (att.type === 'image' && att.imageKey && !imageUrls[att.imageKey]) {
        loadImage(att.imageKey).then((dataUrl) => {
          if (dataUrl) setImageUrls((prev) => ({ ...prev, [att.imageKey!]: dataUrl }))
        })
      }
    }
  }, [attachments]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync from parent when json changes
  useEffect(() => {
    setAttachments(parseAttachments(attachmentsJson))
  }, [attachmentsJson])

  function commit(updated: Attachment[]) {
    setAttachments(updated)
    onUpdate(JSON.stringify(updated))
  }

  function addLink() {
    const url = linkUrl.trim()
    if (!url) return
    const att: Attachment = {
      id: `att_${generateId()}`,
      type: 'link',
      url,
      label: linkLabel.trim() || undefined,
    }
    commit([...attachments, att])
    setLinkUrl('')
    setLinkLabel('')
    setShowLinkForm(false)
  }

  async function handleFile(file: File) {
    const key = `${projectId}_${questionId}_${generateId()}`
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      await saveImage(key, dataUrl)
      setImageUrls((prev) => ({ ...prev, [key]: dataUrl }))
      const att: Attachment = {
        id: `att_${generateId()}`,
        type: 'image',
        imageKey: key,
        imageName: file.name,
      }
      commit([...attachments, att])
    }
    reader.readAsDataURL(file)
  }

  async function remove(att: Attachment) {
    if (att.type === 'image' && att.imageKey) {
      await deleteImage(att.imageKey)
      setImageUrls((prev) => {
        const n = { ...prev }
        delete n[att.imageKey!]
        return n
      })
    }
    commit(attachments.filter((a) => a.id !== att.id))
  }

  const hasAttachments = attachments.length > 0

  return (
    <div className="mt-2">
      {/* Existing attachments */}
      {hasAttachments && (
        <div className="space-y-1.5 mb-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs group/att">
              {att.type === 'link' ? (
                <>
                  <svg className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400 dark:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline truncate block font-medium"
                    >
                      {att.label || att.url}
                    </a>
                    {att.label && (
                      <span className="text-gray-400 dark:text-gray-500 truncate block">{att.url}</span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400 dark:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    {att.imageKey && imageUrls[att.imageKey] ? (
                      <div>
                        <img
                          src={imageUrls[att.imageKey]}
                          alt={att.imageName}
                          className="max-h-24 max-w-xs rounded border border-gray-200 dark:border-gray-600 object-contain mb-0.5"
                        />
                        <span className="text-gray-400 dark:text-gray-500">{att.imageName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">{att.imageName ?? 'Image'}</span>
                    )}
                  </div>
                </>
              )}
              <button
                onClick={() => remove(att)}
                className="shrink-0 text-gray-300 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover/att:opacity-100 transition-opacity mt-0.5"
                title="Remove attachment"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add link inline form */}
      {showLinkForm && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-2.5 mb-2 space-y-1.5">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            onKeyDown={(e) => e.key === 'Enter' && addLink()}
            autoFocus
          />
          <input
            type="text"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Label (optional, e.g. &quot;Figma design&quot;)"
            className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
          />
          <div className="flex gap-1.5">
            <button
              onClick={addLink}
              className="text-xs px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setShowLinkForm(false); setLinkUrl(''); setLinkLabel('') }}
              className="text-xs px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Attach buttons */}
      {!showLinkForm && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowLinkForm(true)}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {hasAttachments ? 'Add link' : 'Attach link'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {hasAttachments ? 'Add image' : 'Attach image'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              files.forEach((file) => handleFile(file))
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}
