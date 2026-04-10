'use client'

import type { Meta } from '@/lib/exportPdf'

type Props = {
  meta: Meta
  onChange: (updated: Meta) => void
}

export default function ProjectMetaForm({ meta, onChange }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Project Details
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Project Name
          </label>
          <input
            type="text"
            value={meta.projectName}
            onChange={(e) => onChange({ ...meta, projectName: e.target.value })}
            placeholder="e.g. Acme E-Commerce"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Client Name
          </label>
          <input
            type="text"
            value={meta.clientName}
            onChange={(e) => onChange({ ...meta, clientName: e.target.value })}
            placeholder="e.g. John Smith"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Date
          </label>
          <input
            type="date"
            value={meta.date}
            onChange={(e) => onChange({ ...meta, date: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>
    </div>
  )
}
