import React from 'react'
import WordLimitBar from './WordLimitBar'
import { countSectionWords, countWords, stripLatex, removeComments } from '../utils/latexParser'

const SPECIAL_COLORS = [
  'bg-sky-50 border-sky-200 text-sky-800',
  'bg-cyan-50 border-cyan-200 text-cyan-800',
  'bg-teal-50 border-teal-200 text-teal-800',
  'bg-emerald-50 border-emerald-200 text-emerald-800',
  'bg-violet-50 border-violet-200 text-violet-800',
]

function StatCard({ label, value, color, dim }) {
  return (
    <div className={`rounded-lg p-4 ${dim ? 'bg-gray-50 border border-gray-200' : `${color} border`}`}>
      <div className={`text-2xl font-bold ${dim ? 'text-gray-400' : ''}`}>{value.toLocaleString()}</div>
      <div className={`text-xs mt-1 font-medium ${dim ? 'text-gray-400' : ''}`}>{label}</div>
    </div>
  )
}

function ElementRow({ label, main, supp, hasSupp }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <span className="w-24 text-sm text-gray-500">{label}</span>
      <span className="w-16 text-center text-base font-bold text-gray-700">{main}</span>
      {hasSupp && (
        <span className="w-16 text-center text-base font-bold text-indigo-500">{supp}</span>
      )}
    </div>
  )
}

export default function Dashboard({ parsedDoc, selectedSections, options, wordLimit }) {
  const {
    sections, abstractRaw, specialSections, captions,
    equationCount, figureCount, tableCount, uniqueCitationCount,
    suppEquationCount, suppFigureCount, suppTableCount, suppUniqueCitationCount,
    hasSupplementary,
  } = parsedDoc

  const wc = (raw) => countWords(stripLatex(removeComments(raw || '')))

  const abstractWords = wc(abstractRaw)
  const specialWords = specialSections.map(s => ({ title: s.title, words: wc(s.raw) }))
  const captionWords = captions.reduce((sum, c) => sum + wc(c), 0)

  const bodyWords = sections
    .filter(s => selectedSections.has(s.id))
    .reduce((sum, s) => sum + countSectionWords(s.ownContent, options), 0)

  const total = bodyWords + (options.includeCaptions ? captionWords : 0)

  const limit = parseInt(options.wordLimit, 10) || 0
  const pct = limit > 0 ? total / limit : 0
  const totalColor = limit === 0 ? 'text-gray-800' : pct >= 1 ? 'text-red-600' : pct >= 0.9 ? 'text-amber-600' : 'text-green-700'

  const maxSectionWords = Math.max(1, ...sections.map(s => countSectionWords(s.ownContent, options)))

  return (
    <div className="space-y-6">
      {/* Total count */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-1">Total Word Count</div>
        <div className={`text-6xl font-bold ${totalColor}`}>{total.toLocaleString()}</div>
        {limit > 0 && <WordLimitBar total={total} limit={limit} />}
      </div>

      {/* Abstract + dynamically detected pre-body sections */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${1 + specialWords.length}, minmax(0, 1fr))` }}>
        <StatCard
          label="Abstract"
          value={abstractWords}
          color="bg-blue-50 border-blue-200 text-blue-800"
          dim={abstractWords === 0}
        />
        {specialWords.map(({ title, words }, i) => (
          <StatCard
            key={title}
            label={title}
            value={words}
            color={SPECIAL_COLORS[i % SPECIAL_COLORS.length]}
            dim={false}
          />
        ))}
      </div>

      {/* Optional inclusions */}
      <div className="grid grid-cols-1 gap-4">
        <StatCard
          label={options.includeCaptions ? 'Captions (included)' : 'Captions (excluded)'}
          value={captionWords}
          color="bg-teal-50 border-teal-200 text-teal-800"
          dim={!options.includeCaptions}
        />
      </div>

      {/* Document elements: main vs supplementary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Document Elements</div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <span className="w-24" />
          <span className="w-16 text-center text-xs font-semibold text-gray-500 uppercase">Main</span>
          {hasSupplementary && (
            <span className="w-16 text-center text-xs font-semibold text-indigo-400 uppercase">Supp.</span>
          )}
        </div>
        <ElementRow label="Equations"  main={equationCount}        supp={suppEquationCount}        hasSupp={hasSupplementary} />
        <ElementRow label="Figures"    main={figureCount}           supp={suppFigureCount}           hasSupp={hasSupplementary} />
        <ElementRow label="Tables"     main={tableCount}            supp={suppTableCount}            hasSupp={hasSupplementary} />
        <ElementRow label="References" main={uniqueCitationCount}   supp={suppUniqueCitationCount}   hasSupp={hasSupplementary} />
      </div>

      {/* Section breakdown */}
      {sections.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Section Breakdown</div>
          <div className="space-y-2">
            {sections.map(section => {
              const words = countSectionWords(section.ownContent, options)
              const selected = selectedSections.has(section.id)
              const barPct = (words / maxSectionWords) * 100
              const indent = Math.min(section.level - 1, 4) * 12
              return (
                <div key={section.id} style={{ paddingLeft: `${indent}px` }}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className={`text-xs truncate max-w-[60%] ${selected ? 'text-gray-700' : 'text-gray-400'}`} title={section.title}>
                      {section.title}
                    </span>
                    <span className={`text-xs font-medium ${selected ? 'text-gray-600' : 'text-gray-300'}`}>
                      {words.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${selected ? 'bg-indigo-400' : 'bg-gray-200'}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
