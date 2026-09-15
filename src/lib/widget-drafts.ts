/**
 * Widgets saved by the Widget Builder, so the Widget Library can show them.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * The two screens are separate prototype pages and the builder leaves with a
 * full page load, so no React state survives the trip. Without something
 * carrying the widget across, saving said "it is in the catalog" and the
 * catalog had never heard of it — the one seam in the flow you could see from
 * the outside.
 *
 * `sessionStorage`, not `localStorage`, on purpose: it survives the navigation
 * and dies with the tab, so tomorrow's demo never opens on yesterday's
 * leftovers. Nothing here is a persistence design — it is the smallest thing
 * that closes the loop for a prototype, and the day these screens share a real
 * store it should be deleted rather than migrated.
 */

const KEY = "aims.widget-builder.saved"

/**
 * The id of the widget saved by the last save, read exactly once.
 *
 * Separate from KEY because the two answer different questions. KEY is "what
 * is in the catalog", true for the whole session. This is "a save just
 * happened", true once — and the difference is what stops the library
 * announcing the same widget every time somebody navigates back to it.
 */
const ANNOUNCE_KEY = "aims.widget-builder.announce"

export type SavedWidget = {
  id: string
  name: string
  /** Where the data comes from — the entity or dataset the builder chose. */
  source: string
  /** The widget type's human label, or null when it never picked one. */
  skeleton: string | null
  /** The builder's own type id, so the library previews exactly what was built. */
  previewTypeId?: string
  status: "published" | "draft"
  /** Only on a draft: what it still needs, in the builder's own words. */
  missing?: string
}

function read(): SavedWidget[] {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedWidget[]) : []
  } catch {
    // A private window, a blocked store, a half-written value — none of them
    // are worth breaking a screen over. An empty library is the honest answer.
    return []
  }
}

/** Newest first, which is where the library puts them. */
export function savedWidgets(): SavedWidget[] {
  return read()
}

export function saveWidget(w: Omit<SavedWidget, "id">): SavedWidget {
  const entry: SavedWidget = { ...w, id: `saved-${Date.now()}` }
  try {
    sessionStorage.setItem(KEY, JSON.stringify([entry, ...read()]))
    sessionStorage.setItem(ANNOUNCE_KEY, entry.id)
  } catch {
    // Same reasoning: the save is a prototype nicety, not the point of the flow.
  }
  return entry
}

/**
 * The widget a save just created, or null. Clears itself, so the second caller
 * gets null.
 *
 * The builder cannot raise the toast itself on the path that matters: "Done"
 * leaves with `window.location.href`, a full page load that takes every toast
 * with it. So the announcement travels in sessionStorage and the landing
 * raises it — which is also where CLAUDE.md wants it, beside the row it is
 * talking about.
 */
export function takeAnnouncement(): SavedWidget | null {
  try {
    const id = sessionStorage.getItem(ANNOUNCE_KEY)
    if (!id) return null
    sessionStorage.removeItem(ANNOUNCE_KEY)
    return read().find((w) => w.id === id) ?? null
  } catch {
    return null
  }
}

/**
 * What the toast says about a save. Here rather than in either screen because
 * both raise it — the builder when you stay, the library when you arrive — and
 * two copies of a sentence is how the same event ends up described two ways.
 *
 * It states the outcome and what follows from it, per CLAUDE.md: "Created" on
 * its own tells you nothing you did not already know from having clicked Save.
 */
export function savedMessage(w: SavedWidget): { title: string; description: string } {
  return w.status === "draft"
    ? {
        title: `"${w.name}" saved as a draft`,
        description: "It is in the catalog. Finish its setup to make it available on dashboards.",
      }
    : {
        title: `"${w.name}" is in the catalog`,
        description: "Anyone on the workspace can now add it to a dashboard.",
      }
}
