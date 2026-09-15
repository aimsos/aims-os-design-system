import { createContext, useContext } from "react"

/**
 * WHO OWNS THE SCROLL POSITION OF A PAGE.
 *
 * A component that wants to react to the page scrolling has no reliable way to
 * find the element that scrolls. Walking up from itself fails twice over: a
 * card pinned in `ScreenLayout`'s header zone sits OUTSIDE the scroll
 * container and so has no scrollable ancestor at all, and a screen typically
 * holds several scrollers — the sidebar, a canvas widget's body, a side panel
 * — most of them parked at zero. Listening to all of them means the ones
 * standing still keep overwriting the one that moved.
 *
 * `ScreenLayout` already knows exactly which element scrolls, because it
 * created it. This is how it says so.
 *
 * A SUBSCRIPTION RATHER THAN A VALUE, deliberately. Putting `scrollTop` in
 * React state would re-render every screen on every scroll frame. The context
 * value here is created once and never changes identity: consumers subscribe
 * in an effect and are called directly, so a scroll costs nothing outside the
 * component that asked to hear about it.
 *
 * `max` travels with `top` because a consumer that changes its own height —
 * the Entity Header dropping a row — needs to know when the container has
 * clamped it, and clamping is only recognisable against the maximum.
 */
export type PageScrollInfo = { top: number; max: number }

export type PageScrollApi = {
  /** Returns an unsubscribe function. */
  subscribe: (listener: (info: PageScrollInfo) => void) => () => void
  /** The position right now, for a consumer setting up its own baseline. */
  read: () => PageScrollInfo
}

export const PageScrollContext = createContext<PageScrollApi | null>(null)

/**
 * `null` when there is no `ScreenLayout` above — the DS documentation pages
 * are the real case. A consumer must handle that rather than assume, and
 * falling back to its own listener is reasonable there precisely because a
 * page with no ScreenLayout is usually a single stage with a single scroller.
 */
export function usePageScroll(): PageScrollApi | null {
  return useContext(PageScrollContext)
}
