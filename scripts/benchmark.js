#!/usr/bin/env node
/**
 * Benchmark: compare latexParser.js word counts against texcount.pl
 * Breakdown by: abstract, main text (body), captions
 *
 * Usage: node scripts/benchmark.js
 */

import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import {
  parseDocument, countSectionWords,
  stripLatex, countWords,
} from '../src/utils/latexParser.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const EXAMPLES = [
  'main_NEE.tex',
  'main_ISMEcomm.tex',
  'main_ploscomp.tex',
]

// ---------------------------------------------------------------------------
// Run texcount.pl -sub on a file.
// Parses per-section subcounts and returns:
//   { abstract, body, captions, totalText }
// "abstract"  = text+headers from the "Section: Abstract" subcount line
// "body"      = text+headers summed over all non-abstract sections
// "captions"  = captions column summed over all sections
// "totalText" = text+headers over ALL sections (abstract + body)
// ---------------------------------------------------------------------------
function runTexcount(filename) {
  const filePath = join(ROOT, 'examples', filename)
  const raw = execSync(
    `perl "${join(ROOT, 'texcount.pl')}" -sub -q "${filePath}"`,
    { encoding: 'utf8' }
  )

  let abstract = 0
  let body = 0
  let captions = 0

  // Each subcount line looks like:
  //   "  18+14+0 (1/0/0/0) Subsection: ..."
  //   "  167+1+0 (1/0/0/0) Section: Abstract"
  const lineRe = /^\s+(\d+)\+(\d+)\+(\d+)\s+\(\d+\/\d+\/\d+\/\d+\)\s+(\S+):\s*(.*)/
  for (const line of raw.split('\n')) {
    const m = line.match(lineRe)
    if (!m) continue
    const text = parseInt(m[1])
    const hdrs = parseInt(m[2])
    const caps = parseInt(m[3])
    const kind = m[4]   // "Section" | "Subsection" | ...
    const title = m[5].trim()

    captions += caps

    if (kind === 'Section' && /^abstract$/i.test(title)) {
      abstract += text + hdrs
    } else {
      body += text + hdrs
    }
  }

  return { abstract, body, captions, totalText: abstract + body }
}

// ---------------------------------------------------------------------------
// Run latexParser.js on a file.
// Returns { abstract, body, captions, totalText }
// "captions" counts words in raw caption strings (stripped of LaTeX).
// ---------------------------------------------------------------------------
function runOurs(filename) {
  const filePath = join(ROOT, 'examples', filename)
  const content = readFileSync(filePath, 'utf8')
  const registry = { [filename]: content }
  const doc = parseDocument(registry, filename)

  const opts = { includeMath: false, includeCaptions: false }

  const abstract = countSectionWords(doc.abstractRaw, opts)

  let body = 0
  for (const s of doc.specialSections) body += countSectionWords(s.raw, opts)
  for (const s of doc.sections)        body += countSectionWords(s.ownContent, opts)

  // Count caption words: strip LaTeX from each raw caption string then count
  const captions = doc.captions.reduce(
    (sum, cap) => sum + countWords(stripLatex(cap)), 0
  )

  return { abstract, body, captions, totalText: abstract + body }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function pct(a, b) {
  if (b === 0) return b === a ? '—' : '∞'
  const d = ((a - b) / b * 100).toFixed(1)
  return (d > 0 ? '+' : '') + d + '%'
}

function pad(s, n, right = false) {
  s = String(s)
  return right ? s.padEnd(n) : s.padStart(n)
}

function row(label, tc, ours, w1 = 22, w2 = 12) {
  return (
    pad(label, w1, true) +
    pad(tc,   w2) +
    pad(ours, w2) +
    pad(pct(ours, tc), 10)
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log('\n=== LaTeX word count benchmark: latexParser.js vs texcount.pl ===')
console.log('    (text only — math excluded throughout)\n')

for (const filename of EXAMPLES) {
  const tc  = runTexcount(filename)
  const our = runOurs(filename)

  const W = 46
  console.log('─'.repeat(W))
  console.log(filename)
  console.log('─'.repeat(W))
  console.log(pad('', 22, true) + pad('texcount', 12) + pad('ours', 12) + pad('diff', 10))
  console.log('─'.repeat(W))
  console.log(row('Abstract',   tc.abstract,   our.abstract))
  console.log(row('Body text',  tc.body,        our.body))
  console.log(row('Captions',   tc.captions,    our.captions))
  console.log('─'.repeat(W))
  console.log(row('Total (text+captions)',
    tc.totalText + tc.captions,
    our.totalText + our.captions))
  console.log()
}
