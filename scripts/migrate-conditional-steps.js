#!/usr/bin/env node
/**
 * migrate-conditional-steps.js
 * Converts the old { languages, languageStepIndex } fields into
 * a conditional step object inline in the steps array.
 *
 * Before:
 *   steps: ["Press 1 for English or 2 for Spanish", "Enter card number..."]
 *   languages: [{ name: "English", key: "1" }, { name: "Spanish", key: "2" }]
 *   languageStepIndex: 0
 *
 * After:
 *   steps: [
 *     { type: "conditional", prompt: "Select your language",
 *       options: [{ label: "English", key: "1" }, { label: "Spanish", key: "2" }] },
 *     "Enter card number..."
 *   ]
 *
 * Usage:
 *   node scripts/migrate-conditional-steps.js [path/to/entries.json]
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT  = resolve(__dir, '..')
const [,, filePath] = process.argv
const FILE = filePath ? resolve(filePath) : resolve(ROOT, 'src/data/entries.json')

const entries = JSON.parse(readFileSync(FILE, 'utf8'))
let migrated = 0

for (const entry of entries) {
  if (!entry.languages || entry.languageStepIndex == null) continue

  const conditional = {
    type: 'conditional',
    prompt: 'Select your language',
    options: entry.languages.map(l => ({ label: l.name, key: l.key })),
  }

  entry.steps = entry.steps.map((step, i) =>
    i === entry.languageStepIndex ? conditional : step
  )

  delete entry.languages
  delete entry.languageStepIndex
  migrated++
}

writeFileSync(FILE, JSON.stringify(entries, null, 2))
console.log(`✅  Migrated ${migrated} entries to conditional steps format.`)
