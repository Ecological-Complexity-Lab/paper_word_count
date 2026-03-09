import React from 'react'
import { countSectionWords } from '../utils/latexParser'

const INDENT = { 0: 'ml-0', 1: 'ml-0', 2: 'ml-4', 3: 'ml-8', 4: 'ml-12', 5: 'ml-16' }
const TITLE_SIZE = { 0: 'font-bold text-base', 1: 'font-semibold text-sm', 2: 'text-sm', 3: 'text-sm text-gray-600', 4: 'text-xs text-gray-500', 5: 'text-xs text-gray-400' }

export default function SectionTree({ sections, selectedSections, onToggle, onSelectAll, onSelectNone, options }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sections</h2>
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="text-xs text-indigo-600 hover:text-indigo-800 underline"
          >All</button>
          <button
            onClick={onSelectNone}
            className="text-xs text-indigo-600 hover:text-indigo-800 underline"
          >None</button>
        </div>
      </div>

      <div className="space-y-0.5">
        {sections.map(section => {
          const words = countSectionWords(section.ownContent, options)
          const selected = selectedSections.has(section.id)
          return (
            <label
              key={section.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                selected ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-gray-100'
              } ${INDENT[section.level] ?? 'ml-0'}`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle(section.id)}
                className="rounded text-indigo-600 flex-shrink-0"
              />
              <span className={`flex-1 truncate ${TITLE_SIZE[section.level] ?? 'text-sm'}`} title={section.title}>
                {section.title}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                selected ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {words.toLocaleString()}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
