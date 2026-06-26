#!/usr/bin/env node
/**
 * transform.js
 * Converts scraped GetHuman data into the app's entries.json format.
 *
 * Usage:
 *   node scripts/transform.js <input.json> [output.json]
 *
 * If output.json is omitted, writes to src/data/entries.json
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dir, '..')

// ── CLI args ──────────────────────────────────────────────────────────────────
const [,, inputPath, outputPath] = process.argv
if (!inputPath) {
  console.error('Usage: node scripts/transform.js <input.json> [output.json]')
  process.exit(1)
}

const INPUT  = resolve(inputPath)
const OUTPUT = outputPath ? resolve(outputPath) : resolve(ROOT, 'src/data/entries.json')

// ── Category inference ────────────────────────────────────────────────────────
const CATEGORY_RULES = [
  { pattern: /bank|credit.union|financial|invest|brokerage|fidelity|vanguard|schwab|chase|wells.fargo|citi|capital.one|amex|american.express|discover|navy.fed/i, cat: 'banking' },
  { pattern: /irs|social.security|ssa|medicare|medicaid|dmv|passport|immigration|uscis|fema|veteran|va\.gov|usps|post.office|unemployment|ebt|snap|dept|department|gov|federal|state|county|city.of|municipal/i, cat: 'government' },
  { pattern: /at&t|verizon|t.mobile|sprint|comcast|xfinity|spectrum|cox|dish|directv|hulu|netflix|amazon.prime|charter|centurylink|lumen|frontier.comm|cricket|boost|metro.pcs/i, cat: 'telecom' },
  { pattern: /amazon|walmart|target|costco|ebay|etsy|shopify|best.buy|home.depot|lowe|ikea|wayfair|overstock|chewy|doordash|instacart|grubhub|uber.eats/i, cat: 'retail' },
  { pattern: /insurance|geico|progressive|allstate|state.farm|nationwide|usaa|liberty.mutual|travelers|aetna|humana|cigna|anthem|blue.cross|uhc|united.health/i, cat: 'insurance' },
  { pattern: /hospital|clinic|medical|health|doctor|dental|pharmacy|cvs|walgreen|rite.aid|mayo|kaiser|optum|express.scripts/i, cat: 'healthcare' },
  { pattern: /electric|gas|water|utility|utilities|pge|duke.energy|con.ed|national.grid|dominion|southern.company|fpl|center.point/i, cat: 'utilities' },
  { pattern: /airline|airways|flight|hotel|marriott|hilton|hyatt|expedia|booking|airbnb|vrbo|hertz|enterprise|avis|budget.car|car.rental|cruise|carnival|royal.caribbean/i, cat: 'travel' },
]

function inferCategory(title = '', categories = []) {
  const haystack = [title, ...categories].join(' ')
  for (const { pattern, cat } of CATEGORY_RULES) {
    if (pattern.test(haystack)) return cat
  }
  return 'other'
}

// ── IVR step extraction ───────────────────────────────────────────────────────
// Sentences we want to strip (GetHuman self-promotion / generic filler)
const STRIP_PATTERNS = [
  /our free (phone|tool|app)/i,
  /gethuman/i,
  /skip the hold time/i,
  /you can skip/i,
  /schedule a call/i,
  /calling this .{0,60} number/i,   // "Calling this Chase number should go right..."
  /should go right to a real human/i,
  /direct line/i,
  /how is this calculated/i,
  /we don'?t expect/i,
  /we['']?re (not |un)?sure/i,
  /^\s*yes[!.]?\s*this/i,
  /average hold time is/i,
  /longest hold time/i,
  /shortest (hold time|are)/i,
  /least busy day/i,
  /most busy day/i,
  /call center operates/i,
]

function shouldStrip(sentence) {
  return STRIP_PATTERNS.some(p => p.test(sentence))
}

/**
 * Split `hoursAndBusy` into IVR action sentences.
 * The field looks like:
 *   "Press 1, then 2, then enter phone number. Our free phone can also... Yes! This call center..."
 * We want only the actual navigational steps.
 */
function extractSteps(hoursAndBusy = '') {
  // Split on sentence boundaries — handle both "end. Next" and "end.Next" (no space)
  const sentences = hoursAndBusy
    .replace(/([.!?])(\s*)(?=[A-Z])/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  const steps = sentences.filter(s => !shouldStrip(s))

  // Further split comma-separated "Press X, then Y, then Z" into individual steps
  const expanded = []
  for (const step of steps) {
    // If the sentence is a chain like "Press 1, then 2, then say representative"
    if (/^press\s+[\d*#]/i.test(step) && /,\s*then\s+/i.test(step)) {
      const parts = step.split(/,\s*then\s+/i)
      expanded.push(parts[0].trim())
      for (const part of parts.slice(1).map(p => p.trim())) {
        if (!part) continue
        // Bare number like "2" → "Press 2"
        if (/^\d+[.*]?$/.test(part)) {
          expanded.push(`Press ${part}`)
        } else {
          // Capitalize first letter
          expanded.push(part.charAt(0).toUpperCase() + part.slice(1))
        }
      }
    } else {
      expanded.push(step)
    }
  }

  return expanded.filter(s => s.length > 2)
}

/** Extract hold time estimate from avgHoldTime string */
function extractHoldTime(avgHoldTime = '') {
  const match = avgHoldTime.match(/average hold time is (\d+\s+\w+)/i)
  return match ? match[1] : null
}

/** Extract operating hours */
function extractHours(avgHoldTime = '') {
  if (/24 hours a day,?\s*7 days a week/i.test(avgHoldTime)) return '24/7'
  const match = avgHoldTime.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*[-–to]+\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))/i)
  return match ? match[1] : null
}

/** Normalise phone number format */
function normalizePhone(phone = '') {
  // Strip leading country code if present without formatting
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    const d = digits.slice(1)
    return `1-${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`
  }
  if (digits.length === 10) {
    return `1-${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`
  }
  return phone // leave as-is if unusual
}

/** Clean company name: strip trailing " Customer Service", "Phone Number", etc. */
function cleanCompanyName(title = '') {
  return title
    .replace(/\s*(customer\s*service|phone\s*number|contact\s*information|support|helpline)\s*$/i, '')
    .trim()
}

// ── Main transform ─────────────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(INPUT, 'utf8'))
// Handle both a bare array and a wrapped object like { companies: [...] }
const items = Array.isArray(raw)
  ? raw
  : Array.isArray(raw.companies)
    ? raw.companies
    : [raw]

// Load existing entries to avoid duplicates (by phone number)
let existing = []
try {
  existing = JSON.parse(readFileSync(OUTPUT, 'utf8'))
} catch {
  // No existing file — start fresh
}
const existingPhones = new Set(existing.map(e => e.phone.replace(/\D/g, '')))

let added = 0
let skipped = 0

const newEntries = []

for (const item of items) {
  const phone = normalizePhone(item.phoneNumber || '')
  const phoneDigits = phone.replace(/\D/g, '')

  // Skip records with no usable phone number
  if (phoneDigits.length < 10) {
    console.warn(`  ⚠️  Skipping "${item.title || item.name}" — no valid phone number`)
    skipped++
    continue
  }

  if (existingPhones.has(phoneDigits)) {
    skipped++
    continue
  }

  const steps = extractSteps(item.hoursAndBusy || '')
  if (steps.length === 0) {
    // Still include with a placeholder step if no steps found
    steps.push('Call the number and ask to speak with a representative.')
  }

  const company = cleanCompanyName(item.title || item.name || 'Unknown')
  const category = inferCategory(item.title || item.name, item.phoneCategories || [])
  const holdTime = extractHoldTime(item.avgHoldTime || '')
  const hours    = extractHours(item.avgHoldTime || '')

  const entry = {
    id: String(Date.now() + added), // temp ID; Firestore will replace
    company,
    category,
    phone,
    phoneType: item.phoneType || 'Unknown',
    hours: hours || null,
    avgHoldTime: holdTime || null,
    sourceUrl: item.url || item.href || null,
    steps,
    status: 'approved',
    submittedAt: new Date().toISOString(),
  }

  newEntries.push(entry)
  existingPhones.add(phoneDigits)
  added++
}

const merged = [...existing, ...newEntries]
writeFileSync(OUTPUT, JSON.stringify(merged, null, 2))

console.log(`✅  Done.`)
console.log(`   Added  : ${added}`)
console.log(`   Skipped: ${skipped} (duplicates by phone)`)
console.log(`   Total  : ${merged.length} entries → ${OUTPUT}`)
