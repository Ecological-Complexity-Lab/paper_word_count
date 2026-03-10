/**
 * LaTeX parsing and word counting utilities.
 */

// ---------------------------------------------------------------------------
// Low-level text helpers
// ---------------------------------------------------------------------------

/** Strip LaTeX comments (% to end of line, but not \%) */
export function removeComments(text) {
  return text.replace(/(?<!\\)%[^\n]*/g, '')
}

/** Recursively stitch \input{} and \include{} references from registry */
export function resolveIncludes(text, registry, depth = 0) {
  if (depth > 20) return text // guard against circular includes
  return text.replace(/\\(?:input|include)\{([^}]+)\}/g, (match, filename) => {
    // Try filename as-is, then with .tex
    const key =
      Object.keys(registry).find(k => k === filename) ||
      Object.keys(registry).find(k => k === filename + '.tex') ||
      Object.keys(registry).find(k => k.endsWith('/' + filename)) ||
      Object.keys(registry).find(k => k.endsWith('/' + filename + '.tex'))
    if (!key) return match // leave unresolved
    return resolveIncludes(removeComments(registry[key]), registry, depth + 1)
  })
}

/** Extract content between \begin{document} and \end{document} */
export function extractDocumentBody(text) {
  const m = text.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/)
  return m ? m[1] : text
}

/** Extract content of a named environment, e.g. \begin{abstract}...\end{abstract} */
export function extractEnv(text, envName) {
  const re = new RegExp(`\\\\begin\\{${envName}\\}([\\s\\S]*?)\\\\end\\{${envName}\\}`, 'i')
  const m = text.match(re)
  return m ? m[1] : ''
}

/** Extract content of \begin{abstract}...\end{abstract} */
export function extractAbstract(text) {
  return extractEnv(text, 'abstract')
}

// Environments that are standard LaTeX and should never be treated as special sections
const SKIP_ENVS = new Set([
  'document', 'abstract', 'figure', 'figure*', 'table', 'table*', 'tabular', 'tabular*',
  'array', 'equation', 'equation*', 'align', 'align*', 'multline', 'multline*',
  'gather', 'gather*', 'flalign', 'flalign*', 'alignat', 'alignat*', 'eqnarray', 'eqnarray*',
  'thebibliography', 'itemize', 'enumerate', 'description', 'list',
  'tikzpicture', 'algorithm', 'algorithmic', 'lstlisting', 'verbatim', 'verbatim*',
  'minipage', 'center', 'flushleft', 'flushright', 'quote', 'quotation', 'verse',
  'proof', 'theorem', 'lemma', 'proposition', 'corollary', 'definition', 'remark', 'example',
  'wrapfigure', 'subfigure', 'subtable', 'math', 'displaymath', 'cases',
])

const IMRAD_RE = /\b(introduction|background|main|method|methods|material|materials|result|results|discussion|conclusions?)\b/i

function titleFromEnvName(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

/**
 * Detect special pre-body sections (Summary, Author Summary, Significance Statement, etc.)
 * These are non-standard environments OR section headings that appear before the first
 * IMRAD section. Returns [{ title, raw, start, end }] sorted by position.
 * start/end are character offsets into `text`.
 */
export function detectSpecialSections(text) {
  const results = []
  const seenTitles = new Set()

  // Only detect \section(*){Title} or \chapter(*){Title} headings that appear
  // before the first IMRAD section. No environment scanning — layout environments
  // like \begin{landscape} must never be treated as sections.
  const secRe = /\\(?:chapter|section)\*?(?:\[[^\]]*\])?\{([^}]*)\}/g
  let m

  // Find position of first IMRAD heading
  let imradPos = text.length
  secRe.lastIndex = 0
  while ((m = secRe.exec(text)) !== null) {
    if (IMRAD_RE.test(m[1].trim())) { imradPos = m.index; break }
  }

  // Collect all non-IMRAD headings before that position
  const preHeadings = []
  secRe.lastIndex = 0
  while ((m = secRe.exec(text)) !== null) {
    if (m.index >= imradPos) break
    const title = m[1].trim()
    if (title && !IMRAD_RE.test(title)) {
      preHeadings.push({ title, headingStart: m.index, headingEnd: m.index + m[0].length })
    }
  }

  for (let i = 0; i < preHeadings.length; i++) {
    const h = preHeadings[i]
    if (seenTitles.has(h.title)) continue
    const contentEnd = i + 1 < preHeadings.length ? preHeadings[i + 1].headingStart : imradPos
    const raw = text.slice(h.headingEnd, contentEnd).trim()
    if (!raw) continue
    seenTitles.add(h.title)
    results.push({ title: h.title, raw, start: h.headingStart, end: contentEnd })
  }

  return results.sort((a, b) => a.start - b.start)
}

/**
 * Find the character position in text where supplementary material starts.
 * Returns null if no supplementary section is found.
 */
export function findSupplementaryStart(text) {
  const patterns = [
    /\\appendix\b/g,
    /\\(?:section|chapter)\*?\s*(?:\[[^\]]*\])?\{[^}]*(?:supplement(?:ary|al)?|supporting\s+information|appendix)[^}]*\}/gi,
  ]
  let pos = null
  for (const re of patterns) {
    let m
    while ((m = re.exec(text)) !== null) {
      if (pos === null || m.index < pos) pos = m.index
    }
  }
  return pos
}

/** Extract content of \begin{thebibliography}...\end{thebibliography} */
export function extractReferences(text) {
  const m = text.match(/\\begin\{thebibliography\}(?:\{[^}]*\})?([\s\S]*?)\\end\{thebibliography\}/)
  return m ? m[1] : ''
}

/** Return array of strings — the text inside each \caption{...} */
export function extractCaptions(text) {
  const captions = []
  const re = /\\caption(?:\[[^\]]*\])?\{/g
  let match
  while ((match = re.exec(text)) !== null) {
    const start = match.index + match[0].length
    let depth = 1
    let i = start
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') depth--
      i++
    }
    captions.push(text.slice(start, i - 1))
  }
  return captions
}

/** Count equation-like environments */
export function countEquations(text) {
  const envs = ['equation', 'align', 'multline', 'gather', 'flalign', 'alignat', 'eqnarray']
  let count = 0
  for (const env of envs) {
    const re = new RegExp(`\\\\begin\\{${env}\\*?\\}`, 'g')
    const matches = text.match(re)
    if (matches) count += matches.length
  }
  // Also count $$ ... $$ display math blocks (not inside environments)
  const ddMatches = text.match(/\$\$[\s\S]*?\$\$/g)
  if (ddMatches) count += ddMatches.length
  // Count \[ ... \]
  const displayMatches = text.match(/\\\[[\s\S]*?\\\]/g)
  if (displayMatches) count += displayMatches.length
  return count
}

/** Count figure and table environments */
export function countFiguresTables(text) {
  const figures = (text.match(/\\begin\{figure\*?\}/g) || []).length
  const tables = (text.match(/\\begin\{table\*?\}/g) || []).length
  return { figures, tables }
}

/** Count unique citation keys across all \cite / \autocite / \parencite / \textcite etc. */
export function countUniqueCitations(text) {
  const keys = new Set()
  // Match any command whose name contains "cite" (case-sensitive: Cite and cite variants)
  // Handles optional args like \citep[see][p.5]{key1,key2}
  const re = /\\[a-zA-Z]*[Cc]ite[a-zA-Z]*\*?(?:\[[^\]]*\]){0,2}\{([^}]+)\}/g
  let match
  while ((match = re.exec(text)) !== null) {
    match[1].split(',').forEach(k => {
      const key = k.trim()
      if (key) keys.add(key)
    })
  }
  return keys.size
}

/** Remove display math environments from text */
export function removeMathEnvironments(text) {
  const envs = ['equation', 'align', 'multline', 'gather', 'flalign', 'alignat', 'eqnarray', 'math']
  let result = text
  for (const env of envs) {
    result = result.replace(new RegExp(`\\\\begin\\{${env}\\*?\\}[\\s\\S]*?\\\\end\\{${env}\\*?\\}`, 'g'), ' ')
  }
  // Remove $$ ... $$
  result = result.replace(/\$\$[\s\S]*?\$\$/g, ' ')
  // Remove \[ ... \]
  result = result.replace(/\\\[[\s\S]*?\\\]/g, ' ')
  // Remove inline $ ... $
  result = result.replace(/(?<![\\])\$[^$\n]*?\$/g, ' ')
  return result
}

/** Remove \caption{...} blocks from text */
export function removeCaptions(text) {
  let result = text
  const re = /\\caption(?:\[[^\]]*\])?\{/g
  let match
  const segments = []
  let lastEnd = 0
  while ((match = re.exec(result)) !== null) {
    const start = match.index
    const contentStart = match.index + match[0].length
    let depth = 1
    let i = contentStart
    while (i < result.length && depth > 0) {
      if (result[i] === '{') depth++
      else if (result[i] === '}') depth--
      i++
    }
    segments.push(result.slice(lastEnd, start))
    lastEnd = i
  }
  segments.push(result.slice(lastEnd))
  return segments.join(' ')
}

/**
 * Strip LaTeX commands but keep their textual content where appropriate.
 * - Removes: \cite{}, \label{}, \ref{}, \eqref{}, \bibitem{}, \bibliographystyle{}, \bibliography{}
 * - Keeps content of: \textbf{}, \textit{}, \emph{}, \text{}, \mathrm{}, etc.
 * - Removes: remaining \command[...]{...} structures, keeping content of last {}
 */
export function stripLatex(text) {
  let result = text

  // Remove all \*cite* commands (any variant: \autocite, \parencite, \Citep, etc.)
  result = result.replace(/\\[a-zA-Z]*[Cc]ite[a-zA-Z]*\*?(?:\[[^\]]*\]){0,2}\{[^}]*\}/g, ' ')

  // Remove other commands whose argument should be dropped entirely
  const dropArgCmds = [
    'label', 'ref', 'eqref', 'pageref', 'vref',
    'bibitem', 'bibliographystyle', 'bibliography',
    'includegraphics', 'input', 'include',
    'usepackage', 'documentclass',
    'newcommand', 'renewcommand', 'def',
    'setlength', 'setcounter', 'pagenumbering',
    'hspace', 'vspace', 'rule',
    // Title-page metadata — drop content even if these appear inside \begin{document}
    'title', 'author', 'date', 'affil', 'thanks', 'email',
  ]
  for (const cmd of dropArgCmds) {
    result = result.replace(
      new RegExp(`\\\\${cmd}(?:\\[[^\\]]*\\])?(?:\\{[^}]*\\})*`, 'g'),
      ' '
    )
  }

  // Remove common environments that don't contribute prose
  const dropEnvs = ['figure', 'table', 'tabular', 'array', 'tikzpicture', 'algorithm', 'lstlisting', 'verbatim']
  for (const env of dropEnvs) {
    result = result.replace(
      new RegExp(`\\\\begin\\{${env}\\*?\\}[\\s\\S]*?\\\\end\\{${env}\\*?\\}`, 'g'),
      ' '
    )
  }

  // Commands whose content should be kept: unwrap them
  result = result.replace(/\\(?:text(?:bf|it|rm|sf|tt|sc|up|normal|md|sl|normal)?|emph|underline|overline|widehat|widetilde|hat|tilde|bar|vec|dot|ddot|mathrm|mathbf|mathit|mathcal|mathbb|mbox|hbox|fbox)\{([^}]*)\}/g, '$1')

  // \begin{itemize/enumerate/description} environments: keep content
  result = result.replace(/\\begin\{(?:itemize|enumerate|description|list)\}/g, '')
  result = result.replace(/\\end\{(?:itemize|enumerate|description|list)\}/g, '')
  result = result.replace(/\\item(?:\[[^\]]*\])?/g, ' ')

  // Remove remaining \begin{...} and \end{...}
  result = result.replace(/\\(?:begin|end)\{[^}]*\}/g, ' ')

  // Remove \command[optional]{content} — keep content
  result = result.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\{([^}]*)\}/g, '$1')

  // Remove bare commands like \newline \noindent \\ etc.
  result = result.replace(/\\[a-zA-Z]+\*?/g, ' ')
  result = result.replace(/\\\\/g, ' ')

  // Remove remaining { } [ ]
  result = result.replace(/[{}[\]]/g, ' ')

  // Collapse whitespace
  result = result.replace(/\s+/g, ' ').trim()

  return result
}

/** Count words in text: tokens containing at least one letter */
export function countWords(text) {
  const tokens = text.split(/\s+/)
  return tokens.filter(t => /[a-zA-Z]/.test(t)).length
}

// ---------------------------------------------------------------------------
// Section parsing
// ---------------------------------------------------------------------------

const SECTION_COMMANDS = ['chapter', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph']
const SECTION_LEVEL = {
  chapter: 0,
  section: 1,
  subsection: 2,
  subsubsection: 3,
  paragraph: 4,
  subparagraph: 5,
}

/**
 * Parse sections from document body.
 * Returns array of { id, level, title, ownContent }
 * ownContent = text from this heading to the next heading at any level.
 */
export function parseSections(docBody) {
  // Build a regex that matches any section command
  const cmdPattern = SECTION_COMMANDS.map(c => `\\\\${c}`).join('|')
  // Match \section*?[optional]{title}
  const re = new RegExp(`(${cmdPattern})\\*?(?:\\[[^\\]]*\\])?\\{([^}]*)\\}`, 'g')

  const headings = []
  let match
  while ((match = re.exec(docBody)) !== null) {
    const cmd = match[1].replace('\\', '')
    headings.push({
      cmd,
      level: SECTION_LEVEL[cmd] ?? 1,
      title: match[2].trim(),
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  const sections = []
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i]
    const contentStart = h.end
    const contentEnd = i + 1 < headings.length ? headings[i + 1].start : docBody.length
    sections.push({
      id: `section-${i}`,
      level: h.level,
      title: h.title,
      ownContent: docBody.slice(contentStart, contentEnd),
    })
  }

  return sections
}

// ---------------------------------------------------------------------------
// Count words for a section given options
// ---------------------------------------------------------------------------
export function countSectionWords(content, opts = {}) {
  let text = removeComments(content)
  if (!opts.includeMath) text = removeMathEnvironments(text)
  if (!opts.includeCaptions) text = removeCaptions(text)
  text = stripLatex(text)
  return countWords(text)
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Parse the full document and return structured data.
 * @param {Object} fileRegistry  { filename: texContent }
 * @param {string} mainFileName  key in fileRegistry that has \documentclass
 */
export function parseDocument(fileRegistry, mainFileName) {
  const mainContent = fileRegistry[mainFileName]
  if (!mainContent) throw new Error(`Main file "${mainFileName}" not found in registry.`)

  // Step 1: strip comments from main, then resolve includes
  let fullText = removeComments(mainContent)
  fullText = resolveIncludes(fullText, fileRegistry)

  // Step 2: extract fixed regions
  // Strip everything up to and including \maketitle (title block may sit
  // inside \begin{document} before the first real section / abstract)
  let docBody = extractDocumentBody(fullText)
  docBody = docBody.replace(/^[\s\S]*?\\maketitle\b/, '')
  let abstractRaw = extractAbstract(docBody)
  const referencesRaw = extractReferences(docBody)
  const captions = extractCaptions(docBody)

  // Step 3: build bodyForSections — remove abstract and bibliography
  let bodyForSections = docBody
    .replace(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/gi, '')
    .replace(/\\begin\{thebibliography\}(?:\{[^}]*\})?[\s\S]*?\\end\{thebibliography\}/gi, '')

  // Step 4: detect special pre-body sections (Summary, Author Summary, etc.) dynamically
  const allSpecialDetected = detectSpecialSections(bodyForSections)

  // Abstract fallback: if no \begin{abstract} found, promote the first "Summary" special
  // section to the abstract role and remove it from the special-sections display list
  let specialSectionsDisplay = [...allSpecialDetected]
  if (!abstractRaw.trim()) {
    const idx = specialSectionsDisplay.findIndex(s => /^(abstract|summary)$/i.test(s.title))
    if (idx !== -1) {
      abstractRaw = specialSectionsDisplay[idx].raw
      specialSectionsDisplay.splice(idx, 1)
    }
  }

  // Strip ALL detected special sections from bodyForSections (reverse order keeps positions valid)
  const toStrip = [...allSpecialDetected].sort((a, b) => b.start - a.start)
  for (const { start, end } of toStrip) {
    bodyForSections = bodyForSections.slice(0, start) + bodyForSections.slice(end)
  }
  const specialSections = specialSectionsDisplay.map(({ title, raw }) => ({ title, raw }))

  // Step 5: split body into main text vs supplementary
  const suppStart = findSupplementaryStart(bodyForSections)
  const mainBody = suppStart !== null ? bodyForSections.slice(0, suppStart) : bodyForSections
  const suppBody = suppStart !== null ? bodyForSections.slice(suppStart) : ''

  // Step 6: count elements split by main / supplementary
  const equationCount = countEquations(mainBody)
  const suppEquationCount = countEquations(suppBody)
  const { figures: figureCount, tables: tableCount } = countFiguresTables(mainBody)
  const { figures: suppFigureCount, tables: suppTableCount } = countFiguresTables(suppBody)

  // Citation counts: use the full docBody (minus bibliography) so citations in the
  // abstract and special sections are never missed due to stripping
  const docBodyNoBib = docBody.replace(/\\begin\{thebibliography\}(?:\{[^}]*\})?[\s\S]*?\\end\{thebibliography\}/gi, '')
  const suppStartInFull = findSupplementaryStart(docBodyNoBib)
  const mainFull = suppStartInFull !== null ? docBodyNoBib.slice(0, suppStartInFull) : docBodyNoBib
  const suppFull = suppStartInFull !== null ? docBodyNoBib.slice(suppStartInFull) : ''
  const uniqueCitationCount = countUniqueCitations(mainFull)
  const suppUniqueCitationCount = countUniqueCitations(suppFull)

  // Step 7: parse sections
  const sections = parseSections(bodyForSections)

  return {
    sections,
    abstractRaw,
    specialSections,   // [{ title, raw }] — dynamic, from the actual document
    referencesRaw,
    captions,
    equationCount,
    figureCount,
    tableCount,
    uniqueCitationCount,
    suppEquationCount,
    suppFigureCount,
    suppTableCount,
    suppUniqueCitationCount,
    hasSupplementary: suppStart !== null,
  }
}
