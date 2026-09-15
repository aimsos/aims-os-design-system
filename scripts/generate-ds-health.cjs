#!/usr/bin/env node
/**
 * generate-ds-health.cjs — AIMS OS Design System
 *
 * Builds src/ds-health.json, the data behind the DS Health page in the
 * catalog. Two inputs, joined here:
 *
 *   audit-tokens.cjs --json   every finding (generated, never edited)
 *   ds-decisions.json         what we decided about each one (hand-kept)
 *
 * Runs the same audit that CI and .husky/pre-push run, so the page can never
 * disagree with what actually blocks a push.
 *
 * Why the decisions live in their own file: a finding without a verdict gets
 * re-litigated every time someone new sees it. The Stepper case — a local
 * `Stepper` that was a numeric input, flagged as shadowing the DS wizard
 * `Stepper` — was correctly left alone, and without a written record the next
 * person would ask again. The page's value is the verdict column, not the list.
 *
 * Spacing warnings are excluded: 39 of them, informational by design, and they
 * are not DS-consistency decisions. They stay in the terminal audit.
 *
 * Run: node scripts/generate-ds-health.cjs   (or npm run generate:ds-health)
 */

const { execFileSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const OUT = path.join(ROOT, "src/ds-health.json")
const DECISIONS = path.join(ROOT, "ds-decisions.json")

// Findings the page is about. Spacing is deliberately not here.
const TRACKED = {
  "shadow-component": {
    label: "Hand-rolled DS component",
    blurb:
      "A screen defines a component whose name collides with a real DS export. This matches names, not behaviour — sometimes the two are unrelated components that share a word.",
  },
  "possible-card-reimpl": {
    label: "Hand-rolled card",
    blurb:
      "A local wrapper renders card-like styling of its own instead of composing CardContainer. Usually a missing composition, not a missing variant — the fix is to keep the wrapper and put CardContainer inside it.",
  },
  "main-overuse": {
    label: 'variant="main" overuse',
    blurb:
      'More than one variant="main" in a file. main belongs to the Header primaryAction only — but the check counts per file, and one file can hold several screens.',
  },
  orphan: {
    label: "Orphaned component",
    blurb: "Committed to src/components/ but imported nowhere. Either wire it into a screen or remove it.",
  },
  "duplicate-component": {
    label: "Same component in two screens",
    blurb:
      "Two screens define a component with the same name, and neither of them is the DS. No copy is canonical, " +
      "so they drift — WidgetGlyph was a 36px borderless tile in one screen and a 32px bordered one in the other. " +
      "Unlike the checks above this one has no heuristic: either a name is defined twice or it is not.",
  },
  "widget-vocab": {
    label: "Second widget vocabulary",
    blurb:
      "A screen declares its own list of widget types. There is one catalog — WIDGET_DEFS in src/App.tsx, " +
      "surfaced as Patterns → Widgets, 14 entries each with a size class, grid widths, states and a dontUse list. " +
      "Three parallel vocabularies existed at once and agreed on two entries.",
  },
}

const raw = execFileSync("node", [path.join(ROOT, "scripts/audit-tokens.cjs"), "--json"], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
})
const { errors, warnings } = JSON.parse(raw)

let decisions = {}
try {
  decisions = JSON.parse(fs.readFileSync(DECISIONS, "utf8")).decisions || {}
} catch {
  console.warn("  (no ds-decisions.json — every finding will show as undecided)")
}

// Key on type + file + name, never the line: lines move on every edit and a
// decision must survive that. Findings without a name (main-overuse is
// per-file) key on the file alone.
// Separator-insensitive, matching audit-tokens.cjs — a waiver written on
// Windows must resolve to the same finding here as it does in the terminal
// audit, or the DS Health page and CI disagree about what is waived.
const posix = (k) => k.replace(/\\/g, "/")
const keyOf = (f) => posix([f.type, f.file, f.name].filter(Boolean).join(":"))

// The decisions file is hand-written, so its keys get normalised too rather
// than trusting whoever typed them to have been on the same OS as CI.
const decisionsByKey = Object.fromEntries(
  Object.entries(decisions).map(([k, v]) => [posix(k), v])
)

const findings = warnings
  .filter((w) => TRACKED[w.type])
  .map((w) => {
    const key = keyOf(w)
    const d = decisionsByKey[key]
    return {
      key,
      type: w.type,
      typeLabel: TRACKED[w.type].label,
      file: w.file,
      line: w.line ?? null,
      name: w.name ?? null,
      count: w.count ?? null,
      lines: w.lines ?? null,
      message: w.message,
      verdict: d?.verdict ?? "undecided",
      why: d?.why ?? null,
      decidedBy: d?.decidedBy ?? null,
      decidedOn: d?.decidedOn ?? null,
    }
  })
  .sort((a, b) => a.type.localeCompare(b.type) || a.file.localeCompare(b.file))

// Repeats are the signal worth surfacing. The same hand-rolled name appearing
// in three screens is not three mistakes — it is one missing DS component with
// evidence of demand behind it.
const repeats = {}
findings.forEach((f) => {
  if (!f.name) return
  const k = `${f.type}:${f.name}`
  ;(repeats[k] ||= []).push(f.file)
})
findings.forEach((f) => {
  if (!f.name) return
  f.repeatCount = repeats[`${f.type}:${f.name}`].length
})

// Decisions whose finding no longer exists — someone fixed it, or the file was
// renamed. Surfaced so ds-decisions.json does not silently rot the way specs/
// did (35 files stale for a month before anyone noticed).
const liveKeys = new Set(findings.map((f) => f.key))
const staleDecisions = Object.keys(decisions).filter((k) => !liveKeys.has(k))

const byVerdict = findings.reduce((acc, f) => ((acc[f.verdict] = (acc[f.verdict] || 0) + 1), acc), {})

// ── Widget candidates ───────────────────────────────────────────────────────
// Parsed rather than imported, because this script is CommonJS and the catalog
// is a TS module. A candidate is an entry with `catalogId: null` — a widget
// type a prototype offers that WIDGET_DEFS does not document yet. Not a
// warning: nothing is wrong, it just is not specified.
const CATALOG_SRC = path.join(ROOT, "src/lib/widget-catalog.ts")
let widgetCandidates = []
if (fs.existsSync(CATALOG_SRC)) {
  const src = fs.readFileSync(CATALOG_SRC, "utf8")
  const row = /\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*category:\s*"([^"]+)",[^}]*?catalogId:\s*(null|"[^"]*")[^}]*?bestFor:\s*"([^"]+)"/g
  let m
  while ((m = row.exec(src)) !== null) {
    if (m[4] === "null") {
      widgetCandidates.push({ id: m[1], label: m[2], category: m[3], bestFor: m[5] })
    }
  }
}

const out = {
  generatedFrom: "scripts/audit-tokens.cjs --json + ds-decisions.json + src/lib/widget-catalog.ts",
  note: "Generated by scripts/generate-ds-health.cjs — do not edit. Record verdicts in ds-decisions.json.",
  legend: Object.fromEntries(Object.entries(TRACKED).map(([k, v]) => [k, v])),
  totals: {
    hardcodedColourErrors: errors.length,
    findings: findings.length,
    widgetCandidates: widgetCandidates.length,
    ...byVerdict,
  },
  staleDecisions,
  widgetCandidates,
  findings,
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n")

console.log(`DS Health — ${findings.length} finding(s) across ${new Set(findings.map((f) => f.file)).size} file(s)`)
Object.entries(byVerdict).forEach(([v, n]) => console.log(`  ${v.padEnd(10)} ${n}`))
if (staleDecisions.length) {
  console.log(`\n  ${staleDecisions.length} decision(s) no longer match any finding — prune them from ds-decisions.json:`)
  staleDecisions.forEach((k) => console.log(`    ${k}`))
}
if (widgetCandidates.length) {
  console.log(`\n  ${widgetCandidates.length} widget type(s) offered by a prototype with no DS spec yet:`)
  widgetCandidates.forEach((w) => console.log(`    ${w.category.padEnd(14)} ${w.label}`))
}
console.log(`\nWrote ${path.relative(ROOT, OUT)}`)
