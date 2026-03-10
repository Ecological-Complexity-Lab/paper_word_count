import React, { useState, useMemo, useCallback, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import SectionTree from './components/SectionTree'
import Dashboard from './components/Dashboard'
import CompareDashboard from './components/CompareDashboard'
import { parseDocument } from './utils/latexParser'
import appLogo from '../assets/app_logo.png'
import ecomplabLogo from '../assets/ecomplab_logo.png'

const IMRAD_RE = /\b(introduction|background|main|method|methods|material|materials|result|results|discussion|conclusions?)\b/i

function getDescendants(sections, idx) {
  const level = sections[idx].level
  const descendants = []
  for (let i = idx + 1; i < sections.length; i++) {
    if (sections[i].level <= level) break
    descendants.push(sections[i].id)
  }
  return descendants
}

function getDefaultSelected(sections) {
  const selected = new Set()
  for (let i = 0; i < sections.length; i++) {
    // Only match IMRAD keywords against top-level sections (\section / \chapter)
    if (sections[i].level <= 1 && IMRAD_RE.test(sections[i].title)) {
      selected.add(sections[i].id)
      getDescendants(sections, i).forEach(id => selected.add(id))
    }
  }
  // Fall back to all sections if no IMRAD sections found
  return selected.size > 0 ? selected : new Set(sections.map(s => s.id))
}

function detectMainFile(files) {
  // The main file should have \documentclass
  const names = Object.keys(files)
  const main = names.find(name => /\\documentclass/.test(files[name]))
  return main || names[0] || null
}

export default function App() {
  const [files, setFiles] = useState({})
  const [mainFile, setMainFile] = useState(null)
  const [compareFile, setCompareFile] = useState(null)
  const [selectedSections, setSelectedSections] = useState(new Set())
  const [parseError, setParseError] = useState(null)
  const [options, setOptions] = useState({
    includeMath: false,
    includeCaptions: false,
    wordLimit: '',
  })

  // Parse document whenever files or mainFile changes
  const parsedDoc = useMemo(() => {
    if (!mainFile || !files[mainFile]) return null
    try {
      setParseError(null)
      return parseDocument(files, mainFile)
    } catch (e) {
      setParseError(e.message)
      return null
    }
  }, [files, mainFile])

  // Parse compare document
  const compareDoc = useMemo(() => {
    if (!compareFile || !files[compareFile]) return null
    try {
      return parseDocument(files, compareFile)
    } catch (e) {
      return null
    }
  }, [files, compareFile])

  // Update selected sections when parsedDoc changes (IMRAD sections by default)
  useEffect(() => {
    if (parsedDoc) {
      setSelectedSections(getDefaultSelected(parsedDoc.sections))
    }
  }, [parsedDoc])

  const handleFilesAdded = useCallback((newFiles) => {
    setFiles(prev => {
      const merged = { ...prev, ...newFiles }
      // Detect main file from newly merged set
      setMainFile(current => {
        if (current && merged[current]) return current
        return detectMainFile(merged)
      })
      return merged
    })
  }, [])

  const handleRemoveFile = useCallback((name) => {
    setFiles(prev => {
      const next = { ...prev }
      delete next[name]
      setMainFile(current => {
        if (current !== name) return current
        return detectMainFile(next)
      })
      setCompareFile(current => current === name ? null : current)
      return next
    })
  }, [])

  const handleSetMain = useCallback((name) => {
    setMainFile(name)
    setCompareFile(current => current === name ? null : current)
  }, [])

  const handleSetCompare = useCallback((name) => {
    setCompareFile(current => current === name ? null : name)
  }, [])

  const handleToggleSection = useCallback((id) => {
    if (!parsedDoc) return
    const sections = parsedDoc.sections
    const idx = sections.findIndex(s => s.id === id)
    const descendants = idx >= 0 ? getDescendants(sections, idx) : []

    setSelectedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        descendants.forEach(d => next.delete(d))
      } else {
        next.add(id)
        descendants.forEach(d => next.add(d))
      }
      return next
    })
  }, [parsedDoc])

  const handleSelectAll = useCallback(() => {
    if (parsedDoc) setSelectedSections(new Set(parsedDoc.sections.map(s => s.id)))
  }, [parsedDoc])

  const handleSelectNone = useCallback(() => {
    setSelectedSections(new Set())
  }, [])

  const setOption = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  const hasFiles = Object.keys(files).length > 0
  const compareMode = !!(parsedDoc && compareDoc)

  // Shared options panel (used in both modes)
  const optionsPanel = (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Options</h2>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeMath}
            onChange={e => setOption('includeMath', e.target.checked)}
            className="rounded text-indigo-600"
          />
          Include math environments
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeCaptions}
            onChange={e => setOption('includeCaptions', e.target.checked)}
            className="rounded text-indigo-600"
          />
          Include figure/table captions
        </label>
      </div>
      {!compareMode && (
        <div className="mt-3">
          <label className="block text-sm text-gray-700 mb-1">Word limit</label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 8000"
            value={options.wordLimit}
            onChange={e => setOption('wordLimit', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* App logo + title */}
          <img src={appLogo} alt="" className="h-10 w-auto" />
          <div className="flex-1">
            <h1 className="text-xl font-bold leading-tight">LaTeX Word Counter</h1>
            <p className="text-indigo-200 text-xs">Count words by section · All processing in your browser</p>
          </div>

          {/* Lab logo */}
          <a href="https://ecomplab.com" target="_blank" rel="noopener noreferrer" title="Ecological Complexity Lab">
            <img src={ecomplabLogo} alt="EcompLab" className="h-10 w-auto rounded" />
          </a>

          {/* GitHub link */}
          <a
            href="https://github.com/Ecological-Complexity-Lab/paper_word_count"
            target="_blank"
            rel="noopener noreferrer"
            title="View on GitHub"
            className="text-indigo-200 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 16 16" className="h-6 w-6 fill-current" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
                -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
                .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
                -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
                .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
                .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
                0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
      </header>

      {/* File Upload */}
      <div className="max-w-7xl mx-auto w-full px-4 mt-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <FileUpload
            files={files}
            mainFile={mainFile}
            compareFile={compareFile}
            onFilesAdded={handleFilesAdded}
            onRemoveFile={handleRemoveFile}
            onSetMain={handleSetMain}
            onSetCompare={handleSetCompare}
          />
        </div>

        {parseError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <strong>Parse error:</strong> {parseError}
          </div>
        )}
      </div>

      {/* ── Compare mode ── */}
      {compareMode && (
        <div className="max-w-7xl mx-auto w-full px-4 mt-4 mb-8 flex gap-4 items-start">
          {/* Narrow left panel: options only */}
          <div className="w-64 flex-shrink-0">
            {optionsPanel}
          </div>

          {/* Compare dashboard */}
          <div className="flex-1 min-w-0">
            <CompareDashboard
              docA={parsedDoc}
              docB={compareDoc}
              fileA={mainFile}
              fileB={compareFile}
              options={options}
            />
          </div>
        </div>
      )}

      {/* ── Normal mode ── */}
      {!compareMode && parsedDoc && (
        <div className="max-w-7xl mx-auto w-full px-4 mt-4 mb-8 flex gap-4 items-start">
          {/* Left panel */}
          <div className="w-80 flex-shrink-0 space-y-4">
            {optionsPanel}

            {/* Section tree */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <SectionTree
                sections={parsedDoc.sections}
                selectedSections={selectedSections}
                onToggle={handleToggleSection}
                onSelectAll={handleSelectAll}
                onSelectNone={handleSelectNone}
                options={options}
              />
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 min-w-0">
            <Dashboard
              parsedDoc={parsedDoc}
              selectedSections={selectedSections}
              options={options}
              wordLimit={parseInt(options.wordLimit, 10) || 0}
            />
          </div>
        </div>
      )}

      {!hasFiles && (
        <div className="max-w-7xl mx-auto w-full px-4 mt-8 text-center text-gray-400">
          <p className="text-lg">Drop your .tex files above to get started</p>
          <p className="text-sm mt-1">All parsing happens locally — your files never leave your browser</p>
        </div>
      )}

      {hasFiles && !parsedDoc && !parseError && (
        <div className="max-w-7xl mx-auto w-full px-4 mt-8 text-center text-gray-400">
          <p>No document structure found. Make sure your main .tex file contains <code className="bg-gray-100 px-1 rounded">\documentclass</code> and <code className="bg-gray-100 px-1 rounded">\begin&#123;document&#125;</code>.</p>
        </div>
      )}
    </div>
  )
}
