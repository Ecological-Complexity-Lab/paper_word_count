import React, { useCallback, useRef, useState } from 'react'

/** Read File objects into { name: content } map */
function readFileObjects(fileObjects, onFilesAdded) {
  if (fileObjects.length === 0) return
  const readers = fileObjects.map(
    (file) =>
      new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve({ name: file.name, content: e.target.result })
        reader.readAsText(file)
      })
  )
  Promise.all(readers).then((results) => {
    const newFiles = {}
    results.forEach(({ name, content }) => { newFiles[name] = content })
    onFilesAdded(newFiles)
  })
}

export default function FileUpload({ files, mainFile, compareFile, onFilesAdded, onRemoveFile, onSetMain, onSetCompare }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.tex'))
    readFileObjects(dropped, onFilesAdded)
  }, [onFilesAdded])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const onInputChange = (e) => {
    const texFiles = Array.from(e.target.files).filter(f => f.name.endsWith('.tex'))
    readFileObjects(texFiles, onFilesAdded)
    // Reset input so the same folder can be re-selected
    e.target.value = ''
  }

  const fileNames = Object.keys(files)

  return (
    <div className="p-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        }`}
        onDrop={handleDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".tex"
          className="hidden"
          onChange={onInputChange}
        />
        <div className="text-4xl mb-2">📄</div>
        <p className="text-gray-600 font-medium">Drop .tex files here or click to browse</p>
        <p className="text-sm text-gray-400 mt-1">Select one or more files · <kbd className="bg-gray-100 px-1 rounded text-xs">⌘</kbd>/<kbd className="bg-gray-100 px-1 rounded text-xs">Ctrl</kbd>+click a loaded file to compare</p>
      </div>

      {fileNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {fileNames.map(name => (
            <div
              key={name}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border cursor-pointer ${
                name === mainFile
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                  : name === compareFile
                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:border-indigo-300'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                if ((e.metaKey || e.ctrlKey) && onSetCompare) {
                  if (name !== mainFile) onSetCompare(name)
                } else {
                  onSetMain(name)
                }
              }}
              title={
                name === mainFile ? 'Main file' :
                name === compareFile ? '⌘/Ctrl+click to remove from comparison' :
                'Click to set as main · ⌘/Ctrl+click to compare'
              }
            >
              <span className="max-w-[180px] truncate">{name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveFile(name) }}
                className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                title="Remove file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
