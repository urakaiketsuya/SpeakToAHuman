#!/usr/bin/env node
/**
 * extract-languages.js
 * Scans step text in entries.json for language-selection patterns and writes
 * `languages` + `languageStepIndex` back to each matching entry.
 *
 * Usage:
 *   node scripts/extract-languages.js [path/to/entries.json]
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT  = resolve(__dir, '..')
const [,, filePath] = process.argv
const FILE = filePath ? resolve(filePath) : resolve(ROOT, 'src/data/entries.json')

// ── Known languages and their aliases ─────────────────────────────────────────
const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Mandarin', 'Cantonese', 'Chinese', 'Korean', 'Japanese',
  'Russian', 'Arabic', 'Hindi', 'Vietnamese', 'Polish', 'Tagalog',
  'Haitian Creole', 'Creole', 'Greek', 'Hebrew', 'Turkish',
  'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
  'Ukrainian', 'Romanian', 'Hungarian', 'Czech', 'Slovak',
]

const LANG_PATTERN = LANGUAGES.map(l => l.replace(' ', '\\s+')).join('|')

// Matches things like:
//  "press 1 for English"   "Press 2 for Spanish"
//  "for English press 1"   "for Spanish, press 2"
//  "1 for English"         "press 1 (English)"
const PATTERNS = [
  // "press <key> for <lang>" or "press <key> (<lang>)"
  new RegExp(`press\\s+(\\d+|[*#])\\s+(?:for\\s+)?(${LANG_PATTERN})`, 'gi'),
  // "for <lang> press <key>" or "for <lang>, press <key>"
  new RegExp(`for\\s+(${LANG_PATTERN})[,]?\\s+press\\s+(\\d+|[*#])`, 'gi'),
  // "<key> for <lang>"  (bare number)
  new RegExp(`\\b(\\d+)\\s+for\\s+(${LANG_PATTERN})\\b`, 'gi'),
]

function extractLanguagesFromStep(text) {
  const found = new Map() // name → key (deduped)

  // Pattern 1: "press <key> for <lang>"
  for (const m of text.matchAll(new RegExp(
    `press\\s+(\\d+|[*#])\\s+(?:for\\s+)?(${LANG_PATTERN})`, 'gi'
  ))) {
    const key  = m[1]
    const name = toTitleCase(m[2])
    found.set(name, key)
  }

  // Pattern 2: "for <lang>[,] press <key>"
  for (const m of text.matchAll(new RegExp(
    `for\\s+(${LANG_PATTERN})[,]?\\s+press\\s+(\\d+|[*#])`, 'gi'
  ))) {
    const name = toTitleCase(m[1])
    const key  = m[2]
    found.set(name, key)
  }

  // Pattern 3: "<key> for <lang>"
  for (const m of text.matchAll(new RegExp(
    `\\b(\\d+)\\s+for\\s+(${LANG_PATTERN})\\b`, 'gi'
  ))) {
    const key  = m[1]
    const name = toTitleCase(m[2])
    found.set(name, key)
  }

  return found
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

// ── Main ───────────────────────────────────────────────────────────────────────
const entries = JSON.parse(readFileSync(FILE, 'utf8'))
let updated = 0

for (const entry of entries) {
  if (!Array.isArray(entry.steps)) continue

  let bestStep = -1
  let bestMap  = new Map()

  for (let i = 0; i < entry.steps.length; i++) {
    const map = extractLanguagesFromStep(entry.steps[i])
    if (map.size > bestMap.size) {
      bestMap  = map
      bestStep = i
    }
  }

  // Only store if we found 2+ languages (single-language steps aren't selectors)
  if (bestMap.size >= 2) {
    const options = [...bestMap.entries()]
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .map(([name, key]) => ({ label: name, key }))

    entry.steps = entry.steps.map((step, i) =>
      i === bestStep
        ? { type: 'conditional', prompt: 'Select your language', options }
        : step
    )

    // Remove old format fields if present
    delete entry.languages
    delete entry.languageStepIndex
    updated++
  }
}

writeFileSync(FILE, JSON.stringify(entries, null, 2))

console.log(`✅  Done. ${updated} entries updated with language data.`)
