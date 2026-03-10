import React from 'react'
import { countSectionWords, countWords, stripLatex, removeComments } from '../utils/latexParser'

const SPECIAL_COLORS = [
  { bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-800',     label: 'text-sky-700' },
  { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-800',    label: 'text-cyan-700' },
  { bg: 'bg-teal-50',    border: 'border-teal-200',    text: 'text-teal-800',    label: 'text-teal-700' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', label: 'text-emerald-700' },
  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-800',  label: 'text-violet-700' },
]

function wc(raw) {
  return countWords(stripLatex(removeComments(raw || '')))
}

/** Strip .tex extension for compact display */
function shortName(filename) {
  return filename.replace(/\.tex$/i, '')
}

function normTitle(t) {
  return t.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')
}

function Diff({ a, b, size = 'sm' }) {
  if (a === null || b === null) return <span className="text-gray-300">—</span>
  const d = b - a
  if (d === 0) return <span className={`text-${size} text-gray-400`}>0</span>
  return (
    <span className={`text-${size} font-semibold ${d > 0 ? 'text-blue-500' : 'text-orange-500'}`}>
      {d > 0 ? '+' : ''}{d.toLocaleString()}
    </span>
  )
}

function matchSections(secA, secB, opts) {
  const mapB = new Map()
  for (const s of secB) {
    const k = normTitle(s.title)
    if (!mapB.has(k)) mapB.set(k, s)
  }
  const usedB = new Set()
  const rows = []

  for (const sA of secA) {
    const key = normTitle(sA.title)
    const sB = mapB.get(key)
    if (sB) usedB.add(key)
    rows.push({
      title: sA.title,
      level: sA.level,
      countA: countSectionWords(sA.ownContent, opts),
      countB: sB ? countSectionWords(sB.ownContent, opts) : null,
    })
  }

  const onlyB = secB
    .filter(s => !usedB.has(normTitle(s.title)))
    .map(s => ({
      title: s.title,
      level: s.level,
      countA: null,
      countB: countSectionWords(s.ownContent, opts),
    }))

  return { rows, onlyB }
}

// ── Dual stat card (abstract / special sections) ─────────────────────────────
function DualCard({ label, countA, countB, fileA, fileB, colorClass, i }) {
  const c = colorClass ?? SPECIAL_COLORS[i % SPECIAL_COLORS.length]
  return (
    <div className={`${c.bg} ${c.border} border rounded-lg p-4`}>
      <div className={`text-xs font-semibold uppercase tracking-wide mb-3 ${c.label}`}>{label}</div>
      <div className="flex gap-3 items-end">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-indigo-600 font-medium truncate mb-0.5" title={fileA}>{shortName(fileA)}</div>
          <div className={`text-2xl font-bold ${c.text}`}>
            {countA !== null ? countA.toLocaleString() : <span className="text-gray-300 text-xl">—</span>}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-amber-600 font-medium truncate mb-0.5" title={fileB}>{shortName(fileB)}</div>
          <div className={`text-2xl font-bold ${c.text}`}>
            {countB !== null ? countB.toLocaleString() : <span className="text-gray-300 text-xl">—</span>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-transparent mb-0.5">diff</div>
          <div className="text-lg"><Diff a={countA} b={countB} /></div>
        </div>
      </div>
    </div>
  )
}

// ── Section comparison row ────────────────────────────────────────────────────
function SectionRow({ title, level, countA, countB, onlyInB }) {
  const indent = Math.min((level - 1) * 12, 48)
  const onlyInA = countB === null && !onlyInB
  return (
    <div
      className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0 text-sm"
      style={{ paddingLeft: `${indent}px` }}
    >
      <span
        className={`flex-1 truncate ${onlyInA ? 'text-gray-400 italic' : onlyInB ? 'text-amber-700 italic' : 'text-gray-700'}`}
        title={title}
      >
        {title}
        {onlyInA && <span className="ml-1.5 text-xs text-gray-400 not-italic">(only here)</span>}
        {onlyInB && <span className="ml-1.5 text-xs text-amber-500 not-italic">(only here)</span>}
      </span>
      <span className={`w-20 text-right font-medium tabular-nums ${onlyInA ? 'text-indigo-400' : countA !== null ? 'text-gray-700' : 'text-gray-300'}`}>
        {countA !== null ? countA.toLocaleString() : '—'}
      </span>
      <span className={`w-20 text-right font-medium tabular-nums ${onlyInB ? 'text-amber-500' : countB !== null ? 'text-gray-700' : 'text-gray-300'}`}>
        {countB !== null ? countB.toLocaleString() : '—'}
      </span>
      <span className="w-16 text-right tabular-nums">
        <Diff a={countA} b={countB} />
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CompareDashboard({ docA, docB, fileA, fileB, options }) {
  const opts = { includeMath: options.includeMath, includeCaptions: false }

  // Abstract
  const abstractA = wc(docA.abstractRaw)
  const abstractB = wc(docB.abstractRaw)

  // Special sections — union, order by A then extra from B
  const specialMapA = new Map(docA.specialSections.map(s => [normTitle(s.title), s]))
  const specialMapB = new Map(docB.specialSections.map(s => [normTitle(s.title), s]))
  const specialKeys = [
    ...docA.specialSections.map(s => normTitle(s.title)),
    ...docB.specialSections.map(s => normTitle(s.title)).filter(k => !specialMapA.has(k)),
  ]
  const specialRows = specialKeys.map(k => {
    const sA = specialMapA.get(k)
    const sB = specialMapB.get(k)
    return { title: (sA || sB).title, a: sA ? wc(sA.raw) : null, b: sB ? wc(sB.raw) : null }
  })

  // Captions
  const captionA = docA.captions.reduce((s, c) => s + wc(c), 0)
  const captionB = docB.captions.reduce((s, c) => s + wc(c), 0)

  // Body sections
  const { rows: sectionRows, onlyB } = matchSections(docA.sections, docB.sections, opts)
  const totalA = docA.sections.reduce((s, sec) => s + countSectionWords(sec.ownContent, opts), 0)
    + (options.includeCaptions ? captionA : 0)
  const totalB = docB.sections.reduce((s, sec) => s + countSectionWords(sec.ownContent, opts), 0)
    + (options.includeCaptions ? captionB : 0)

  const colCount = 1 + specialRows.length

  return (
    <div className="space-y-6">

      {/* ── Totals ── */}
      <div className="grid grid-cols-2 gap-4">
        {[{ file: fileA, total: totalA, accent: 'text-indigo-600' }, { file: fileB, total: totalB, accent: 'text-amber-600' }]
          .map(({ file, total, accent }) => (
            <div key={file} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className={`text-xs uppercase tracking-wide font-semibold mb-1 truncate ${accent}`} title={file}>{shortName(file)}</div>
              <div className="text-5xl font-bold text-gray-800">{total.toLocaleString()}</div>
              <div className="text-sm text-gray-400 mt-1">total words (body{options.includeCaptions ? ' + captions' : ''})</div>
            </div>
          ))}
      </div>

      {/* ── Abstract + Special Sections ── */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${colCount + 1}, minmax(0, 1fr))` }}
      >
        <DualCard
          label="Abstract"
          countA={abstractA} countB={abstractB}
          fileA={fileA} fileB={fileB}
          colorClass={{ bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', label: 'text-blue-700' }}
        />
        {specialRows.map(({ title, a, b }, i) => (
          <DualCard
            key={title}
            label={title}
            countA={a} countB={b}
            fileA={fileA} fileB={fileB}
            i={i}
          />
        ))}
        {/* Captions */}
        <div className={`${options.includeCaptions ? 'bg-teal-50 border-teal-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
          <div className={`text-xs font-semibold uppercase tracking-wide mb-3 ${options.includeCaptions ? 'text-teal-700' : 'text-gray-400'}`}>
            Captions{!options.includeCaptions && ' (excl.)'}
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate mb-0.5 ${options.includeCaptions ? 'text-indigo-600' : 'text-gray-300'}`} title={fileA}>{shortName(fileA)}</div>
              <div className={`text-2xl font-bold ${options.includeCaptions ? 'text-teal-800' : 'text-gray-400'}`}>{captionA.toLocaleString()}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate mb-0.5 ${options.includeCaptions ? 'text-amber-600' : 'text-gray-300'}`} title={fileB}>{shortName(fileB)}</div>
              <div className={`text-2xl font-bold ${options.includeCaptions ? 'text-teal-800' : 'text-gray-400'}`}>{captionB.toLocaleString()}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-transparent mb-0.5">diff</div>
              <div className={`text-lg ${!options.includeCaptions ? 'opacity-30' : ''}`}>
                <Diff a={captionA} b={captionB} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section comparison ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Section Comparison</div>

        {/* Column headers */}
        <div className="flex items-center gap-2 pb-2 mb-1 border-b border-gray-200 text-xs font-semibold uppercase">
          <span className="flex-1 text-gray-500">Section</span>
          <span className="w-20 text-right text-indigo-600 truncate" title={fileA}>{shortName(fileA)}</span>
          <span className="w-20 text-right text-amber-600 truncate" title={fileB}>{shortName(fileB)}</span>
          <span className="w-16 text-right text-gray-400">Diff</span>
        </div>

        <div>
          {sectionRows.map((row, i) => (
            <SectionRow key={i} {...row} onlyInB={false} />
          ))}

          {onlyB.length > 0 && (
            <>
              <div className="pt-3 pb-1.5 flex items-center gap-2">
                <div className="flex-1 h-px bg-amber-200" />
                <span className="text-xs text-amber-600 font-semibold uppercase whitespace-nowrap">
                  Only in {fileB}
                </span>
                <div className="flex-1 h-px bg-amber-200" />
              </div>
              {onlyB.map((row, i) => (
                <SectionRow key={i} {...row} onlyInB={true} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Document elements ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Document Elements</div>

        {/* Column headers */}
        <div className="flex items-center gap-4 pb-2 mb-1 border-b border-gray-200 text-xs font-semibold uppercase">
          <span className="flex-1" />
          <span className="w-24 text-center text-indigo-600 truncate" title={fileA}>{shortName(fileA)}</span>
          <span className="w-24 text-center text-amber-600 truncate" title={fileB}>{shortName(fileB)}</span>
        </div>

        {[
          { label: 'Equations',        a: docA.equationCount,      b: docB.equationCount },
          { label: 'Figures',          a: docA.figureCount,        b: docB.figureCount },
          { label: 'Tables',           a: docA.tableCount,         b: docB.tableCount },
          { label: 'Unique citations', a: docA.uniqueCitationCount, b: docB.uniqueCitationCount },
        ].map(({ label, a, b }) => (
          <div key={label} className="flex items-center gap-4 py-1.5 border-b border-gray-50 last:border-0">
            <span className="flex-1 text-sm text-gray-500">{label}</span>
            <span className="w-24 text-center text-base font-bold text-gray-700">{a}</span>
            <span className="w-24 text-center text-base font-bold text-amber-600">{b}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
