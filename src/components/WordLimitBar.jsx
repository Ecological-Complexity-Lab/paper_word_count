import React from 'react'

export default function WordLimitBar({ total, limit }) {
  if (!limit || limit <= 0) return null

  const pct = Math.min((total / limit) * 100, 100)
  const over = total > limit

  const barColor = over
    ? 'bg-red-500'
    : pct >= 90
    ? 'bg-amber-400'
    : 'bg-green-500'

  const remaining = limit - total

  return (
    <div className="mt-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-500">Word limit: {limit.toLocaleString()}</span>
        <span className={over ? 'text-red-600 font-semibold' : pct >= 90 ? 'text-amber-600 font-semibold' : 'text-green-700'}>
          {over
            ? `${Math.abs(remaining).toLocaleString()} words over limit`
            : `${remaining.toLocaleString()} words remaining`}
        </span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-right text-xs text-gray-400 mt-0.5">{pct.toFixed(1)}%</div>
    </div>
  )
}
