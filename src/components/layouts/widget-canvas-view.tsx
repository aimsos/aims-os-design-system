import { useState, useMemo, useEffect, useLayoutEffect, useRef, createContext, useContext } from "react"
import type { ReactNode } from "react"
import { GripVertical } from "lucide-react"
import { WidgetFather } from "@/components/ui/widget-father"
import type { WidgetWidthClass } from "@/components/ui/widget-father"
import { CardContainer, type CardVariant } from "@/components/ui/card-container"

// ── Types ──────────────────────────────────────────────────────────────────────
//
// CanvasSlot:  content spec (from props — always reflects latest render)
// LayoutItem:  order + width state (in useState — tracks drag/resize mutations)
//
// Separating the two means content re-renders normally when the parent updates
// while layout state survives across re-renders.
// ─────────────────────────────────────────────────────────────────────────────

export interface CanvasSlot {
  uid: string
  title: string
  /** Column span: 1=narrow (1/3), 2=wide (2/3), 3=full (3/3). Default: 1 */
  colSpan?: 1 | 2 | 3
  /** DS width class. Defaults to colSpan-derived value if omitted. */
  widthClass?: WidgetWidthClass
  /**
   * Grid row span in Grid Units (1 GU = 48px, gap = 16px).
   * Height = rowSpan * 64 - 16. Default: 5 (304px).
   *   3 GU = 176px  — KPI, KPI with feedback
   *   5 GU = 304px  — Act Now, Status, Folder Nav
   *   6 GU = 368px  — Activity, Notes, Pending Outputs
   *   8 GU = 496px  — My Work, My Team, Workflows
   *   9 GU = 560px  — Timeline, Charts, Agent Catalog
   */
  rowSpan?: number
  /** Minimum row span — vertical resize cannot go below this. Default: 3 */
  minRowSpan?: number
  /**
   * Maximum row span — vertical resize cannot go above this. Set equal to
   * minRowSpan (or omit rowSpan resize entirely) for Compact-class widgets:
   * their content never grows past its natural size, so letting the slot
   * grow taller just wastes space and reads as a broken layout.
   */
  maxRowSpan?: number
  showRefresh?: boolean
  showMenu?: boolean
  showInfo?: boolean
  /**
   * Whether this widget auto-expands to fill its row when left alone after a drag.
   * Set to false for fixed-content widgets (KPI, Status) that look odd at full width.
   * Default: true
   */
  autoExpand?: boolean
  /**
   * Card color, same variants CardContainer already publishes. Default:
   * "default" (unchanged for every existing caller). A static report-style
   * canvas (a playbook's read-only Overview, say) can tone each widget to
   * its semantic role instead of every card reading as the same grey.
   */
  tone?: CardVariant
  /** Content rendered inside WidgetFather */
  content: ReactNode
}

// ── Internal layout state model ───────────────────────────────────────────────

interface LayoutEntry {
  uid: string
  widthClass: WidgetWidthClass
  rowSpan: number
}

interface StackGroup {
  type: "stack"
  uid: string
  slots: LayoutEntry[]
}

type LayoutItem = LayoutEntry | StackGroup

function isStack(e: LayoutItem): e is StackGroup {
  return (e as StackGroup).type === "stack"
}

// Returns all LayoutEntry items in the row that contains `uid`, using current `widths`.
function findRowContaining(uid: string, items: LayoutItem[], widths: Record<string, WidgetWidthClass>): LayoutEntry[] {
  let col = 0, row: LayoutEntry[] = [], found = false
  for (const item of items) {
    if (isStack(item)) {
      const inStack = item.uid === uid || item.slots.some(s => s.uid === uid)
      if (col + 4 > 12) { if (found) return row; row = []; col = 4 }
      else col += 4
      if (inStack) found = true
      continue
    }
    const e = item as LayoutEntry
    const span = colSpanForWidth(widths[e.uid] ?? e.widthClass)
    if (col + span > 12) { if (found) return row; row = [e]; col = span }
    else { col += span; row.push(e) }
    if (e.uid === uid) found = true
  }
  return found ? row : []
}

function findScrollParent(el: Element | null): Element {
  while (el) {
    const { overflow, overflowY } = window.getComputedStyle(el)
    if (overflow === "auto" || overflow === "scroll" || overflowY === "auto" || overflowY === "scroll") return el
    el = el.parentElement
  }
  return document.documentElement
}


function widthFromSpan(span: 1 | 2 | 3): WidgetWidthClass {
  return span === 1 ? "narrow" : span === 2 ? "wide" : "full"
}

function colSpanForWidth(w: WidgetWidthClass): number {
  switch (w) {
    case "narrow": return 4
    case "half":   return 6
    case "wide":   return 8
    case "xl":     return 9
    case "full":   return 12
    default:       return 4
  }
}

// ── Explicit grid positions ───────────────────────────────────────────────────
// Computes exact gridRowStart / gridColumnStart for every item using a greedy
// first-fit bin-packing algorithm (same logic as CSS gridAutoFlow:"row" but
// evaluated in JS so the drag-preview and the committed layout always agree).
function computeExplicitPositions(
  items: LayoutItem[],
  widthByUid: Record<string, WidgetWidthClass>,
  rowSpanByUid: Record<string, number>,
  currentDragUid: string | null,
): Record<string, { colStart: number; rowStart: number }> {
  const COLS = 12
  const rows: boolean[][] = []

  function ensureRow(r: number) {
    while (rows.length <= r) rows.push(new Array(COLS).fill(false))
  }

  function isFree(rStart: number, cStart: number, rSpan: number, cSpan: number): boolean {
    for (let r = rStart; r < rStart + rSpan; r++) {
      ensureRow(r)
      for (let c = cStart; c < cStart + cSpan; c++) {
        if (rows[r][c]) return false
      }
    }
    return true
  }

  function markBusy(rStart: number, cStart: number, rSpan: number, cSpan: number) {
    for (let r = rStart; r < rStart + rSpan; r++) {
      ensureRow(r)
      for (let c = cStart; c < cStart + cSpan; c++) { rows[r][c] = true }
    }
  }

  const result: Record<string, { colStart: number; rowStart: number }> = {}

  for (const item of items) {
    let colSpan: number
    let rowSpan: number

    if (isStack(item)) {
      colSpan = 4
      rowSpan = item.slots.reduce((sum, s) => sum + (rowSpanByUid[s.uid] ?? s.rowSpan ?? DEFAULT_ROW_SPAN), 0)
    } else {
      const entry = item as LayoutEntry
      const w = (currentDragUid === entry.uid)
        ? entry.widthClass
        : (widthByUid[entry.uid] ?? entry.widthClass)
      colSpan = colSpanForWidth(w)
      const fullRowSpan = rowSpanByUid[entry.uid] ?? entry.rowSpan ?? DEFAULT_ROW_SPAN
      rowSpan = fullRowSpan
    }

    let placed = false
    for (let r = 0; !placed; r++) {
      for (let c = 0; c <= COLS - colSpan; c++) {
        if (isFree(r, c, rowSpan, colSpan)) {
          result[item.uid] = { colStart: c + 1, rowStart: r + 1 }
          markBusy(r, c, rowSpan, colSpan)
          placed = true
          break
        }
      }
    }
  }

  return result
}

function toLayoutEntry(s: CanvasSlot): LayoutEntry {
  const colSpan = s.colSpan ?? 1
  return {
    uid: s.uid,
    widthClass: s.widthClass ?? widthFromSpan(colSpan),
    rowSpan: s.rowSpan ?? DEFAULT_ROW_SPAN,
  }
}

// ── Grid Unit (GU) constants ──────────────────────────────────────────────────
// One canvas row = GU_HEIGHT px. Height for N rows = N * (GU_HEIGHT + GU_GAP) - GU_GAP.
const GU_HEIGHT        = 48
const GU_GAP           = 16
const GU_SNAPS         = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14] as const
const DEFAULT_ROW_SPAN = 5

function guToPixels(gu: number): number {
  return gu * (GU_HEIGHT + GU_GAP) - GU_GAP
}
function pixelsToGu(px: number): number {
  const raw = (px + GU_GAP) / (GU_HEIGHT + GU_GAP)
  return GU_SNAPS.reduce((a, b) => Math.abs(a - raw) < Math.abs(b - raw) ? a : b)
}

// ── Widget size context — consumed by content components via useWidgetSize() ──

// WidgetFather chrome consumed: 24px top padding + 28px header + 12px gap + 24px bottom padding
const WIDGET_CHROME_HEIGHT = 88

interface WidgetSizeContextValue {
  widthClass:      WidgetWidthClass
  isNarrow:        boolean
  isWide:          boolean
  isFull:          boolean
  availableHeight: number | undefined
  contentHeight:   number | undefined
}

const WidgetSizeContext = createContext<WidgetSizeContextValue>({
  widthClass: "narrow", isNarrow: true, isWide: false, isFull: false, availableHeight: undefined, contentHeight: undefined,
})

/** Hook for widget content components to read their current canvas size context. */
export function useWidgetSize(): WidgetSizeContextValue {
  return useContext(WidgetSizeContext)
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface WidgetCanvasViewProps {
  /**
   * Widget slot definitions. Each slot becomes one draggable/resizable WidgetFather.
   * Redefine this array on each render — content is looked up live so reactive
   * values (counts, rows, etc.) always reflect the latest state.
   */
  initialSlots: CanvasSlot[]
  className?: string
}

export function WidgetCanvasView({ initialSlots, className }: WidgetCanvasViewProps) {
  // ── Slot lookup: content + metadata (never stale) ─────────────────────────
  const slotMap = useMemo(
    () => new Map(initialSlots.map(s => [s.uid, s])),
    [initialSlots],
  )

  // ── Layout state: order + widthClass (mutable via drag/resize) ───────────
  const [layout, setLayout] = useState<LayoutItem[]>(() => initialSlots.map(toLayoutEntry))

  // ── Interaction state ─────────────────────────────────────────────────────
  const [hoveredUid,      setHoveredUid]      = useState<string | null>(null)
  const [hoveredEdge,     setHoveredEdge]     = useState<"left" | "right" | "bottom" | null>(null)
  const [dragUid,         setDragUid]         = useState<string | null>(null)
  const [dropUid,         setDropUid]         = useState<string | null>(null)
  const [dropSide,        setDropSide]        = useState<"before" | "after" | "stack-above" | "stack-below" | null>(null)
  const cursorChipRef      = useRef<HTMLDivElement>(null)
  const initialSlotsRef    = useRef(initialSlots)
  const [widthByUid,      setWidthByUid]      = useState<Record<string, WidgetWidthClass>>({})
  const [resizing,        setResizing]        = useState<{
    uid: string; edge: "left" | "right"
    startX: number; startCols: number
    startRect: { left: number; top: number; width: number; height: number }
  } | null>(null)
  const [resizePreviewPx, setResizePreviewPx] = useState<number | null>(null)
  const [rowSpanByUid,    setRowSpanByUid]    = useState<Record<string, number>>({})
  const [vertPreviewH,    setVertPreviewH]    = useState<{ uid: string; h: number } | null>(null)
  const [debugMode,       setDebugMode]       = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const resizePreviewRef  = useRef<number | null>(null)
  const isResizingRef     = useRef(false)
  const gridRef           = useRef<HTMLDivElement>(null)
  const scrollParentRef   = useRef<Element | null>(null)
  const scrollCursorYRef  = useRef<number>(0)
  const scrollRafRef      = useRef<number | null>(null)
  const activeDragRef     = useRef<string | null>(null)
  const activeDropRef     = useRef<string | null>(null)
  const activeDropSideRef = useRef<"before" | "after" | "stack-above" | "stack-below" | null>(null)
  const dragPotentialRef  = useRef<{ uid: string; x: number; y: number } | null>(null)
  const dropRafRef        = useRef<number | null>(null)
  const dragJustEndedRef  = useRef(false)
  const dragStartPosRef   = useRef<{ x: number; y: number } | null>(null)
  const lastMouseXRef     = useRef<number>(0)
  const vertResizeRef     = useRef<{ uid: string; startY: number; startH: number; moved: boolean; startRect: { left: number; top: number; width: number } } | null>(null)
  const vertPreviewRef    = useRef<number | null>(null)
  const flipInnerRefs     = useRef<Record<string, HTMLDivElement | null>>({})
  const flipPrevRects     = useRef<Record<string, DOMRect>>({})
  const widthByUidRef     = useRef<Record<string, WidgetWidthClass>>({})
  widthByUidRef.current = widthByUid
  const layoutRef         = useRef<LayoutItem[]>(layout)
  layoutRef.current = layout
  const rowSpanByUidRef   = useRef<Record<string, number>>({})
  rowSpanByUidRef.current = rowSpanByUid
  initialSlotsRef.current = initialSlots

  // ── Undo history ──────────────────────────────────────────────────────────
  const historyRef = useRef<Array<{
    layout: LayoutItem[]
    widthByUid: Record<string, WidgetWidthClass>
    rowSpanByUid: Record<string, number>
  }>>([])

  function pushHistory() {
    historyRef.current = [
      ...historyRef.current.slice(-19),
      { layout: layoutRef.current, widthByUid: { ...widthByUidRef.current }, rowSpanByUid: { ...rowSpanByUidRef.current } },
    ]
  }

  const isDragging = dragUid !== null

  // ── Tentative layout: theoretical final state if user drops right now ────
  // Used ONLY for computing ghost destination position — never for rendering.
  // The actual grid renders from `layout` (stable during drag) so no widgets
  // jump around while the user is dragging — only the ghost indicator moves.
  const tentativeLayout = useMemo((): LayoutItem[] => {
    if (!dragUid || !dropUid || dragUid === dropUid) return layout

    let dragSlot: LayoutEntry | null = null
    const arr: LayoutItem[] = []
    for (const e of layout) {
      if (isStack(e)) {
        const slotI = e.slots.findIndex(s => s.uid === dragUid)
        if (slotI !== -1) {
          dragSlot = e.slots[slotI]
          const rem = e.slots.filter(s => s.uid !== dragUid)
          if (rem.length === 1) arr.push(rem[0])
          else if (rem.length > 1) arr.push({ ...e, slots: rem })
        } else arr.push(e)
      } else {
        if (e.uid === dragUid) dragSlot = e
        else arr.push(e)
      }
    }
    if (!dragSlot) return layout

    if ((dropSide === "stack-above" || dropSide === "stack-below") && dragSlot.widthClass === "narrow") {
      const targetI = arr.findIndex(e => isStack(e) ? e.slots.some(s => s.uid === dropUid) : e.uid === dropUid)
      if (targetI !== -1) {
        const targetEntry = arr[targetI]
        if (!isStack(targetEntry) && targetEntry.widthClass === "narrow") {
          const preview: StackGroup = {
            type: "stack", uid: "preview-stack",
            slots: dropSide === "stack-above" ? [dragSlot, targetEntry] : [targetEntry, dragSlot],
          }
          arr.splice(targetI, 1, preview)
          return arr
        }
      }
    }

    const targetI = arr.findIndex(e => isStack(e)
      ? (e.uid === dropUid || e.slots.some(s => s.uid === dropUid))
      : e.uid === dropUid,
    )
    if (targetI === -1) return layout
    arr.splice(dropSide === "after" ? targetI + 1 : targetI, 0, dragSlot)

    // Pre-compute adapted width so preview matches post-drop state exactly
    {
      const wbu = widthByUidRef.current
      let col = 0, rowIdxs: number[] = [], dragRowIdxs: number[] = []
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i]
        const span = isStack(item) ? 4 : colSpanForWidth(wbu[(item as LayoutEntry).uid] ?? (item as LayoutEntry).widthClass)
        if (col + span > 12) { col = span; rowIdxs = [i] }
        else { col += span; rowIdxs.push(i) }
        const hasDrag = isStack(item) ? item.slots.some(s => s.uid === dragUid) : (item as LayoutEntry).uid === dragUid
        if (hasDrag) { dragRowIdxs = [...rowIdxs]; break }
      }
      const otherCols = dragRowIdxs
        .filter(idx => { const e = arr[idx]; return isStack(e) ? !e.slots.some(s => s.uid === dragUid) : (e as LayoutEntry).uid !== dragUid })
        .reduce((sum, idx) => { const e = arr[idx]; return sum + (isStack(e) ? 4 : colSpanForWidth(wbu[(e as LayoutEntry).uid] ?? (e as LayoutEntry).widthClass)) }, 0)
      const available = 12 - otherCols
      const dragCols = colSpanForWidth(wbu[dragUid] ?? dragSlot.widthClass)
      if (dragCols > available && available >= 4) {
        const adapted: WidgetWidthClass = available >= 12 ? "full" : available >= 8 ? "wide" : "narrow"
        const dragIdx = arr.findIndex(e => !isStack(e) && (e as LayoutEntry).uid === dragUid)
        if (dragIdx !== -1) arr[dragIdx] = { ...(arr[dragIdx] as LayoutEntry), widthClass: adapted }
      }
    }

    return arr
  }, [layout, dragUid, dropUid, dropSide])

  // ── Ghost destination info: where the dragged widget would land ───────────
  // Only computed when there is an active drag + valid drop target.
  const ghostInfo = useMemo((): { colStart: number; rowStart: number; colSpan: number; rowSpan: number } | null => {
    if (!dragUid || !dropUid) return null
    // Find dragged entry in tentativeLayout (may have adapted widthClass)
    const tentEntry = tentativeLayout.find(e => !isStack(e) && (e as LayoutEntry).uid === dragUid) as LayoutEntry | undefined
    if (!tentEntry) return null
    const adaptedWidth = tentEntry.widthClass
    // Override widthByUid so computeExplicitPositions uses the adapted width
    const tempWBU = { ...widthByUid, [dragUid]: adaptedWidth }
    const positions = computeExplicitPositions(tentativeLayout, tempWBU, rowSpanByUid, null)
    const p = positions[dragUid]
    if (!p) return null
    return {
      colStart: p.colStart,
      rowStart: p.rowStart,
      colSpan: colSpanForWidth(adaptedWidth),
      rowSpan: rowSpanByUid[dragUid] ?? tentEntry.rowSpan ?? DEFAULT_ROW_SPAN,
    }
  }, [tentativeLayout, dragUid, dropUid, widthByUid, rowSpanByUid])

  // ── Explicit grid positions for every widget in the actual layout ─────────
  // Uses `layout` (not tentativeLayout) so positions are stable during drag.
  const gridPositions = useMemo(
    () => computeExplicitPositions(layout, widthByUid, rowSpanByUid, dragUid),
    [layout, widthByUid, rowSpanByUid, dragUid],
  )

  function getColWidthPx(): number {
    if (!gridRef.current) return 80
    // 12 columns, 11 gaps × 16px between them
    return (gridRef.current.offsetWidth - 11 * 16) / 12
  }

  // ── Horizontal resize ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!resizing) return
    function onMove(e: MouseEvent) {
      const dx = e.clientX - resizing!.startX
      const colW = getColWidthPx()
      const mult = resizing!.edge === "left" ? -1 : 1
      const newPx = Math.max(colW * 3.5, Math.min(gridRef.current?.offsetWidth ?? colW * 12, resizing!.startRect.width + dx * mult))
      resizePreviewRef.current = newPx
      setResizePreviewPx(newPx)
    }
    function onUp() {
      const px = resizePreviewRef.current
      if (px !== null) {
        const colW = getColWidthPx()
        // Normalize by (colW + GU_GAP) so that each column boundary falls exactly
        // on an integer: narrow=4, half=6, wide=8, xl=9, full=12.
        const rawCols = (px + GU_GAP) / (colW + GU_GAP)
        const SNAP_COLS = [4, 6, 8, 9, 12] as const
        const W_MAP: Record<number, WidgetWidthClass> = { 4: "narrow", 6: "half", 8: "wide", 9: "xl", 12: "full" }
        const snapNearest = (n: number) => SNAP_COLS.reduce((a, b) => Math.abs(a - n) <= Math.abs(b - n) ? a : b)

        // Anchor: right handle → left edge (colStart) stays fixed; left handle → right edge (colEnd) stays fixed
        const pinnedColStart = gridPositions[resizing!.uid]?.colStart ?? 1
        const prevCols       = resizing!.startCols
        const pinnedColEnd   = pinnedColStart + prevCols - 1
        const maxCols = resizing!.edge === "right"
          ? 12 - (pinnedColStart - 1)
          : pinnedColEnd
        const newCols = snapNearest(Math.min(rawCols, maxCols))
        const newW = W_MAP[newCols]

        // ── Pre-compute row structure once (shared between both setters) ──────
        // Using closure `widthByUid` (pre-resize) and `layout` (pre-resize).
        const rows: LayoutEntry[][] = []
        let col = 0, currentRow: LayoutEntry[] = []
        for (const item of layout) {
          if (isStack(item)) {
            if (col + 4 > 12) { if (currentRow.length) rows.push([...currentRow]); currentRow = []; col = 4 }
            else col += 4
            continue
          }
          const e = item as LayoutEntry
          const span = colSpanForWidth(widthByUid[e.uid] ?? e.widthClass)
          if (col + span > 12) { if (currentRow.length) rows.push([...currentRow]); currentRow = [e]; col = span }
          else { col += span; currentRow.push(e) }
        }
        if (currentRow.length) rows.push([...currentRow])

        const foundRow = rows.find(r => r.some(e => e.uid === resizing!.uid)) ?? null
        const leftSibs  = foundRow ? foundRow.filter(e => e.uid !== resizing!.uid && (gridPositions[e.uid]?.colStart ?? 0) < pinnedColStart) : []
        const rightSibs = foundRow ? foundRow.filter(e => e.uid !== resizing!.uid && (gridPositions[e.uid]?.colStart ?? 0) > pinnedColStart) : []

        const newColStartAfterResize = resizing!.edge === "right"
          ? pinnedColStart
          : Math.max(1, pinnedColEnd - newCols + 1)

        // ── Determine which siblings go BEFORE vs AFTER the resized widget ───
        // Right-handle: left edge pinned → all left siblings go before (their spans
        //   are unchanged and sum exactly to pinnedColStart − 1).
        // Left-handle: right edge pinned, widget shifts left → ONLY the adjacent
        //   (rightmost) left sibling fits before. If multiple left siblings were placed
        //   before, their combined span would exceed newColStart − 1 and the resized
        //   widget would wrap to the next row. Others go after (wrap via bin-packing).
        const beforeResizedUids = new Set<string>()
        if (resizing!.edge === "right") {
          leftSibs.forEach(s => beforeResizedUids.add(s.uid))
        } else {
          const available = newColStartAfterResize - 1
          if (available >= 4 && leftSibs.length > 0) {
            const rightmostLeft = leftSibs.reduce((best, sib) =>
              (gridPositions[sib.uid]?.colStart ?? 0) > (gridPositions[best.uid]?.colStart ?? 0) ? sib : best
            )
            beforeResizedUids.add(rightmostLeft.uid)
          }
        }

        pushHistory()

        setWidthByUid(prev => {
          const next = { ...prev, [resizing!.uid]: newW }

          if (foundRow && foundRow.length >= 2) {
            if (resizing!.edge === "right") {
              // Left siblings untouched → total span = pinnedColStart − 1 preserved.
              const available = 12 - (pinnedColStart - 1) - newCols
              if (rightSibs.length === 1 && available >= 4) {
                next[rightSibs[0].uid] = W_MAP[snapNearest(available)]
              } else if (rightSibs.length >= 2) {
                // Give all available to the adjacent (leftmost) right sibling.
                const leftmostRight = rightSibs.reduce((best, sib) =>
                  (gridPositions[sib.uid]?.colStart ?? 0) < (gridPositions[best.uid]?.colStart ?? 0) ? sib : best
                )
                if (available >= 4) next[leftmostRight.uid] = W_MAP[snapNearest(available)]
              }
            } else {
              // Left-handle: right siblings untouched. Only the adjacent (rightmost)
              // left sibling absorbs the change so its span = newColStart − 1 exactly.
              const available = newColStartAfterResize - 1
              if (leftSibs.length > 0 && available >= 4) {
                const rightmostLeft = leftSibs.reduce((best, sib) =>
                  (gridPositions[sib.uid]?.colStart ?? 0) > (gridPositions[best.uid]?.colStart ?? 0) ? sib : best
                )
                next[rightmostLeft.uid] = W_MAP[snapNearest(available)]
              }
            }
          }

          // Second pass: expand widgets displaced from the resized widget's original row.
          {
            const origRow = rows.find(r => r.some(e => e.uid === resizing!.uid)) ?? []
            const origRowUids = new Set(origRow.map(e => e.uid))
            let sc = 0, sr: { uid: string }[] = []
            const flushSr = () => {
              if (sr.length === 1) {
                const { uid } = sr[0]
                if (origRowUids.has(uid) && uid !== resizing!.uid && slotMap.get(uid)?.autoExpand !== false) {
                  next[uid] = "full"
                }
              }
              sr = []
            }
            for (const item of layout) {
              if (isStack(item)) {
                if (sc + 4 > 12) { flushSr(); sc = 4 } else sc += 4
                continue
              }
              const e = item as LayoutEntry
              const span = colSpanForWidth(next[e.uid] ?? e.widthClass)
              if (sc + span > 12) { flushSr(); sc = span } else sc += span
              sr.push({ uid: e.uid })
            }
            flushSr()
          }

          return next
        })

        // Reorder the layout array so bin-packing places the resized widget at its
        // correct post-resize colStart. Uses pre-computed beforeResizedUids to ensure
        // the two setters always agree on which siblings go before vs after.
        setLayout(prev => {
          const foundRow2 = rows.find(r => r.some(e => e.uid === resizing!.uid))
          if (!foundRow2 || foundRow2.length < 2) return prev

          const rowUids = new Set(foundRow2.map(e => e.uid))
          const beforeResized = foundRow2
            .filter(e => e.uid !== resizing!.uid && beforeResizedUids.has(e.uid))
            .sort((a, b) => (gridPositions[a.uid]?.colStart ?? 0) - (gridPositions[b.uid]?.colStart ?? 0))
          const afterResized  = foundRow2
            .filter(e => e.uid !== resizing!.uid && !beforeResizedUids.has(e.uid))
            .sort((a, b) => (gridPositions[a.uid]?.colStart ?? 0) - (gridPositions[b.uid]?.colStart ?? 0))
          const resizedItem = foundRow2.find(e => e.uid === resizing!.uid)!
          const orderedRow  = [...beforeResized, resizedItem, ...afterResized]

          const result: LayoutItem[] = []
          let rowInserted = false
          for (const item of prev) {
            if (!isStack(item) && rowUids.has((item as LayoutEntry).uid)) {
              if (!rowInserted) { orderedRow.forEach(e => result.push(e)); rowInserted = true }
            } else {
              result.push(item)
            }
          }
          return result
        })
      }
      // Do NOT set dragJustEndedRef here — the auto-expand would see a lone widget
      // and immediately re-expand it back to "full", cancelling the user's resize.
      isResizingRef.current = false
      setResizing(null)
      setResizePreviewPx(null)
      resizePreviewRef.current = null
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      isResizingRef.current = false
      setResizing(null)
      setResizePreviewPx(null)
      resizePreviewRef.current = null
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("keydown", onEsc)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("keydown", onEsc)
    }
  }, [resizing])

  // ── Drag-and-drop (threshold + tracking + commit) ─────────────────────────
  useEffect(() => {
    // Continuous RAF loop: scrolls smoothly while cursor is near the edge, even when mouse is still
    function scrollLoop() {
      if (!activeDragRef.current) return
      const sp = scrollParentRef.current
      if (sp) {
        const SCROLL_EDGE = 80, SCROLL_SPEED = 12
        const isDocEl = sp === document.documentElement
        const spTop    = isDocEl ? 0 : (sp as HTMLElement).getBoundingClientRect().top
        const spBottom = isDocEl ? window.innerHeight : (sp as HTMLElement).getBoundingClientRect().bottom
        const relY    = scrollCursorYRef.current - spTop
        const height  = spBottom - spTop
        if (relY < SCROLL_EDGE) {
          sp.scrollTop -= SCROLL_SPEED * (1 - relY / SCROLL_EDGE)
        } else if (relY > height - SCROLL_EDGE) {
          sp.scrollTop += SCROLL_SPEED * (1 - (height - relY) / SCROLL_EDGE)
        }
      }
      scrollRafRef.current = requestAnimationFrame(scrollLoop)
    }

    function onMove(e: MouseEvent) {
      if (dragPotentialRef.current) {
        const { uid, x, y } = dragPotentialRef.current
        if (Math.hypot(e.clientX - x, e.clientY - y) > 8) {
          dragPotentialRef.current = null
          activeDragRef.current = uid
          dragStartPosRef.current = { x, y }
          lastMouseXRef.current = e.clientX
          scrollParentRef.current = findScrollParent(gridRef.current?.parentElement ?? null)
          scrollCursorYRef.current = e.clientY
          scrollRafRef.current = requestAnimationFrame(scrollLoop)
          setDragUid(uid)
          setHoveredUid(null)
          // Show cursor chip immediately via DOM ref — no state, no re-render
          if (cursorChipRef.current) {
            const title = initialSlotsRef.current.find(s => s.uid === uid)?.title ?? ""
            const titleEl = cursorChipRef.current.querySelector("[data-chip-title]") as HTMLElement | null
            if (titleEl) titleEl.textContent = title
            cursorChipRef.current.style.left = `${e.clientX + 14}px`
            cursorChipRef.current.style.top = `${e.clientY - 14}px`
            cursorChipRef.current.style.display = "flex"
          }
        }
        return
      }
      if (!activeDragRef.current) return
      // Update chip position via DOM ref — no setState, no re-render per mousemove
      if (cursorChipRef.current) {
        cursorChipRef.current.style.left = `${e.clientX + 14}px`
        cursorChipRef.current.style.top = `${e.clientY - 14}px`
      }
      // Track cursor position for the continuous scroll RAF loop and drag-distance check
      scrollCursorYRef.current = e.clientY
      lastMouseXRef.current = e.clientX
      const el = document.elementFromPoint(e.clientX, e.clientY)
      let foundSlotEl = (el as HTMLElement)?.closest?.("[data-slot-uid]") as HTMLElement | null

      // If the cursor is directly over the drag ghost, treat it as "no slot"
      // so gap-detection finds the nearest real target instead of returning null.
      if (foundSlotEl?.dataset?.slotUid === activeDragRef.current) {
        foundSlotEl = null
      }

      // Gap detection: cursor not over any valid slot → find nearest non-drag slot
      if (!foundSlotEl && gridRef.current) {
        const gr = gridRef.current.getBoundingClientRect()
        if (e.clientX >= gr.left && e.clientX <= gr.right && e.clientY >= gr.top && e.clientY <= gr.bottom) {
          const all = Array.from(gridRef.current.querySelectorAll("[data-slot-uid]")) as HTMLElement[]
          let best: HTMLElement | null = null, minD = Infinity
          for (const s of all) {
            if (s.dataset.slotUid === activeDragRef.current) continue
            const r = s.getBoundingClientRect()
            const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2))
            if (dist < minD) { minD = dist; best = s }
          }
          if (best) foundSlotEl = best
        }
      }

      const uid = foundSlotEl?.dataset?.slotUid ?? null
      const newDrop = uid && uid !== activeDragRef.current ? uid : null

      let newSide: "before" | "after" | "stack-above" | "stack-below" | null = null
      if (newDrop && foundSlotEl) {
        const r = foundSlotEl.getBoundingClientRect()
        const dragEl = gridRef.current?.querySelector(`[data-slot-uid="${activeDragRef.current}"]`) as HTMLElement | null
        const dragIsNarrow = dragEl?.dataset?.slotWidth === "narrow"
        const targetIsNarrow = foundSlotEl?.dataset?.slotWidth === "narrow"
        // Use the ghost's position (not cursor) to determine drop side.
        // Ghost stays at the original grid position, so ghost-center vs target-center
        // reliably encodes the intended direction: ghost to the right of target → "before",
        // ghost to the left → "after". This fixes drag-left snap-back: cursor enters
        // target from the right and the old cursor-based check gave "after" (no move).
        const dr = dragEl?.getBoundingClientRect()
        function ghostSide(rr: DOMRect): "before" | "after" {
          if (!dr) return e.clientX < rr.left + rr.width / 2 ? "before" : "after"
          const gx = dr.left + dr.width / 2, gy = dr.top + dr.height / 2
          const tx = rr.left + rr.width / 2, ty = rr.top + rr.height / 2
          const dx = Math.abs(gx - tx), dy = Math.abs(gy - ty)
          return dx >= dy ? (gx > tx ? "before" : "after") : (gy > ty ? "before" : "after")
        }
        if (dragIsNarrow && targetIsNarrow) {
          const yFrac = (e.clientY - r.top) / r.height
          if (yFrac < 0.35) newSide = "stack-above"
          else if (yFrac > 0.65) newSide = "stack-below"
          else newSide = ghostSide(r)
        } else {
          newSide = ghostSide(r)
        }
      }

      // Update refs immediately (for reliable onUp commit).
      // Sync React state on the next animation frame — this keeps the ghost
      // destination smooth without flooding the render queue.
      if (newDrop !== null && (newDrop !== activeDropRef.current || newSide !== activeDropSideRef.current)) {
        activeDropRef.current = newDrop
        activeDropSideRef.current = newSide
        if (dropRafRef.current !== null) cancelAnimationFrame(dropRafRef.current)
        dropRafRef.current = requestAnimationFrame(() => {
          setDropUid(activeDropRef.current)
          setDropSide(activeDropSideRef.current)
          dropRafRef.current = null
        })
      }
    }

    function onUp() {
      if (dropRafRef.current !== null) { cancelAnimationFrame(dropRafRef.current); dropRafRef.current = null }
      const dUid = activeDragRef.current
      const tUid = activeDropRef.current
      const side = activeDropSideRef.current
      // Cancel commit if user barely moved — accidental mousedown+up within 48px of drag origin
      const start = dragStartPosRef.current
      const movedEnough = !start || Math.hypot(lastMouseXRef.current - start.x, scrollCursorYRef.current - start.y) >= 48
      if (dUid && tUid && movedEnough) {
        // ── Pre-compute row redistribution using layoutRef (always current) ──
        // layoutRef.current is synced on each render so it's never stale inside the
        // [] useEffect closure. Computing here avoids the lazy-updater timing issue
        // where variables set inside setLayout(prev=>{}) are null when read outside.
        const SNAP_COLS = [4, 6, 8, 9, 12] as const
        const W_MAP: Record<number, WidgetWidthClass> = { 4: "narrow", 6: "half", 8: "wide", 9: "xl", 12: "full" }
        const snapN = (n: number) => SNAP_COLS.reduce((a, b) => Math.abs(a - n) <= Math.abs(b - n) ? a : b)

        const targetRowRaw = findRowContaining(tUid, layoutRef.current, widthByUidRef.current)
        const dWasInRow    = targetRowRaw.some(e => e.uid === dUid)
        const targetRow    = targetRowRaw.filter(e => e.uid !== dUid)
        const N            = targetRow.length + 1  // existing row widgets + dragged widget

        let rowAdaptations: Record<string, WidgetWidthClass> | null = null
        if (!dWasInRow && N <= 3) {
          const dragEntry = layoutRef.current.find(e => !isStack(e) && (e as LayoutEntry).uid === dUid) as LayoutEntry | undefined
          if (dragEntry) {
            const newW = W_MAP[snapN(Math.floor(12 / N))]
            rowAdaptations = Object.fromEntries([...targetRow, dragEntry].map(e => [e.uid, newW]))
          }
        }

        pushHistory()

        setLayout(prev => {
          let dragSlot: LayoutEntry | null = null
          const next: LayoutItem[] = []
          for (const e of prev) {
            if (isStack(e)) {
              const slotI = e.slots.findIndex(s => s.uid === dUid)
              if (slotI !== -1) {
                dragSlot = e.slots[slotI]
                const rem = e.slots.filter(s => s.uid !== dUid)
                if (rem.length === 1) next.push(rem[0])
                else if (rem.length > 1) next.push({ ...e, slots: rem })
              } else next.push(e)
            } else {
              if (e.uid === dUid) dragSlot = e
              else next.push(e)
            }
          }
          if (!dragSlot) return prev

          if (side === "stack-above" || side === "stack-below") {
            const tI = next.findIndex(e => isStack(e) ? e.slots.some(s => s.uid === tUid) : e.uid === tUid)
            if (tI !== -1) {
              const targetEntry = next[tI]
              if (!isStack(targetEntry) && targetEntry.widthClass === "narrow" && dragSlot.widthClass === "narrow") {
                const newStack: StackGroup = {
                  type: "stack",
                  uid: `stack-${dragSlot.uid}-${targetEntry.uid}`,
                  slots: side === "stack-above" ? [dragSlot, targetEntry] : [targetEntry, dragSlot],
                }
                next.splice(tI, 1, newStack)
                return next
              }
            }
            const fbI = next.findIndex(e => isStack(e) ? e.slots.some(s => s.uid === tUid) : e.uid === tUid)
            fbI !== -1 ? next.splice(fbI, 0, dragSlot) : next.push(dragSlot)
            return next
          }

          const tI = next.findIndex(e => isStack(e)
            ? (e.uid === tUid || e.slots.some(s => s.uid === tUid))
            : e.uid === tUid,
          )
          if (tI === -1) { next.push(dragSlot); return next }
          next.splice(side === "after" ? tI + 1 : tI, 0, dragSlot)
          return next
        })

        if (rowAdaptations !== null) {
          setWidthByUid(wbu => ({ ...wbu, ...rowAdaptations! }))
        }
        dragJustEndedRef.current = true
      }
      if (scrollRafRef.current !== null) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null }
      dragPotentialRef.current = null
      activeDragRef.current = null
      dragStartPosRef.current = null
      activeDropRef.current = null
      activeDropSideRef.current = null
      if (cursorChipRef.current) cursorChipRef.current.style.display = "none"
      setDragUid(null)
      setDropUid(null)
      setDropSide(null)
    }

    function onEscDrag(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      if (dropRafRef.current !== null) { cancelAnimationFrame(dropRafRef.current); dropRafRef.current = null }
      if (scrollRafRef.current !== null) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null }
      dragPotentialRef.current = null
      activeDragRef.current = null
      activeDropRef.current = null
      activeDropSideRef.current = null
      if (cursorChipRef.current) cursorChipRef.current.style.display = "none"
      setDragUid(null)
      setDropUid(null)
      setDropSide(null)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("keydown", onEscDrag)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("keydown", onEscDrag)
      if (scrollRafRef.current !== null) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null }
    }
  }, [])

  // ── Grabbing cursor during drag ───────────────────────────────────────────
  useEffect(() => {
    document.body.style.cursor = isDragging ? "grabbing" : ""
    document.body.style.userSelect = isDragging ? "none" : ""
    return () => { document.body.style.cursor = ""; document.body.style.userSelect = "" }
  }, [isDragging])

  // ── Debug overlay toggle (Ctrl+Shift+D) ───────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault()
        setDebugMode(d => !d)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // ── Undo (Cmd+Z / Ctrl+Z) ─────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        const h = historyRef.current
        if (!h.length) return
        e.preventDefault()
        const snap = h[h.length - 1]
        historyRef.current = h.slice(0, -1)
        setLayout(snap.layout)
        setWidthByUid(snap.widthByUid)
        setRowSpanByUid(snap.rowSpanByUid)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // ── Vertical resize + collapse (GU-snapping) ─────────────────────────────
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!vertResizeRef.current) return
      const dy = e.clientY - vertResizeRef.current.startY
      if (Math.abs(dy) > 3) vertResizeRef.current.moved = true
      if (vertResizeRef.current.moved) {
        const rawPx    = Math.max(guToPixels(3), vertResizeRef.current.startH + dy)
        const slotDef = slotMap.get(vertResizeRef.current.uid)
        const min = slotDef?.minRowSpan ?? 3
        const max = slotDef?.maxRowSpan
        let snappedGu = Math.max(min, pixelsToGu(rawPx))
        if (max !== undefined) snappedGu = Math.min(max, snappedGu)
        vertPreviewRef.current = snappedGu
        setVertPreviewH({ uid: vertResizeRef.current.uid, h: guToPixels(snappedGu) })
      }
    }
    function onUp() {
      if (!vertResizeRef.current) return
      const { uid, moved } = vertResizeRef.current
      if (moved && vertPreviewRef.current !== null) {
        const slotDef = slotMap.get(uid)
        const min = slotDef?.minRowSpan ?? 3
        const max = slotDef?.maxRowSpan
        pushHistory()
        setRowSpanByUid(prev => {
          let next = Math.max(min, vertPreviewRef.current as number)
          if (max !== undefined) next = Math.min(max, next)
          return { ...prev, [uid]: next }
        })
      }
      // Collapse is now intentional — triggered only via the chevron button in the header.
      // The bottom edge is drag-to-resize only; a click without drag does nothing.
      vertResizeRef.current = null
      vertPreviewRef.current = null
      setVertPreviewH(null)
    }
    function onEscVert(e: KeyboardEvent) {
      if (e.key !== "Escape" || !vertResizeRef.current) return
      vertResizeRef.current = null
      vertPreviewRef.current = null
      setVertPreviewH(null)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("keydown", onEscVert)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("keydown", onEscVert)
    }
  }, [])

  // ── FLIP step 1: capture rects before layout change ───────────────────────
  useLayoutEffect(() => {
    return () => {
      const rects: Record<string, DOMRect> = {}
      Object.entries(flipInnerRefs.current).forEach(([uid, el]) => {
        if (el) rects[uid] = el.getBoundingClientRect()
      })
      flipPrevRects.current = rects
    }
  })

  // ── FLIP animation — smooth reorder on committed layout change ─────────────
  // Fires ONLY when layout changes (after drag commit), not during drag hover.
  // This is the key change: during drag, layout is stable so FLIP never fires,
  // eliminating the flicker. On drop, one clean FLIP animates all widgets.
  const flipRafRef = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (flipRafRef.current !== null) { cancelAnimationFrame(flipRafRef.current); flipRafRef.current = null }
    // Snap any in-progress animation before we start a new FLIP pass.
    // This ensures flipPrevRects holds settled positions, not mid-tween positions.
    Object.values(flipInnerRefs.current).forEach(el => {
      if (!el) return
      el.style.transition = ""
      el.style.transform  = ""
    })
    const prevRects = flipPrevRects.current
    // Step 2: apply negative transform — items appear at their OLD visual position
    Object.entries(flipInnerRefs.current).forEach(([uid, el]) => {
      if (!el || !prevRects[uid]) return
      const curr = el.getBoundingClientRect()
      const dx = prevRects[uid].left - curr.left
      const dy = prevRects[uid].top  - curr.top
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        el.style.transition = "none"
        el.style.transform  = `translate(${dx}px, ${dy}px)`
      }
    })
    // Step 3: next frame — animate each item to its new position
    flipRafRef.current = requestAnimationFrame(() => {
      flipRafRef.current = null
      Object.values(flipInnerRefs.current).forEach(el => {
        if (!el) return
        // Elevate outer grid cell temporarily so sliding widget clears its neighbors
        const outer = el.parentElement as HTMLElement | null
        if (outer && el.style.transform) { outer.style.zIndex = "2" }
        el.style.transition = "transform 260ms cubic-bezier(0.4,0,0.2,1)"
        el.style.transform  = ""
        setTimeout(() => { if (outer) outer.style.zIndex = "" }, 280)
      })
    })
  }, [layout, widthByUid])

  // ── Auto-fill rows after drag commit ─────────────────────────────────────
  // When a widget is moved, rows that end up with a single underfull widget
  // are expanded to fill the remaining columns (avoids empty column gaps).
  useEffect(() => {
    if (!dragJustEndedRef.current) return
    dragJustEndedRef.current = false
    setWidthByUid(prev => {
      let col = 0
      let rowItems: { uid: string; span: number; isEntry: boolean }[] = []
      let changed = false
      const next = { ...prev }
      const flushRow = () => {
        const used = rowItems.reduce((s, i) => s + i.span, 0)
        const slack = 12 - used
        if (slack > 0) {
          if (rowItems.length === 1 && rowItems[0].isEntry) {
            // Lone widget — expand to fill (unless autoExpand is explicitly false)
            const { uid } = rowItems[0]
            if (slotMap.get(uid)?.autoExpand !== false && next[uid] !== "full") { next[uid] = "full"; changed = true }
          } else if (rowItems.length === 2 && rowItems[1].isEntry && rowItems[0].isEntry && slack >= 2) {
            // Two widgets — give remaining cols to the last one
            const { uid } = rowItems[1]
            const newCols = rowItems[1].span + slack
            const W_MAP: Record<number, WidgetWidthClass> = { 4: "narrow", 6: "half", 8: "wide", 9: "xl", 12: "full" }
            const snap = [4, 6, 8, 9, 12].reduce((a, b) => Math.abs(a - newCols) <= Math.abs(b - newCols) ? a : b)
            const w = W_MAP[snap] ?? "full"
            if (next[uid] !== w) { next[uid] = w; changed = true }
          }
        }
        rowItems = []
      }
      for (const item of layout) {
        const uid = isStack(item) ? item.uid : (item as LayoutEntry).uid
        const span = isStack(item)
          ? 4
          : colSpanForWidth(next[(item as LayoutEntry).uid] ?? (item as LayoutEntry).widthClass)
        if (col + span > 12) { flushRow(); col = span } else { col += span }
        rowItems.push({ uid, span, isEntry: !isStack(item) })
      }
      flushRow()
      return changed ? next : prev
    })
  // Only depends on layout (drag reorders) — NOT widthByUid.
  // Resize has its own sibling-adjustment in onUp; running auto-expand after resize
  // would immediately re-expand the widget the user just intentionally made smaller.
  }, [layout])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={className} style={{ position: "relative" }}>
      {/* Debug overlay — toggled with Ctrl+Shift+D */}
      {debugMode && (
        <>
          {/* Column number bar */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            gap: GU_GAP,
            marginBottom: 6,
            pointerEvents: "none",
          }}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} style={{
                textAlign: "center",
                fontSize: 10,
                fontWeight: 700,
                color: "var(--primary)",
                background: "rgba(33,115,255,0.1)", // audit-ignore: dev-only debug overlay (Ctrl+Shift+D), not shipped DS surface
                borderRadius: 4,
                padding: "2px 0",
              }}>
                {i + 1}
              </div>
            ))}
          </div>
          {/* State panel */}
          <div style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 9999,
            background: "rgba(2,6,24,0.92)", // audit-ignore: dev-only debug overlay (Ctrl+Shift+D), not shipped DS surface
            color: "#e5eef8", // audit-ignore: dev-only debug overlay (Ctrl+Shift+D), not shipped DS surface
            fontFamily: "monospace",
            fontSize: 11,
            padding: "12px 16px",
            borderRadius: 8,
            maxWidth: 360,
            pointerEvents: "none",
            lineHeight: 1.7,
            border: "1px solid rgba(33,115,255,0.4)", // audit-ignore: dev-only debug overlay (Ctrl+Shift+D), not shipped DS surface
          }}>
            <div style={{ color: "#09E2AB", fontWeight: 700, marginBottom: 4 }}>CANVAS DEBUG  Ctrl+Shift+D</div> {/* audit-ignore: dev-only debug overlay, not shipped DS surface */}
            <div>drag: <span style={{ color: "#2173FF" }}>{dragUid ?? "–"}</span></div> {/* audit-ignore: dev-only debug overlay, not shipped DS surface */}
            <div>drop: <span style={{ color: "#2173FF" }}>{dropUid ?? "–"}</span>  side: {dropSide ?? "–"}</div> {/* audit-ignore: dev-only debug overlay, not shipped DS surface */}
            <div>ghost: {ghostInfo ? `col${ghostInfo.colStart}/span${ghostInfo.colSpan} row${ghostInfo.rowStart}/span${ghostInfo.rowSpan}` : "–"}</div>
            <div>resize: {resizing ? `${resizing.uid} (${resizing.edge})` : "–"}</div>
            <div>order: [{layout.map(e => isStack(e) ? `[${e.slots.map(s => s.uid.replace("w-", "")).join("+")}]` : (e as LayoutEntry).uid.replace("w-", "")).join(" ")}]</div>
            <div>widths: {Object.entries(widthByUid).map(([k, v]) => `${k.replace("w-", "")}:${v[0]}`).join(" ") || "–"}</div>
          </div>
        </>
      )}

      {/* Smooth resize overlay — fixed-position, no layout shift */}
      {resizing && resizePreviewPx !== null && (
        <div style={{
          position: "fixed",
          top: resizing.startRect.top,
          height: resizing.startRect.height,
          ...(resizing.edge === "left"
            ? { right: window.innerWidth - (resizing.startRect.left + resizing.startRect.width), width: resizePreviewPx }
            : { left: resizing.startRect.left, width: resizePreviewPx }
          ),
          background: "rgba(33,115,255,0.07)", // audit-ignore: resize-preview overlay, pending Figma effect-name mapping (2026-08 audit)
          border: "1.5px solid var(--color-border-primary-default)",
          borderRadius: 16,
          pointerEvents: "none",
          zIndex: 9999,
        }} />
      )}

      {/* Vertical resize preview overlay */}
      {vertPreviewH && (() => {
        const slotEl = gridRef.current?.querySelector(`[data-slot-uid="${vertPreviewH.uid}"]`) as HTMLElement | null
        const rect = slotEl?.getBoundingClientRect()
        if (!rect) return null
        return (
          <div style={{
            position: "fixed",
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: vertPreviewH.h,
            background: "rgba(33,115,255,0.07)", // audit-ignore: resize-preview overlay, pending Figma effect-name mapping (2026-08 audit)
            border: "1.5px solid var(--color-border-primary-default)",
            borderRadius: 16,
            pointerEvents: "none",
            zIndex: 9999,
          }} />
        )
      })()}

      {/* Cursor chip — position managed via DOM ref, never via React state */}
      <div
        ref={cursorChipRef}
        style={{
          display: "none",
          position: "fixed",
          pointerEvents: "none",
          zIndex: 9999,
          alignItems: "center",
          gap: 6,
          background: "var(--widget-bg)",
          border: "1.5px solid var(--color-border-primary-default)",
          borderRadius: 8,
          padding: "5px 12px",
          boxShadow: "0 6px 24px rgba(0,0,0,0.22)", // audit-ignore: Cursor chip shadow, pending Figma effect-name mapping (2026-08 audit)
        }}
      >
        <GripVertical size={12} style={{ color: "var(--primary)", flexShrink: 0 }} />
        <span
          data-chip-title=""
          style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-title)", whiteSpace: "nowrap" }}
        />
      </div>

      {/* 12-column canvas grid — auto-fills gaps when widgets are moved/resized */}
      <div
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gridAutoRows: `${GU_HEIGHT}px`,
          gridAutoFlow: "row",
          gap: GU_GAP,
          alignItems: "stretch",
        }}
      >
        {layout.map(entry => {
          // ── StackGroup: two narrow slots in one column ───────────────────
          if (isStack(entry)) {
            const stackSpan = entry.slots.reduce((sum, slot) =>
              sum + (rowSpanByUid[slot.uid] ?? slot.rowSpan ?? DEFAULT_ROW_SPAN), 0)
            const sPos = gridPositions[entry.uid]
            return (
              <div
                key={entry.uid}
                data-slot-uid={entry.uid}
                style={{
                  gridColumn: sPos ? `${sPos.colStart} / span 4` : "span 4",
                  gridRow: sPos ? `${sPos.rowStart} / span ${stackSpan}` : `span ${stackSpan}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: GU_GAP,
                  userSelect: "none",
                  position: "relative",
                }}
              >
                {entry.slots.map(slot => {
                  const slotDef = slotMap.get(slot.uid)
                  if (!slotDef) return null
                  const slotRowSpan     = rowSpanByUid[slot.uid] ?? slot.rowSpan ?? DEFAULT_ROW_SPAN
                  const isThisDragging  = dragUid === slot.uid
                  const isHovering      = hoveredUid === slot.uid && !isDragging
                  const isGhost         = isThisDragging
                  const isDropTarget    = !isThisDragging && dragUid !== null && dropUid === slot.uid
                  return (
                    <div
                      key={slot.uid}
                      data-slot-uid={slot.uid}
                      data-slot-width="narrow"
                      onMouseEnter={() => { if (!isDragging) setHoveredUid(slot.uid) }}
                      onMouseLeave={() => setHoveredUid(null)}
                      style={{
                        position: "relative",
                        height: guToPixels(slotRowSpan),
                        flexShrink: 0,
                        borderRadius: 16,
                        opacity: isGhost ? 0 : 1,
                        transition: "opacity 150ms ease, transform 220ms ease",
                        transform: isThisDragging ? "scale(0.97)" : "scale(1)",
                        zIndex: isThisDragging ? 100 : "auto",
                        display: "flex",
                        flexDirection: "column",
                        userSelect: "none",
                      }}
                    >
                      {isGhost && (
                        <div style={{
                          position: "absolute", inset: 0,
                          border: "2px dashed var(--color-border-primary-default)",
                          borderRadius: 16,
                          background: "var(--color-surface-primary-subtle)",
                          zIndex: 20, pointerEvents: "none",
                        }} />
                      )}
                      <div
                        ref={el => { flipInnerRefs.current[slot.uid] = el }}
                        style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", borderRadius: 16 }}
                      >
                        {isDropTarget && (dropSide === "before" || dropSide === "after") && (
                          <div style={{
                            position: "absolute",
                            top: 4, bottom: 4, width: 3,
                            background: "var(--color-border-primary-default)",
                            borderRadius: 2,
                            zIndex: 15, pointerEvents: "none",
                            ...(dropSide === "before" ? { left: 6 } : { right: 6 }),
                          }} />
                        )}
                        {isDropTarget && (dropSide === "stack-above" || dropSide === "stack-below" || dropSide === null) && (
                          <div style={{
                            position: "absolute", inset: 0,
                            background: "var(--color-surface-primary-subtle)",
                            border: "2px solid var(--color-border-primary-lighter)",
                            borderRadius: 16, zIndex: 15, pointerEvents: "none",
                          }} />
                        )}
                        <WidgetSizeContext.Provider value={{ widthClass: "narrow", isNarrow: true, isWide: false, isFull: false, availableHeight: guToPixels(slotRowSpan), contentHeight: Math.max(0, guToPixels(slotRowSpan) - WIDGET_CHROME_HEIGHT) }}>
                          <CardContainer size="lg" variant={slotDef.tone ?? "default"} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <WidgetFather
                              noCard
                              className="flex-1 min-h-0"
                              title={slotDef.title}
                              fillWidth
                              widthClass="narrow"
                              showRefresh={slotDef.showRefresh ?? true}
                              showMenu={slotDef.showMenu ?? true}
                              showInfo={slotDef.showInfo ?? false}
                              isHovered={isHovering}
                              isDragging={isThisDragging}
                              onGripMouseDown={e => {
                                if (isResizingRef.current || vertResizeRef.current) return
                                dragPotentialRef.current = { uid: slot.uid, x: e.clientX, y: e.clientY }
                              }}
                            >
                              {slotDef.content}
                            </WidgetFather>
                          </CardContainer>
                        </WidgetSizeContext.Provider>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }

          // ── Single slot ──────────────────────────────────────────────────
          const slotDef = slotMap.get(entry.uid)
          if (!slotDef) return null
          // During drag, use displayLayout's widthClass (which includes adapted width) so preview matches final result
          const currentWidth    = (isDragging && dragUid === entry.uid) ? entry.widthClass : (widthByUid[entry.uid] ?? entry.widthClass)
          const isThisDragging  = dragUid === entry.uid
          const isThisResizing  = resizing?.uid === entry.uid
          const isVertResizing  = vertResizeRef.current?.uid === entry.uid
          const isHovering      = hoveredUid === entry.uid && !isDragging && !isThisResizing
          const edge            = isHovering ? hoveredEdge : null
          const edgeShadow      = edge === "left"
            ? "-2px 0 0 0 var(--color-border-primary-default)"
            : edge === "right"
              ? "2px 0 0 0 var(--color-border-primary-default)"
              : edge === "bottom"
                ? "0 2px 0 0 var(--color-border-primary-default)"
                : "none"
          const isGhost         = isThisDragging
          const isDropTarget    = !isThisDragging && dragUid !== null && dropUid === entry.uid
          const currentRowSpan   = rowSpanByUid[entry.uid] ?? entry.rowSpan ?? DEFAULT_ROW_SPAN
          const effectiveRowSpan = currentRowSpan
          const ePos = gridPositions[entry.uid]

          return (
            <div
              key={entry.uid}
              data-slot-uid={entry.uid}
              data-slot-width={currentWidth}
              onMouseEnter={() => { if (!isDragging) setHoveredUid(entry.uid) }}
              onMouseLeave={() => { setHoveredUid(null); setHoveredEdge(null) }}
              style={{
                position: "relative",
                gridColumn: ePos ? `${ePos.colStart} / span ${colSpanForWidth(currentWidth)}` : `span ${colSpanForWidth(currentWidth)}`,
                gridRow: ePos ? `${ePos.rowStart} / span ${effectiveRowSpan}` : `span ${effectiveRowSpan}`,
                // Explicit height (not just grid-area stretch) — a grid item's default
                // min-height:auto resolves to its content's min-content size, which can
                // exceed the assigned track height and make the item balloon past its
                // cell, visually overlapping the widget below. Fixed height + minHeight:0
                // forces the overflow down into the inner CardContainer/ScrollArea
                // (already overflow:hidden) instead. Same defensive pattern as the
                // stacked-slot branch above, which sets height explicitly for the same reason.
                height: guToPixels(effectiveRowSpan),
                minHeight: 0,
                opacity: isGhost ? 0 : (isThisResizing || isVertResizing) ? 0.7 : 1,
                borderRadius: 16,
                boxShadow: edgeShadow,
                transition: isDragging && !isThisDragging
                  ? "none"
                  : "opacity 150ms ease, transform 220ms ease, box-shadow 100ms",
                transform: isThisDragging ? "scale(0.97)" : "scale(1)",
                zIndex: isThisDragging ? 100 : "auto",
                display: "flex",
                flexDirection: "column",
                userSelect: "none",
              }}
            >
              {isGhost && (
                <div style={{
                  position: "absolute", inset: 0,
                  border: "2px dashed var(--color-border-primary-default)",
                  borderRadius: 16,
                  background: "var(--color-surface-primary-subtle)",
                  zIndex: 20, pointerEvents: "none",
                }} />
              )}
              {/* Left edge resize handle — 20px zone for easier grabbing */}
              <div
                onMouseDown={e => {
                  e.stopPropagation(); e.preventDefault()
                  const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
                  isResizingRef.current = true
                  setResizing({ uid: entry.uid, edge: "left", startX: e.clientX, startCols: colSpanForWidth(currentWidth), startRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } })
                  setResizePreviewPx(rect.width)
                  resizePreviewRef.current = rect.width
                }}
                onMouseEnter={() => setHoveredEdge("left")}
                onMouseLeave={() => setHoveredEdge(null)}
                style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 20, cursor: "col-resize", zIndex: 20 }}
              />
              {/* Right edge resize handle — 20px zone for easier grabbing */}
              <div
                onMouseDown={e => {
                  e.stopPropagation(); e.preventDefault()
                  const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
                  isResizingRef.current = true
                  setResizing({ uid: entry.uid, edge: "right", startX: e.clientX, startCols: colSpanForWidth(currentWidth), startRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } })
                  setResizePreviewPx(rect.width)
                  resizePreviewRef.current = rect.width
                }}
                onMouseEnter={() => setHoveredEdge("right")}
                onMouseLeave={() => setHoveredEdge(null)}
                style={{ position: "absolute", right: 0, top: 8, bottom: 8, width: 20, cursor: "col-resize", zIndex: 20 }}
              />
              {/* Bottom edge — drag to resize height. Omitted entirely when
                  maxRowSpan is locked to minRowSpan (Compact-class widgets):
                  their content never grows past its natural size, so a
                  resize handle that can't actually do anything is just a
                  confusing affordance. */}
              {slotDef.maxRowSpan === undefined || slotDef.maxRowSpan > (slotDef.minRowSpan ?? 3) ? (
                <div
                  onMouseDown={e => {
                    if (isDragging || isResizingRef.current) return
                    e.stopPropagation()
                    e.preventDefault()
                    const slotEl = e.currentTarget.parentElement as HTMLElement
                    const rect = slotEl.getBoundingClientRect()
                    vertResizeRef.current = { uid: entry.uid, startY: e.clientY, startH: guToPixels(currentRowSpan), moved: false, startRect: { left: rect.left, top: rect.top, width: rect.width } }
                  }}
                  onMouseEnter={() => setHoveredEdge("bottom")}
                  onMouseLeave={() => setHoveredEdge(null)}
                  style={{ position: "absolute", left: 8, right: 8, bottom: 0, height: 18, cursor: "row-resize", zIndex: 20 }}
                />
              ) : null}
              {/* Debug: visualize resize hit zones */}
              {debugMode && (
                <>
                  {/* audit-ignore: dev-only debug overlay (Ctrl+Shift+D), not shipped DS surface — applies to the 3 divs below */}
                  <div style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 20, background: "rgba(255,80,80,0.45)", borderRadius: "4px 0 0 4px", zIndex: 50, pointerEvents: "none" }} /> {/* audit-ignore: dev-only debug overlay */}
                  <div style={{ position: "absolute", right: 0, top: 8, bottom: 8, width: 20, background: "rgba(40,200,80,0.45)", borderRadius: "0 4px 4px 0", zIndex: 50, pointerEvents: "none" }} /> {/* audit-ignore: dev-only debug overlay */}
                  <div style={{ position: "absolute", left: 8, right: 8, bottom: 0, height: 18, background: "rgba(80,100,255,0.45)", borderRadius: "0 0 4px 4px", zIndex: 50, pointerEvents: "none" }} /> {/* audit-ignore: dev-only debug overlay */}
                </>
              )}
              {/* FLIP animation target */}
              <div
                ref={el => { flipInnerRefs.current[entry.uid] = el }}
                style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minHeight: 0, borderRadius: 16 }}
              >
                {/* Directional insertion indicator — shows before/after relative to target widget */}
                {isDropTarget && (dropSide === "before" || dropSide === "after") && (
                  <div style={{
                    position: "absolute",
                    top: 4, bottom: 4, width: 3,
                    background: "var(--color-border-primary-default)",
                    borderRadius: 2,
                    zIndex: 15, pointerEvents: "none",
                    ...(dropSide === "before" ? { left: 6 } : { right: 6 }),
                  }} />
                )}
                {isDropTarget && (dropSide === "stack-above" || dropSide === "stack-below" || dropSide === null) && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "var(--color-surface-primary-subtle)",
                    border: "2px solid var(--color-border-primary-lighter)",
                    borderRadius: 16, zIndex: 15, pointerEvents: "none",
                  }} />
                )}
                <WidgetSizeContext.Provider value={{
                  widthClass: currentWidth,
                  isNarrow: currentWidth === "narrow",
                  isWide: currentWidth === "wide" || currentWidth === "xl" || currentWidth === "full",
                  isFull: currentWidth === "full",
                  availableHeight: guToPixels(effectiveRowSpan),
                  contentHeight: Math.max(0, guToPixels(effectiveRowSpan) - WIDGET_CHROME_HEIGHT),
                }}>
                  <CardContainer size="lg" variant={slotDef.tone ?? "default"} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <WidgetFather
                      noCard
                      className="flex-1 min-h-0"
                      title={slotDef.title}
                      fillWidth
                      widthClass={currentWidth}
                      showRefresh={slotDef.showRefresh ?? true}
                      showMenu={slotDef.showMenu ?? true}
                      showInfo={slotDef.showInfo ?? false}
                      isHovered={isHovering}
                      isDragging={isThisDragging}
                      onGripMouseDown={e => {
                        if (isResizingRef.current || vertResizeRef.current) return
                        dragPotentialRef.current = { uid: entry.uid, x: e.clientX, y: e.clientY }
                      }}
                    >
                      {slotDef.content}
                    </WidgetFather>
                  </CardContainer>
                </WidgetSizeContext.Provider>
              </div>
            </div>
          )
        })}

        {/* Insertion indicator is rendered directly on the target widget (isDropTarget) above.
            No full-size ghost destination — direction stripe on target is clearer. */}
      </div>

    </div>
  )
}
