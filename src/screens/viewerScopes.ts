/**
 * What this viewer is entitled to read.
 *
 * ── Why this is its own module ────────────────────────────────────────────
 * Governance gets asked at three different grains — is this RECORD governed,
 * is this TYPE readable, is this FIELD masked — and each grain grew its own
 * predicate next to the data it happened to be about. Two of them grew their
 * own copy of the scope list with it.
 *
 * Copies of one fact are chances to disagree, and they had already taken one: a
 * vehicle's list price was masked in the record header and printed in full in
 * the Overview widget a screen below. A governed value with two answers is not
 * governed, and the header's masking was decoration for as long as the second
 * answer existed.
 *
 * So the entitlement lives here, alone, and it depends on nothing. Every grain
 * asks the same question of the same set, and the grain-specific helpers stay
 * with their own data as one-liners over `hasScope`.
 *
 * The no-dependencies part is load-bearing, not tidiness: this module is
 * imported by both the contact fixtures and the entity registry, and neither
 * imports the other. Reaching back for either one would tie them together and
 * stop either from standing on its own.
 *
 * ── Prototype scope ──────────────────────────────────────────────────────
 * One viewer, one hardcoded set. A real deployment reads these from the session
 * and this file becomes a context provider — which is why callers ask the
 * question through `hasScope`/`isMasked` rather than reading the array. Swapping
 * the source then touches this file and nothing else.
 */

/**
 * The PM's scopes. Finance is absent on purpose: without a scope the viewer
 * lacks, every governed surface in the prototype renders as if governance did
 * not exist, and nobody can review it.
 */
export const VIEWER_SCOPES: readonly string[] = ["contacts.read", "hr.read", "drives.read"]

/**
 * Whether the viewer may read something governed by `scope`.
 *
 * An absent scope means ungoverned, so it passes. That default is what lets a
 * caller ask about every field uniformly instead of branching on whether the
 * field happens to declare one.
 */
export function hasScope(scope: string | undefined): boolean {
  return !scope || VIEWER_SCOPES.includes(scope)
}

/**
 * The inverse, named for what the UI does with it. Both names exist because the
 * call sites read as opposites — a type is *readable*, a field is *masked* — and
 * making one of them say `!hasScope(...)` would put the negation in the reader's
 * head at exactly the place governance has to be obvious.
 */
export function isMasked(scope: string | undefined): boolean {
  return !hasScope(scope)
}
