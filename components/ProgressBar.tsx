'use client'

type Props = {
  answered: number
  total: number
}

export default function ProgressBar({ answered, total }: Props) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100)

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden min-w-[80px]">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {answered}/{total} answered
      </span>
    </div>
  )
}
