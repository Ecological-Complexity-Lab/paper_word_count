import React, { useCallback, useRef, useState } from 'react'

/** Recursively collect all .tex File objects from a FileSystemDirectoryEntry */
function readDirEntry(entry) {
  return new Promise((resolve) => {
    const results = []
    const reader = entry.createReader()
    function readBatch() {
      reader.readEntries((entries) => {
        if (entries.length === 0) {
          resolve(results)
          return
        }
        const promises = entries.map((e) => {
          if (e.isFile && e.name.endsWith('.tex')) {
            return new Promise((res) => e.file((f) => res([f]), () => res([])))
          } else if (e.isDirectory) {
            return readDirEntry(e)
          }
          return Promise.resolve([])
        })
        Promise.all(promises).then((arrays) => {
          arrays.forEach((arr) => results.push(...arr))
          readBatch()
        })
      })
    }
    readBatch()
  })
}

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

export default function FileUpload({ files, mainFile, onFilesAdded, onRemoveFile, onSetMain }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    setDragging(false)

    const items = Array.from(e.dataTransfer.items)
    const allFiles = []

    await Promise.all(items.map(async (item) => {
      const entry = item.webkitGetAsEntry?.()
      if (!entry) return
      if (entry.isDirectory) {
        const found = await readDirEntry(entry)
        allFiles.push(...found)
      } else if (entry.isFile && entry.name.endsWith('.tex')) {
        await new Promise((res) => entry.file((f) => { allFiles.push(f); res() }, res))
      }
    }))

    readFileObjects(allFiles, onFilesAdded)
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
          webkitdirectory=""
          mozdirectory=""
          className="hidden"
          onChange={onInputChange}
        />
        <div className="text-4xl mb-2">📁</div>
        <p className="text-gray-600 font-medium">Drop a folder here or click to browse</p>
        <p className="text-sm text-gray-400 mt-1">All .tex files inside will be loaded automatically</p>
      </div>

      {fileNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {fileNames.map(name => (
            <div
              key={name}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border cursor-pointer ${
                name === mainFile
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:border-indigo-300'
              }`}
              onClick={(e) => { e.stopPropagation(); onSetMain(name) }}
              title={name === mainFile ? 'Main file' : 'Click to set as main file'}
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
