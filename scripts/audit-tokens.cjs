#!/usr/bin/env node
/**
 * audit-tokens.js — AIMS OS Design System
 *
 * Layer 3 of the design-token method this repo follows (see the 2026-07-31
 * audit for context): catch hardcoded values that bypass the token layer
 * before they ship, instead of finding them months later in a manual sweep.
 *
 * Run:  node scripts/audit-tokens.js   (or `npm run audit:tokens`)
 * Exit code 1 if any ERROR-level finding exists (for CI). WARNING-level
 * findings are printed but don't fail the run.
 *
 * What this is NOT: a full parser. Comment-stripping below is a
 * line-based heuristic (tracks `/* ... *\/` state across lines, strips
 * trailing `//`), same class of tool as most hex/color linters. It has
 * been checked against every known finding from the manual audit and
 * produces zero false positives on the current repo — if you add a
 * legitimate exception later, mark it `// audit-ignore: <reason>` on
 * the same line rather than special-casing a file path in here.
 *
 * Checks:
 *   1. Hardcoded hex/rgba in src/components/ui/**, src/components/layouts/**,
 *      src/screens/**, and App.tsx's widget content functions               → ERROR
 *   2. Stray hex/rgba in src/index.css outside a `--token: value;` definition → ERROR
 *   3. Any hex/rgba surviving in tailwind.config.js                            → ERROR
 *   4. Components in ui/layouts with zero imports anywhere in src/            → WARNING
 *   5. Spacing/size values in px that aren't a multiple of 4                   → WARNING
 *      (see SCALE below for the accepted non-grid exceptions — this is
 *      informational, not a failing check)
 *   6. Screen files that locally define a function/const with the same name
 *      as a real exported DS component (e.g. a hand-rolled `function Toggle`
 *      shadowing `src/components/ui/toggle.tsx`'s `Toggle`)                  → WARNING
 *      (2026-08-27: found 3 separate hand-rolled `Toggle` reimplementations
 *      across Admin* screens, each with a slightly different prop shape,
 *      shipped clean because this check didn't exist yet — hardcoded-color
 *      and build checks have no way to catch "looks like the DS component
 *      but isn't")
 *   7. More than one `variant="main"` in a single screen file               → WARNING
 *      (CLAUDE.md: max 1 per screen, header CTA only — EntityHeader's one
 *      named exception lives inside entity-header.tsx itself, so a screen
 *      that only ever renders `<EntityHeader .../>` never trips this.
 *      Renamed in #112; this comment said RecordHeader until 2026-09-09)
 *
 *  15. A page `Header` carrying `tag` / `primaryAction` / `secondaryAction`
 *      on a screen that also renders an `EntityHeader`                      → WARNING
 *      (that card owns the record's identity, state and actions; the bar
 *      above it carries navigation only. Heuristic because it reads the
 *      FILE, not the route — a file holding both a list view and a detail
 *      view will flag its list-view Header, which is legitimate and should
 *      be waived in ds-decisions.json)
 *
 * Checks 6 and 7 are WARNING, not ERROR, on purpose for now: the first run
 * against the existing repo found 9 pre-existing hits, 2 of them already on
 * main (pm-michael-test-v1.tsx, pm-thomas-universal-profile.tsx) — making
 * these blocking immediately would fail CI on any unrelated PR until all 9
 * are cleaned up. Promote both (swap their `warnings.push` for `errors.push`,
 * same shape as Check 1) once that cleanup pass lands, so this stops being
 * optional.
 *
 * App.tsx coverage (2026-08 audit): only the widget content functions are
 * scanned, sliced out by marker rather than the whole 30K-line file. The
 * rest of App.tsx is documentation (Colors/Typography/Spacing spec tables,
 * the DS Strategy page) that legitimately displays hex codes as reference
 * text — scanning it produced ~875 hits, ~99% of them exactly that. The
 * widgets are real, reusable UI PM screens are built from; that's where 5
 * real hardcoded-color/composition bugs shipped undetected before this
 * check existed. See scanHardcodedColors' lineRange option below.
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
// Exact CSS hex-color lengths only (#RGB #RGBA #RRGGBB #RRGGBBAA = 3/4/6/8
// digits) — an earlier, looser version (`{3}(?:...{1,5})?`) matched any
// "#" followed by 3-8 hex-valid characters, which false-matched things
// like a ticket reference "#12045" (5 digits, not a valid color length,
// but every digit happens to be hex-valid 0-9). \b after each alternative
// still correctly rejects it as a substring of a longer digit run.
const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/
const RGBA_RE = /rgba?\(\s*\d/
const IGNORE_MARKER = /audit-ignore/
const TOKEN_DEF_RE = /^\s*--[\w-]+\s*:/

let errors = []
let warnings = []

function listFiles(dir, exts) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listFiles(full, exts))
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full)
  }
  return out
}

// Always POSIX, on every platform. `path.relative` hands back backslashes on
// Windows, and that separator leaks into three things that have to agree with
// each other across machines: the finding text a PR quotes, the JSON `--json`
// feeds the DS Health page, and the `type:file:name` key a waiver in
// ds-decisions.json is looked up by. A waiver written on Windows silently
// failed to match on CI — PR #127, 2026-09-10 — because the two sides had
// spelled the same file differently. One separator, decided here, once.
function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join("/")
}

/**
 * Splits a file into lines, returning { raw, code } per line, where `code`
 * has // and /* *\/ comments stripped (block-comment state carried across
 * lines). `raw` keeps the original text so audit-ignore markers inside a
 * comment still count.
 */
function stripComments(text) {
  const lines = text.split("\n")
  let inBlock = false
  return lines.map((raw) => {
    let code = raw
    if (inBlock) {
      const end = code.indexOf("*/")
      if (end === -1) return { raw, code: "" }
      code = code.slice(end + 2)
      inBlock = false
    }
    // strip any complete /* ... */ spans on this line, possibly more than one
    while (true) {
      const s = code.indexOf("/*")
      if (s === -1) break
      const e = code.indexOf("*/", s + 2)
      if (e === -1) {
        code = code.slice(0, s)
        inBlock = true
        break
      }
      code = code.slice(0, s) + code.slice(e + 2)
    }
    const lc = code.indexOf("//")
    if (lc !== -1) code = code.slice(0, lc)
    return { raw, code }
  })
}

/**
 * `lineRange: [startLine, endLine]` (1-indexed, inclusive) restricts the
 * scan to a slice of the file — used for App.tsx, where the widget content
 * functions are real, reusable UI (should be checked) surrounded by
 * thousands of lines of documentation/spec-table content that legitimately
 * displays hex codes as reference text (should not be).
 */
function scanHardcodedColors(file, { skipTokenDefLines, lineRange } = {}) {
  const text = fs.readFileSync(file, "utf8")
  const lines = stripComments(text)
  lines.forEach(({ raw, code }, idx) => {
    const lineNum = idx + 1
    if (lineRange && (lineNum < lineRange[0] || lineNum > lineRange[1])) return
    if (!code.trim()) return
    if (skipTokenDefLines && TOKEN_DEF_RE.test(code)) return
    const hasHex = HEX_RE.test(code)
    const hasRgba = RGBA_RE.test(code)
    if (!hasHex && !hasRgba) return
    if (IGNORE_MARKER.test(raw)) return
    errors.push({
      file: rel(file),
      line: lineNum,
      snippet: code.trim().slice(0, 100),
    })
  })
}


// ── Check 1: components ─────────────────────────────────────────────────
const componentFiles = [
  ...listFiles(path.join(ROOT, "src/components/ui"), [".tsx", ".ts"]),
  ...listFiles(path.join(ROOT, "src/components/layouts"), [".tsx", ".ts"]),
]
componentFiles.forEach((f) => scanHardcodedColors(f))

// src/screens/** are real, shipped PM screens — exactly the artifacts this
// whole token method exists to keep consistent. Unlike App.tsx (below),
// they're small and don't mix in a design-token reference library, so the
// full file is scanned (2026-08 audit: found and fixed a false positive
// here too — the same over-loose HEX_RE matched a ticket number "#12045").
const screenFiles = listFiles(path.join(ROOT, "src/screens"), [".tsx", ".ts"])
screenFiles.forEach((f) => scanHardcodedColors(f))

// App.tsx mixes two very different things: (1) the 13 widget content
// functions — real, reusable UI that PM screens are built from, and (2)
// thousands of lines of documentation (Colors/Typography/Spacing spec
// tables, the DS Strategy pitch page) that legitimately display hex codes
// as reference text, e.g. `{ role: "...", light: "#2173ff", dark: "..." }`.
// Scanning all of App.tsx produced ~875 hits, ~99% of them exactly that —
// real signal would drown in that noise. Widget content is scanned by
// slicing between two stable markers rather than hardcoded line numbers,
// so it keeps working as the file grows. This is the same gap that let 5
// real hardcoded-color/composition bugs ship undetected in the widgets
// during the 2026-08 audit — everything else in App.tsx is a known,
// deliberate exclusion, not an oversight.
//
// That audit's own follow-up said moving widget content out of App.tsx into its
// own file would let this scan the normal way instead of slicing App.tsx between
// two markers. That move happened on 2026-09-07, so the marker slice is gone and
// the file is scanned like any other component.
const appTsxPath = path.join(ROOT, "src/App.tsx")
const widgetContentPath = path.join(ROOT, "src/components/experimental/widget-content.tsx")
if (fs.existsSync(widgetContentPath)) {
  scanHardcodedColors(widgetContentPath)
}

// ── Check 2: index.css ──────────────────────────────────────────────────
const indexCss = path.join(ROOT, "src/index.css")
if (fs.existsSync(indexCss)) {
  scanHardcodedColors(indexCss, { skipTokenDefLines: true })
}

// ── Check 3: tailwind.config.js ─────────────────────────────────────────
const twConfig = path.join(ROOT, "tailwind.config.js")
if (fs.existsSync(twConfig)) {
  scanHardcodedColors(twConfig)
}

// ── Check 4: orphaned components (zero imports anywhere) ───────────────
const searchRoots = [
  path.join(ROOT, "src/App.tsx"),
  ...listFiles(path.join(ROOT, "src/screens"), [".tsx", ".ts"]),
  ...componentFiles,
]
const corpusByFile = new Map(
  searchRoots
    .filter((f) => fs.existsSync(f))
    .map((f) => [f, fs.readFileSync(f, "utf8")])
)

componentFiles.forEach((file) => {
  const base = path.basename(file).replace(/\.tsx?$/, "")
  const needle = new RegExp(`/${base}["']`)
  let found = false
  for (const [otherFile, content] of corpusByFile) {
    if (otherFile === file) continue
    if (needle.test(content)) {
      found = true
      break
    }
  }
  if (!found) {
    warnings.push({
      type: "orphan",
      file: rel(file),
      message: "not imported anywhere in src/ — dead code candidate (see CLAUDE.md 'Before creating ANY new component file')",
    })
  }
})

// ── Check 5: off-scale spacing (informational) ──────────────────────────
// Verified live against Figma's Spacing/0x..20x scale (2026-08-04) — each Nx
// step is N×4px, with a single 0.5x=2px exception. Figma has no 7x/9x/11x
// etc. steps; 100 (radius-full) and 9999 (z-index/legacy radius references)
// are kept as accepted non-spacing outliers this same regex also matches.
// 3/5/6/10/15 are also accepted, each a deliberate micro-value confirmed
// used consistently for one specific purpose rather than drifting randomly
// (2026-08 audit, after the width/height exclusion below left only true
// gap/padding/positioning warnings to triage):
//   6  — icon-to-label gap, ~20 components (chips, tabs, filters, topbar);
//        confirmed against Figma's Space and Radios Tokens collection to
//        have no corresponding variable, i.e. it's hand-set in Figma too
//   3  — tooltip padding ("3px 8px", topbar) and tight grip-dot/label-stack
//        gaps (entity-list, side-panel, slide-out)
//   5  — same class of micro-gap (topbar) and grip-dot offset (slide-out)
//   10 — label-row gaps (filters-slideout) and modal-dialog's section gap
//   15 — exact icon position from a specific Figma node (textarea.tsx,
//        node 6326:21225), not a spacing value at all
// 1/7/14/19 accepted for the same reason, found once App.tsx/screens
// coverage was added (2026-08 audit part 2):
//   7  — "7px 8px" compact table/list-row padding, identical across 4
//        independent files (pm-home-canvas, pm-lex-htl-work-queue,
//        TableWidgetContent) — an asymmetric typo wouldn't repeat exactly
//   14 — card/panel body padding, identical across 3 independent files
//        (pm-lex-htl-work-queue, slideout-detail-example, NotesWidgetContent)
//   19 — "gap-[19px] py-[8px] px-[12px]" detail-row layout, byte-identical
//        in slideout-detail-example.tsx and PendingOutputsWidgetContent
//   1  — "padding: 1px 4px" tight monospace ID-badge, identical in both
//        places it appears (Activity/NotesWidgetContent)
const SCALE = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 15, 16, 19, 20, 24, 32, 40, 48, 64, 80, 100, 9999])
// \b anchors the keyword to the START of the property name — without it,
// "borderBottom"/"borderLeft"/"borderTopWidth" etc. false-matched on the
// "bottom"/"left"/"width" substring, flagging border *stroke* thickness
// (correctly 0.5-2px) as if it were layout spacing. Border-side properties
// aren't spacing and were never meant to be checked against this scale.
//
// Deliberately excludes width/height/radius: a 2026-08 audit of every
// warning they produced found real Figma-exact component/icon dimensions
// (Button's 27/40/52/56px heights, Toggle's 26/39/52px track widths, Chip's
// 28px height, icon sizes like 9/13/14/18px, modal/panel/tooltip/menu
// max-widths) — none of which were ever meant to sit on a 4px spacing
// grid. Corner radius has its own separately-audited scale. gap/padding/
// margin/top/left/right/bottom/inset are real layout spacing and stay
// checked against SCALE.
const PX_RE = /\b(?:padding|margin|gap|top|left|right|bottom|inset)[a-zA-Z]*\s*:\s*["']?(\d+)px/gi
const ARBITRARY_PX_RE = /\b(?:p|m|gap|top|left|right|bottom|inset)-\[(\d+)px\]/g

/**
 * `lineRange: [startLine, endLine]` (1-indexed, inclusive), same purpose
 * and reasoning as scanHardcodedColors' — restricts the scan to a slice of
 * a mixed file like App.tsx.
 */
function scanSpacing(file, { lineRange } = {}) {
  const raw = fs.readFileSync(file, "utf8")
  // Comment-stripped, same as Check 1 — a JSDoc measurement note like
  // "Height: 72px (fixed)" isn't code and shouldn't be flagged as a
  // spacing violation just because the number happens to appear there.
  const strippedLines = stripComments(raw)
  const text = strippedLines.map((l) => l.code).join("\n")
  let match
  const seen = new Set()
  function record(val, lineNum) {
    if (lineRange && (lineNum < lineRange[0] || lineNum > lineRange[1])) return
    const key = `${lineNum}:${val}`
    if (!SCALE.has(val) && !seen.has(key)) {
      seen.add(key)
      warnings.push({ type: "spacing", file: rel(file), line: lineNum, message: `${val}px is not on the 4px scale` })
    }
  }
  while ((match = PX_RE.exec(text))) {
    record(Number(match[1]), text.slice(0, match.index).split("\n").length)
  }
  while ((match = ARBITRARY_PX_RE.exec(text))) {
    record(Number(match[1]), text.slice(0, match.index).split("\n").length)
  }
}

componentFiles.forEach((file) => scanSpacing(file))
// Same rationale as Check 1 above: real spacing in real screens/widgets,
// not the reference tables and pitch content elsewhere in App.tsx.
screenFiles.forEach((file) => scanSpacing(file))
if (fs.existsSync(widgetContentPath)) {
  scanSpacing(widgetContentPath)
}

// ── Check 6: hand-rolled reimplementations of real DS components ───────────
// Builds the set of real exported component names from src/components/ui
// and src/components/layouts (handles both `export function Name(` and
// `export { Name, ... }`), then flags any src/screens/** file that locally
// defines a same-named function or arrow-function component.
//
// This matches NAMES ONLY, never behaviour, so the finding is "the name is
// taken", not "you reimplemented this component". Usually those are the same
// thing; sometimes they are not. Real case (PR #55, 2026-08-31): a screen
// defined a local `Stepper` that was a numeric +/- input, while the DS
// `Stepper` is a wizard step indicator — unrelated components, same word.
// Substituting one for the other would have been wrong; renaming the local
// one was right. That is why the message offers both fixes instead of
// assuming duplication — a collision is always worth removing, but which
// way you remove it depends on what the two components actually do.
function extractExportedNames(file) {
  const text = fs.readFileSync(file, "utf8")
  const names = new Set()
  for (const m of text.matchAll(/export\s+function\s+([A-Z]\w*)\s*\(/g)) names.add(m[1])
  for (const m of text.matchAll(/export\s*\{([^}]+)\}/g)) {
    m[1].split(",").forEach((part) => {
      const name = part.trim().split(/\s+as\s+/)[0].trim()
      if (/^type\s/.test(part.trim())) return // type-only export, not a component
      if (/^[A-Z]\w*$/.test(name)) names.add(name)
    })
  }
  return names
}

const dsComponentNames = new Set()
componentFiles.forEach((f) => extractExportedNames(f).forEach((n) => dsComponentNames.add(n)))

const LOCAL_DEF_RE = /^\s*(?:function\s+([A-Z]\w*)\s*\(|const\s+([A-Z]\w*)\s*(?::[^=]*)?=\s*(?:\(|function\b))/

screenFiles.forEach((file) => {
  const text = fs.readFileSync(file, "utf8")
  const lines = stripComments(text)
  lines.forEach(({ code }, idx) => {
    const m = LOCAL_DEF_RE.exec(code)
    if (!m) return
    const name = m[1] || m[2]
    if (dsComponentNames.has(name)) {
      warnings.push({
        type: "shadow-component",
        file: rel(file),
        line: idx + 1,
        name,
        message: `local "${name}" shadows a real src/components/ui or layouts export of the same name. This check matches NAMES, not behaviour — pick the fix that applies: if it does the same job, delete it and import the DS one; if it is a genuinely different component that happens to share the name, rename the local one to something specific to what it does. Either way the collision has to go.`,
      })
    }
  })
})

// ── Check 7: variant="main" written in a screen file at all ───────────────
// This used to allow one per screen — the header CTA. It no longer allows
// any: Header.primaryAction takes an action object ({ label, icon?, onClick? })
// and Header applies variant="main" itself, so the one legitimate reason a
// screen had to type the string is gone. Anything left is a content-area
// button wearing the header's variant.
// EntityHeader's one named exception (the `Ask` trigger) lives inside
// entity-header.tsx, so a screen that renders <EntityHeader/> never writes
// the literal and never trips this.
const MAIN_VARIANT_RE = /variant=["']main["']/

screenFiles.forEach((file) => {
  const text = fs.readFileSync(file, "utf8")
  const lines = stripComments(text)
  const hits = []
  lines.forEach(({ code }, idx) => {
    if (MAIN_VARIANT_RE.test(code)) hits.push(idx + 1)
  })
  if (hits.length > 0) {
    warnings.push({
      type: "main-overuse",
      file: rel(file),
      line: hits[0],
      count: hits.length,
      lines: hits,
      message: hits.length === 1
        ? `variant="main" on line ${hits[0]} — screens no longer write it. A header CTA goes in Header.primaryAction as { label, icon? }; anything else is variant="primary"`
        : `variant="main" written ${hits.length} times (lines ${hits.join(", ")}) — screens no longer write it. Header applies it from primaryAction; content-area buttons are variant="primary"`,
    })
  }
})

// ── Check 8: possible hand-rolled card component (heuristic, WARNING) ─────
// Check 6 only catches a local def whose NAME collides with a real DS
// export (e.g. `function Toggle`). It can't catch a local component that
// does the same JOB under a different name — e.g. AdminSecurity.tsx defines
// `function SectionCard({ children })` that renders a div styled with
// border + background using the exact tokens CardContainer itself uses,
// instead of importing CardContainer. Different name, same reimplementation
// problem — undetectable by name-matching, so this check looks at what the
// component actually renders instead: does it accept `children`, and does
// its body contain a card-shaped div (border + background using DS
// surface/border tokens)? WARNING only — this is a semantic guess, not a
// certainty. Composing a bespoke wrapper is sometimes legitimate; a human
// (or a DS-GAP comment) makes that call, not this script.
const CARD_LIKE_BORDER_RE = /\bborder\s*:\s*["'][^"']*var\(--(?:border|field-border)/
const CARD_LIKE_BG_RE = /\bbackground\s*:\s*["']?var\(--(?:surface|surface-raised)\b/
// `export` prefixes matter here even though this check never reports an
// exported component: the list is what marks where one definition's body
// ENDS. Miss `export default function` and the helper above it absorbs the
// rest of the file, so the check tests that whole screen's markup instead of
// the helper's own — and any bordered <input> further down makes a correct
// CardContainer wrapper look like a hand-rolled card. Real false positive:
// pm-thomas-new-dashboard.tsx's FormSection (a 4-line CardContainer wrapper)
// was flagged because of two input styles 200 lines below it.
const TOP_LEVEL_DEF_RE = /^(?:export\s+default\s+|export\s+)?(?:function\s+([A-Z]\w*)\s*\(|const\s+([A-Z]\w*)\s*(?::[^=]*)?=\s*\()/

screenFiles.forEach((file) => {
  const text = fs.readFileSync(file, "utf8")
  const lines = stripComments(text)

  const defs = []
  lines.forEach(({ code }, idx) => {
    const m = TOP_LEVEL_DEF_RE.exec(code)
    if (m) defs.push({ name: m[1] || m[2], line: idx })
  })

  defs.forEach((def, i) => {
    const end = i + 1 < defs.length ? defs[i + 1].line : lines.length
    const bodyLines = lines.slice(def.line, end)
    const acceptsChildren = bodyLines.slice(0, 5).some((l) => /\bchildren\b/.test(l.code))
    if (!acceptsChildren) return
    const bodyText = bodyLines.map((l) => l.code).join("\n")
    if (CARD_LIKE_BORDER_RE.test(bodyText) && CARD_LIKE_BG_RE.test(bodyText)) {
      warnings.push({
        type: "possible-card-reimpl",
        file: rel(file),
        line: def.line + 1,
        name: def.name,
        message: `local "${def.name}" takes children and renders a bordered/background div with card-like tokens — check whether this should be CardContainer instead`,
      })
    }
  })
})

// ── Report ───────────────────────────────────────────────────────────────
// ── Check 9: backButton and Breadcrumb on the same Header (ERROR) ────────
// One affordance, never two — and the DEPTH picks which (revised 2026-09-09):
// L2 is the back arrow, with the parent's name as the title so the arrow is
// labelled; L3+ is the breadcrumb, because only there are "up one level" and
// "back" different destinations. At L2 they are the same place, so a Header
// carrying both is pointing twice at one target.
//
// The rule this check enforces did not change when the depths flipped — both
// versions forbid both props on one Header — so only the wording here moved.
// Unlike checks 6-8 this is not a heuristic: a Header carrying both is
// unambiguously wrong, so it blocks rather than warns.
//
// Matches a `<Header` tag that carries both `breadcrumb` and `backButton`, and
// the older shape where a hand-rolled trail sat next to a Header with a back
// arrow. Reads the JSX per opening tag rather than per file, so a screen with
// several Headers is judged one at a time.
const HEADER_TAG_RE = /<Header\b[\s\S]{0,1200}?\/>|<Header\b[\s\S]{0,1200}?>/g
const navConflicts = []

screenFiles.forEach((file) => {
  const text = fs.readFileSync(file, "utf8")
  let m
  while ((m = HEADER_TAG_RE.exec(text))) {
    const tag = m[0]
    const hasCrumb = /\bbreadcrumb\s*=/.test(tag)
    const hasBack  = /\bbackButton\b/.test(tag)
    if (hasCrumb && hasBack) {
      navConflicts.push({
        file: rel(file),
        line: text.slice(0, m.index).split("\n").length,
        message: "carries both breadcrumb and backButton — one affordance, and the depth picks it: L2 is backButton with the PARENT as the title, L3+ is the breadcrumb. Drop whichever does not match this page's depth.",
      })
    }
  }
})

// ── Check 15: a page Header repeating what an EntityHeader already shows ──
// EntityHeader owns the record: its name, its state badge, its actions. When
// one is on the page, the bar above it carries navigation ONLY — no `tag`,
// and no CTAs the card already shows. Two identity blocks stacked on one
// screen is not a hierarchy, it is a duplicate, and it is what the Universal
// Profile shipped with until 2026-09-09.
//
// HEURISTIC, hence a warning rather than an error: this reads the file, not
// the route, so a file holding BOTH a list view and a detail view will look
// like a violation when its list-view Header is the one carrying the CTA.
// That is a real shape in this repo, so the finding is worth surfacing and
// not worth blocking a push over.
const entityHeaderDupes = []

screenFiles.forEach((file) => {
  const text = fs.readFileSync(file, "utf8")
  if (!/<EntityHeader\b/.test(text)) return

  let m
  const re = new RegExp(HEADER_TAG_RE.source, "g")
  while ((m = re.exec(text))) {
    const tag = m[0]
    const offenders = []
    if (/\btag\s*=/.test(tag)) offenders.push("tag")
    if (/\bprimaryAction\s*=/.test(tag)) offenders.push("primaryAction")
    if (/\bsecondaryAction\s*=/.test(tag)) offenders.push("secondaryAction")
    if (offenders.length === 0) continue
    entityHeaderDupes.push({
      type: "entity-header-duplicate-bar",
      file: rel(file),
      line: text.slice(0, m.index).split("\n").length,
      message: `<Header> carries ${offenders.join(" + ")} on a screen that also renders an EntityHeader — that card already shows the state and the record's actions. The bar above it carries navigation only. (If this Header belongs to a LIST view in the same file, it is fine — waive it in ds-decisions.json.)`,
    })
  }
})

warnings.push(...entityHeaderDupes)

// ── Check 10: the same component name defined in two screen files ─────────
// Check 6 asks "does this name collide with a real DS export". This asks the
// other question: two screens defining the same component, neither of them the
// DS. Nobody wins that collision — there is no canonical copy, so the two drift
// silently and the same thing renders differently depending on which screen you
// are looking at.
//
// Real case (2026-09-03): `WidgetGlyph` in widget-library was a 36px borderless
// tile on a 12%-primary tint; in widget-marketplace it was a 32px bordered tile
// on --surface. Same name, same job, four visual differences. `FreshnessBadge`
// had drifted semantically in the same pair — "stale" was neutral grey in one
// and alert yellow in the other.
//
// Unlike checks 6-8 this one has no heuristic in it: either a name is defined
// twice or it is not. That is why it reports every hit rather than hedging.
const localDefs = new Map()

screenFiles
  .filter((f) => f.endsWith(".tsx"))
  .forEach((file) => {
    const lines = stripComments(fs.readFileSync(file, "utf8"))
    lines.forEach(({ code }, idx) => {
      const m = code.match(
        /^\s*(?:export\s+)?(?:function\s+([A-Z]\w*)\s*\(|const\s+([A-Z]\w*)\s*(?::[^=]*)?=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)/
      )
      if (!m) return
      const name = m[1] || m[2]
      if (!localDefs.has(name)) localDefs.set(name, [])
      localDefs.get(name).push({ file: rel(file), line: idx + 1 })
    })
  })

for (const [name, hits] of localDefs) {
  const files = [...new Set(hits.map((h) => h.file))]
  if (files.length < 2) continue
  warnings.push({
    type: "duplicate-component",
    file: files[0],
    line: hits[0].line,
    name,
    message:
      `\`${name}\` is defined separately in ${files.length} screens ` +
      `(${files.map((f) => f.replace("src/screens/", "")).join(", ")}) — ` +
      `no copy is canonical, so they drift. Extract one shared version, or rename if they are unrelated`,
  })
}

// ── Check 11: a screen declaring its own widget-type vocabulary ───────────
// There is exactly one widget catalog — WIDGET_DEFS in src/App.tsx, 14 entries,
// each with a size class, grid widths, states, use cases and a dontUse list,
// surfaced as Patterns → Widgets. A screen that declares WIDGET_TYPES or
// SKELETONS is declaring a second one, and the two cannot be reconciled because
// neither references the other.
//
// Real case (2026-09-03): three parallel vocabularies existed at once — the
// builder could create 12 types, the library listed 10, WIDGET_DEFS defined 14,
// and all three agreed on two (kpi, table). A "heatmap" created in the builder
// had no category in the library.
//
// The finding is the declaration itself, not which of its entries diverge:
// counting divergent entries needs to parse array literals out of a screen and
// gets fooled by neighbouring constants (freshness values, categories, sort
// keys). The existence of a second vocabulary is the reliable signal and the
// one worth acting on.
const WIDGET_VOCAB_RE =
  /^[ \t]*(?:export[ \t]+)?(?:const|type)[ \t]+(WIDGET_TYPES|WIDGET_KINDS|WIDGET_CATEGORIES|SKELETONS|Skeleton)\b/

screenFiles
  .filter((f) => f.endsWith(".tsx"))
  .forEach((file) => {
    const lines = stripComments(fs.readFileSync(file, "utf8"))
    lines.forEach(({ code }, idx) => {
      const m = code.match(WIDGET_VOCAB_RE)
      if (!m) return
      warnings.push({
        type: "widget-vocab",
        file: rel(file),
        line: idx + 1,
        name: m[1],
        message:
          `declares \`${m[1]}\` — a second widget vocabulary. The catalog is ` +
          `WIDGET_DEFS in src/App.tsx (Patterns → Widgets); read from it instead`,
      })
    })
  })

// ── Checks 12-14: the three primitives screens keep drawing by hand ───────
// Why these exist, and why they are three checks and not a rule in CLAUDE.md:
// CLAUDE.md has said "use Tag, use AvatarCircle, use Button" since it was
// written. On 2026-09-08 one screen — PeopleAccessMembers.tsx — was measured
// at 19 hand-rolled badges, 24 hand-rolled avatars and 40 raw <button>
// elements, with ZERO Tag, ZERO AvatarCircle and no shortage of good faith.
//
// Nobody ignored the rule. Writing a <div> is simply cheaper than finding the
// component, and a written rule loses to an effort gap every time. Checks 1,
// 6, 7 and 8 already close that gap for colours, name-collisions, variant
// overuse and cards. These close it for the three that were left, which are
// exactly the three that had to be migrated by hand.
//
// All three are WARNINGS, not errors. The ratchet is what holds the line: the
// existing count becomes the baseline and CI blocks anything that adds to it,
// so old screens are not retroactively broken and new ones cannot regress.

// Check 12 — a pill-shaped badge drawn inline. Tag is the component.
// Matched on the shape Tag has and little else does: a fully-rounded radius
// (100/999/9999px) on an element that also sets a font size. A radius alone is
// too common — avatars, toggles and progress tracks all use one — so the font
// size is what says "this is a label in a pill", not a dot or a track.
const BADGE_RADIUS_RE = /borderRadius:\s*(?:100|999|9999)\b/
const BADGE_FONT_RE   = /fontSize:\s*\d+/

screenFiles.forEach((file) => {
  const lines = stripComments(fs.readFileSync(file, "utf8"))
  const hits = []
  lines.forEach(({ code }, idx) => {
    // The style object is often wrapped, so look at a small window.
    const window = lines.slice(idx, idx + 4).map((l) => l.code).join(" ")
    if (BADGE_RADIUS_RE.test(code) && BADGE_FONT_RE.test(window)) hits.push(idx + 1)
  })
  if (hits.length > 0) {
    warnings.push({
      type: "hand-rolled-badge",
      file: rel(file),
      line: hits[0],
      count: hits.length,
      lines: hits,
      message:
        `${hits.length} pill-shaped badge${hits.length === 1 ? "" : "s"} drawn inline ` +
        `(line${hits.length === 1 ? "" : "s"} ${hits.slice(0, 6).join(", ")}${hits.length > 6 ? ", …" : ""}) — ` +
        `that is Tag. It carries the radius, the sizes and the semantic variants, ` +
        `so a status never has to be a hex with an alpha suffix`,
    })
  }
})

// Check 13 — a circular avatar drawn inline. AvatarCircle is the component.
// Matched on a 50% radius at a size AvatarCircle actually models (16-64px);
// anything smaller is a status dot, which is a legitimate inline shape and is
// deliberately not flagged.
const AVATAR_RE = /width:\s*(\d+),\s*height:\s*\1,[\s\S]{0,80}?borderRadius:\s*["']50%["']/

screenFiles.forEach((file) => {
  const lines = stripComments(fs.readFileSync(file, "utf8"))
  const hits = []
  lines.forEach((_, idx) => {
    const window = lines.slice(idx, idx + 3).map((l) => l.code).join(" ")
    const m = window.match(AVATAR_RE)
    if (m && Number(m[1]) >= 16 && Number(m[1]) <= 64) hits.push(idx + 1)
  })
  // A window of 3 lines can match the same element twice; keep the first line
  // of each run rather than reporting a 24px circle three times.
  const runs = hits.filter((l, i) => i === 0 || l - hits[i - 1] > 2)
  if (runs.length > 0) {
    warnings.push({
      type: "hand-rolled-avatar",
      file: rel(file),
      line: runs[0],
      count: runs.length,
      lines: runs,
      message:
        `${runs.length} circular avatar${runs.length === 1 ? "" : "s"} drawn inline ` +
        `(line${runs.length === 1 ? "" : "s"} ${runs.slice(0, 6).join(", ")}${runs.length > 6 ? ", …" : ""}) — ` +
        `that is AvatarCircle. It sizes the initials, hashes a stable colour from ` +
        `the name, and has an "empty" style for a person who is not active`,
    })
  }
})

// Check 14 — a raw <button> wearing button styling. Button is the component.
// Only flagged when the element sets BOTH padding and a border or background:
// that is someone rebuilding the component's surface. A bare <button> around
// an icon, a tab, a colour swatch or a menu row is a real use of the element
// and is left alone — Button does not model any of those.
const RAW_BUTTON_PAD_RE    = /padding:\s*["'\d]/
const RAW_BUTTON_SURFACE_RE = /border:\s*["'`]|background:\s*["'`]/

screenFiles.forEach((file) => {
  const lines = stripComments(fs.readFileSync(file, "utf8"))
  const hits = []
  lines.forEach(({ code }, idx) => {
    if (!/<button\b/.test(code)) return
    const window = lines.slice(idx, idx + 8).map((l) => l.code).join(" ")
    if (RAW_BUTTON_PAD_RE.test(window) && RAW_BUTTON_SURFACE_RE.test(window)) hits.push(idx + 1)
  })
  if (hits.length > 0) {
    warnings.push({
      type: "raw-button",
      file: rel(file),
      line: hits[0],
      count: hits.length,
      lines: hits,
      message:
        `${hits.length} raw <button>${hits.length === 1 ? "" : "s"} with its own padding and surface ` +
        `(line${hits.length === 1 ? "" : "s"} ${hits.slice(0, 6).join(", ")}${hits.length > 6 ? ", …" : ""}) — ` +
        `that is Button, which owns the variants, the sizes and every state. ` +
        `An icon-only trigger, a tab or a swatch is a real <button> and is not counted`,
    })
  }
})

// ── Checks 15-18: the four things the People & Access review kept finding ──
// Added 2026-09-08 after a review of PeopleAccessMembers.tsx turned up the same
// four mistakes in six different panels. Checks 12-14 already cover Tag,
// AvatarCircle and Button; these cover the four that were left, and they exist
// for the same reason as those three — the rule was written down and lost to an
// effort gap anyway. All four are WARNINGS held by the ratchet.

// A style object, and the line it starts on. Both checks below have to reason
// about ONE element: a sliding window of raw lines merges the strip above a
// list with the icon tile inside its first row, and reports each as the other.
function styleObjects(code) {
  const out = []
  const re = /style=\{\{/g
  let m
  while ((m = re.exec(code)) !== null) {
    const end = code.indexOf("}}", m.index + 8)
    if (end === -1) continue
    out.push({
      body:  code.slice(m.index + 8, end),
      index: m.index,
      line:  code.slice(0, m.index).split("\n").length,
    })
  }
  return out
}

// Check 15 — a tinted square with an icon in it. HighlightIcon is the
// component: it owns the 3 sizes, the 9 semantic tints and the icon sizing.
// Matched on equal width/height in the range HighlightIcon models (20-48px)
// plus a NUMERIC radius and a background. A 50% radius is an avatar and
// belongs to check 13, so it is excluded here rather than double-counted.
const ICON_TILE_RE = /width:\s*(\d+),\s*height:\s*\1,[\s\S]*?borderRadius:\s*(\d+)/

screenFiles.forEach((file) => {
  const code = stripComments(fs.readFileSync(file, "utf8")).map((l) => l.code).join("\n")
  const hits = []
  styleObjects(code).forEach(({ body, index, line }) => {
    const m = body.match(ICON_TILE_RE)
    if (!m) return
    const size = Number(m[1])
    if (size < 20 || size > 48) return
    if (!/background:/.test(body)) return
    // A transparent tile is not a tinted one.
    if (/background:\s*["']transparent["']/.test(body)) return
    // An icon-only <button> is a real use of the element — check 14 says so
    // explicitly — and it is a trigger, not a HighlightIcon. Same square, same
    // radius, different thing: the kebab menu button tripped this.
    // Resolved by the nearest opening tag, because scanning for "<button" up to
    // the style prop breaks on any attribute containing an arrow function.
    const before = code.slice(Math.max(0, index - 400), index)
    const tags = before.match(/<([a-zA-Z][\w.]*)/g)
    if (tags && tags[tags.length - 1] === "<button") return
    // The icon itself sits just after the style object, so look a little past it.
    const after = code.slice(index + body.length, index + body.length + 200)
    if (!/<Icons\.|\.icon\b|icon\}|iconName/.test(after)) return
    hits.push(line)
  })
  if (hits.length > 0) {
    warnings.push({
      type: "hand-rolled-icon-tile",
      file: rel(file),
      line: hits[0],
      count: hits.length,
      lines: hits,
      message:
        `${hits.length} tinted icon tile${hits.length === 1 ? "" : "s"} drawn inline ` +
        `(line${hits.length === 1 ? "" : "s"} ${hits.slice(0, 6).join(", ")}${hits.length > 6 ? ", …" : ""}) — ` +
        `that is HighlightIcon. It owns the three sizes and the nine semantic ` +
        `tints, so an entity type keeps the same colour everywhere it appears`,
    })
  }
})

// Check 16 — a filled title bar on something that is not a table.
// A strip with its own background above a divider is the TABLE-HEADER device:
// it means "these words are column names". Inside a card it means nothing, and
// it makes one card look like two stacked surfaces.
//
// A real table header is recognised by its typography, not by its markup: it is
// uppercase micro-type, or it declares its own grid columns. Card titles are
// sentence-case and bold. Matching on <table>/gridTemplateColumns alone missed
// three legitimate flex-based headers in this repo.
screenFiles.forEach((file) => {
  const code = stripComments(fs.readFileSync(file, "utf8")).map((l) => l.code).join("\n")
  const hits = []
  styleObjects(code).forEach(({ body, line }) => {
    if (!/background:\s*["']var\(--surface-raised\)["']/.test(body)) return
    if (!/borderBottom:/.test(body)) return
    if (/gridTemplateColumns|textTransform:\s*["']uppercase["']|letterSpacing/.test(body)) return
    hits.push(line)
  })
  if (hits.length > 0) {
    warnings.push({
      type: "filled-card-title",
      file: rel(file),
      line: hits[0],
      count: hits.length,
      lines: hits,
      message:
        `${hits.length} filled title bar${hits.length === 1 ? "" : "s"} with no table under ` +
        `${hits.length === 1 ? "it" : "them"} (line${hits.length === 1 ? "" : "s"} ${hits.slice(0, 6).join(", ")}${hits.length > 6 ? ", …" : ""}) — ` +
        `a background strip above a divider is the table-header device and says ` +
        `"these are column names". A card title is a title: drop the fill, keep the divider`,
    })
  }
})

// Check 17 — var(--accent) used as a row hover.
// --accent is a BLUE tint (#2b7fff14). On a hover it reads as a selection, not
// as "your pointer is here", and it is the reason five member tables looked
// like they had a row selected at all times. The neutral row-hover tokens are
// --el-row-hover for list rows and --table-row-hover-bg for table rows.
screenFiles.forEach((file) => {
  const lines = stripComments(fs.readFileSync(file, "utf8"))
  const hits = []
  lines.forEach(({ code }, idx) => {
    if (!/var\(--accent\)/.test(code)) return
    const window = lines.slice(Math.max(0, idx - 2), idx + 3).map((l) => l.code).join(" ")
    if (!/onMouseEnter|:hover|hover:/.test(window)) return
    hits.push(idx + 1)
  })
  if (hits.length > 0) {
    warnings.push({
      type: "accent-row-hover",
      file: rel(file),
      line: hits[0],
      count: hits.length,
      lines: hits,
      message:
        `${hits.length} hover${hits.length === 1 ? "" : "s"} painted with var(--accent) ` +
        `(line${hits.length === 1 ? "" : "s"} ${hits.slice(0, 6).join(", ")}${hits.length > 6 ? ", …" : ""}) — ` +
        `--accent is a blue tint and reads as a selected row. Use ` +
        `--el-row-hover for list rows, --table-row-hover-bg for table rows`,
    })
  }
})

// Check 18 — a SlideOut child that re-pads itself.
// SlideOut's own panel is padded 32px/24px. A preview component that adds
// another 20-24px of horizontal padding lands its content at 44-48px from the
// panel edge — which is what three previews in People & Access did, in every
// section, for months. Nobody sees it because each half looks correct alone.
//
// Resolved by name: find the components rendered as <SlideOut> children, then
// look at their own definition in the same file.
// The HORIZONTAL value is the second one in the shorthand, so that is what has
// to be >= 16px. Matching the first value instead flags "32px 0" — a perfectly
// correct vertical-only padding — which is how this check first reported four
// false positives.
const SIDE_PAD_RE = /padding:\s*["'`]\s*[\d.]+(?:px)?\s+(1[6-9]|[2-9]\d)px/

// Where a component's body ends: the next top-level declaration. This has to
// know about `export function` and `const X = (…) =>` as well as a bare
// `function`, because a screen file's LAST helper is usually followed by its
// one `export function …Screen`. Matching only `\nfunction` let that helper's
// body run to end of file, so the whole page's padding was reported as if it
// were inside a SlideOut child — four of AdminAuditLog's five hits, and every
// hit in AdminIntegrations.
const NEXT_TOP_LEVEL_RE = /\n(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+[A-Z]|\n(?:export\s+)?(?:const|class)\s+[A-Z]/

screenFiles.forEach((file) => {
  const text = fs.readFileSync(file, "utf8")
  if (!/<SlideOut\b/.test(text)) return
  const lines = stripComments(text)
  const code = lines.map((l) => l.code).join("\n")

  // Component names rendered between <SlideOut …> and </SlideOut>
  const childNames = new Set()
  const blocks = code.match(/<SlideOut\b[\s\S]*?<\/SlideOut>/g) || []
  blocks.forEach((b) => {
    for (const m of b.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)) {
      if (m[1] !== "SlideOut") childNames.add(m[1])
    }
  })
  if (childNames.size === 0) return

  const hits = []

  // Inline children count too. AdminAuditLog's detail panel is written straight
  // inside <SlideOut>…</SlideOut> rather than extracted into a component, and a
  // name-only pass walked right past it.
  blocks.forEach((b) => {
    const blockStart = code.indexOf(b)
    for (const m of b.matchAll(new RegExp(SIDE_PAD_RE, "g"))) {
      hits.push(code.slice(0, blockStart + m.index).split("\n").length)
    }
  })

  childNames.forEach((name) => {
    const start = code.search(new RegExp(`function\\s+${name}\\s*\\(`))
    if (start === -1) return
    const nextFn = code.slice(start + 1).search(NEXT_TOP_LEVEL_RE)
    const body = nextFn === -1 ? code.slice(start) : code.slice(start, start + 1 + nextFn)
    const lineOf = (offset) => code.slice(0, start + offset).split("\n").length
    for (const m of body.matchAll(new RegExp(SIDE_PAD_RE, "g"))) {
      hits.push(lineOf(m.index))
    }
  })
  const runs = [...new Set(hits)].sort((a, b) => a - b)
  if (runs.length > 0) {
    warnings.push({
      type: "slideout-double-padding",
      file: rel(file),
      line: runs[0],
      count: runs.length,
      lines: runs,
      message:
        `${runs.length} horizontal padding${runs.length === 1 ? "" : "s"} inside a SlideOut child ` +
        `(line${runs.length === 1 ? "" : "s"} ${runs.slice(0, 6).join(", ")}${runs.length > 6 ? ", …" : ""}) — ` +
        `SlideOut already pads its panel 32px/24px, so this doubles it. Pass 0 ` +
        `horizontal padding and let the component own the margin`,
    })
  }
})

function printSection(title, items, formatter) {
  if (items.length === 0) return
  console.log(`\n${title} (${items.length})`)
  console.log("-".repeat(title.length + 6))
  items.forEach((i) => console.log("  " + formatter(i)))
}

// ── Accepted findings ──────────────────────────────────────────────────
// A verdict of "accepted" in ds-decisions.json means a human looked at the
// finding and ruled it a false positive or a deliberate exception. All three
// of these checks have real false-positive modes — Check 6 matches names not
// behaviour, Check 7 counts per file when one file can hold several screens,
// Check 8 guesses from markup shape — so without this, recording a verdict
// would be decorative: the DS Health page would say "accepted" while the
// ratchet went on blocking every push. The decision has to actually count.
//
// Accepted findings stay visible in the report, marked, so nobody forgets
// they were waived. They are excluded only from the counts the ratchet reads.
// Separator-insensitive on both sides. rel() above guarantees our side is
// POSIX, but a waiver is hand-written by whoever made the call, on whatever
// machine they were sitting at — and a rule that only works if a human types
// the right slash is a rule that breaks on a Tuesday. PR #127, 2026-09-10: a
// waiver authored on Windows read `src\\screens\\...`, never matched on CI, and
// the finding it had already been ruled on went on blocking the push.
//
// Declared BEFORE the read below, not after it: the read is inside a try/catch
// whose only job is a missing file, so a ReferenceError from using `posix` in
// the temporal dead zone would be swallowed there and every waiver would
// silently stop working. Caught here by a test, but only because one was run.
const posix = (k) => k.replace(/\\/g, "/")

const DECISIONS_PATH = path.join(ROOT, "ds-decisions.json")
let acceptedKeys = new Set()
try {
  const d = JSON.parse(fs.readFileSync(DECISIONS_PATH, "utf8")).decisions || {}
  acceptedKeys = new Set(
    Object.keys(d).filter((k) => d[k].verdict === "accepted").map(posix)
  )
} catch { /* no decisions file — nothing is waived */ }

// Same key shape generate-ds-health.cjs builds: type:file:name, never a line
// number, so a verdict survives edits above it.
const findingKey = (w) => posix([w.type, w.file, w.name].filter(Boolean).join(":"))
const isAccepted = (w) => acceptedKeys.has(findingKey(w))

// `--json` dumps every finding as structured data and prints nothing else, so
// generate-ds-health.cjs can build the DS Health page from the same run that
// CI and the pre-push hook use. One source of findings, three consumers — the
// page can never disagree with what actually blocks a push. Handled before the
// human report so stdout stays parseable. Emits every finding, accepted or
// not — the page needs them all in order to show the verdict column.
if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify({ errors, warnings }, null, 2) + "\n")
  process.exit(0)
}

console.log("AIMS OS — token audit\n" + "=".repeat(22))

printSection(
  "❌ ERRORS — hardcoded hex/rgba outside the token layer",
  errors,
  (e) => `${e.file}:${e.line}  ${e.snippet}`
)

const orphanWarnings = warnings.filter((w) => w.type === "orphan")
const spacingWarnings = warnings.filter((w) => w.type === "spacing")
const shadowWarnings = warnings.filter((w) => w.type === "shadow-component")
const mainOveruseWarnings = warnings.filter((w) => w.type === "main-overuse")
const cardReimplWarnings = warnings.filter((w) => w.type === "possible-card-reimpl")
const duplicateWarnings = warnings.filter((w) => w.type === "duplicate-component")
const widgetVocabWarnings = warnings.filter((w) => w.type === "widget-vocab")
const badgeWarnings  = warnings.filter((w) => w.type === "hand-rolled-badge")
const avatarWarnings = warnings.filter((w) => w.type === "hand-rolled-avatar")
const rawBtnWarnings = warnings.filter((w) => w.type === "raw-button")
const iconTileWarnings  = warnings.filter((w) => w.type === "hand-rolled-icon-tile")
const cardTitleWarnings = warnings.filter((w) => w.type === "filled-card-title")
const accentHoverWarnings = warnings.filter((w) => w.type === "accent-row-hover")
const slideOutPadWarnings = warnings.filter((w) => w.type === "slideout-double-padding")
const ehBarWarnings = warnings.filter((w) => w.type === "entity-header-duplicate-bar")

// Accepted findings still print — with a marker — so a waiver stays visible
// instead of quietly disappearing from the report.
const fmt = (w) => `${w.file}:${w.line}  ${isAccepted(w) ? "[accepted] " : ""}${w.message}`

printSection(
  "❌ ERRORS — Header with both breadcrumb and backButton",
  navConflicts,
  (e) => `${e.file}:${e.line}  <Header> ${e.message}`
)

printSection("⚠️  WARNING — possible orphaned components", orphanWarnings, (w) => `${w.file} — ${isAccepted(w) ? "[accepted] " : ""}${w.message}`)
printSection("⚠️  WARNING — off-scale spacing (informational only)", spacingWarnings, (w) => `${w.file}:${w.line}  ${w.message}`)
printSection("⚠️  WARNING — hand-rolled component shadows a real DS export", shadowWarnings, fmt)
printSection("⚠️  WARNING — variant=\"main\" in a screen file (Header applies it from primaryAction)", mainOveruseWarnings, fmt)
printSection("⚠️  WARNING — possible hand-rolled CardContainer reimplementation", cardReimplWarnings, fmt)
printSection("⚠️  WARNING — same component defined in two screens", duplicateWarnings, fmt)
printSection("⚠️  WARNING — a second widget vocabulary (the catalog is WIDGET_DEFS)", widgetVocabWarnings, fmt)
printSection("⚠️  WARNING — pill-shaped badges drawn inline (that is Tag)", badgeWarnings, fmt)
printSection("⚠️  WARNING — circular avatars drawn inline (that is AvatarCircle)", avatarWarnings, fmt)
printSection("⚠️  WARNING — raw <button> with its own padding and surface (that is Button)", rawBtnWarnings, fmt)
printSection("⚠️  WARNING — tinted icon tiles drawn inline (that is HighlightIcon)", iconTileWarnings, fmt)
printSection("⚠️  WARNING — filled title bar on something that is not a table", cardTitleWarnings, fmt)
printSection("⚠️  WARNING — var(--accent) used as a row hover (it is a blue tint)", accentHoverWarnings, fmt)
printSection("⚠️  WARNING — a SlideOut child re-padding itself", slideOutPadWarnings, fmt)
printSection("⚠️  WARNING — a page Header repeating what an EntityHeader shows", ehBarWarnings, fmt)

// The ratchet reads these. Accepted findings are subtracted here and nowhere
// else: they stay in the report above, and in the DS Health page, but they no
// longer block a push.
const open = (list) => list.filter((w) => !isAccepted(w))
const openOrphan = open(orphanWarnings)
const openShadow = open(shadowWarnings)
const openMainOveruse = open(mainOveruseWarnings)
const openCardReimpl = open(cardReimplWarnings)
const openDuplicate = open(duplicateWarnings)
const openWidgetVocab = open(widgetVocabWarnings)
const openBadge  = open(badgeWarnings)
const openAvatar = open(avatarWarnings)
const openRawBtn = open(rawBtnWarnings)
const openIconTile   = open(iconTileWarnings)
const openCardTitle  = open(cardTitleWarnings)
const openAccentHover = open(accentHoverWarnings)
const openSlideOutPad = open(slideOutPadWarnings)
const openEhBar = open(ehBarWarnings)

// These three report once per file with a `count`, so the ratchet must compare
// INSTANCES. Counting findings would mean a file already on the list could
// absorb fifty new badges without the number moving — which is precisely the
// regression the checks exist to catch.
const instances = (ws) => ws.reduce((n, w) => n + (w.count ?? 1), 0)
const acceptedCount =
  (orphanWarnings.length - openOrphan.length) +
  (shadowWarnings.length - openShadow.length) +
  (mainOveruseWarnings.length - openMainOveruse.length) +
  (cardReimplWarnings.length - openCardReimpl.length)

// `--counts` prints one machine-readable line so CI can ratchet: run the audit
// on main, run it on the PR, and fail if any category went UP. Warnings stay
// non-blocking on their own (main is not at zero on several of them), but a PR
// is never allowed to add more. Without this, checks 6-8 print their findings
// into the CI log and the job still goes green — which is what let PR #55's
// 4 shadow + 6 main-overuse warnings sit unnoticed for three days.
// Checks 10 and 11 are deliberately NOT in AUDIT_COUNTS, so they report but do
// not gate. A ratchet compares head against base, and `base[k] ?? 0` means a
// category the base script does not know about starts at 0 — so adding these to
// the counts would fail the very PR that introduces them, and every PR after it
// until the backlog reached zero. That is the wrong order: you can only lock a
// door you have already closed.
//
// Nor can the current 22 findings be waived to get around it. Only an "accepted"
// verdict subtracts from these counts, and accepted means "a human looked and
// there is nothing to do" — untrue here. The duplicate components are real work
// (verdict: promote, they become shared DS components) and the widget
// vocabularies are pending a product decision about what a widget type even is.
// Marking either as accepted would make the DS Health page lie.
//
// So: they surface on DS Health now, collect verdicts there, and get added to
// the counts below once their open count is driven to zero. Whoever does that
// should add `duplicate=${openDuplicate.length} widget_vocab=${openWidgetVocab.length}`
// to the line below and the matching LABELS entries in audit-ratchet.cjs.
if (process.argv.includes("--counts")) {
  console.log(
    `AUDIT_COUNTS errors=${errors.length} orphan=${openOrphan.length} shadow=${openShadow.length} main_overuse=${openMainOveruse.length} card_reimpl=${openCardReimpl.length} badge=${instances(openBadge)} avatar=${instances(openAvatar)} raw_button=${instances(openRawBtn)} icon_tile=${instances(openIconTile)} card_title=${instances(openCardTitle)} accent_hover=${instances(openAccentHover)} slideout_pad=${instances(openSlideOutPad)} eh_bar=${instances(openEhBar)}`
  )
}

console.log(
  `\nSummary: ${errors.length + navConflicts.length} error(s), ${openOrphan.length} orphan warning(s), ${spacingWarnings.length} spacing warning(s), ${openShadow.length} shadow-component warning(s), ${openMainOveruse.length} main-overuse warning(s), ${openCardReimpl.length} possible-card-reimpl warning(s), ${openDuplicate.length} duplicate-component warning(s), ${openWidgetVocab.length} widget-vocab warning(s), ${openBadge.length} hand-rolled-badge, ${openAvatar.length} hand-rolled-avatar, ${openRawBtn.length} raw-button, ${openIconTile.length} icon-tile, ${openCardTitle.length} filled-card-title, ${openAccentHover.length} accent-hover, ${openSlideOutPad.length} slideout-padding, ${openEhBar.length} entity-header-bar` +
    (acceptedCount > 0
      ? `\n         plus ${acceptedCount} accepted and waived in ds-decisions.json — shown above marked [accepted], not counted here.`
      : ".")
)

if (errors.length + navConflicts.length > 0) {
  console.log("\nFix errors above, or mark a genuine exception with `// audit-ignore: <reason>` on the same line.")
  process.exitCode = 1
} else {
  console.log("\nNo blocking errors.")
}
