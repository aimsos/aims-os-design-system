# Card Container

**Figma node:** [`5388:23473`](https://www.figma.com/design/v6rmYKA2zmyXWOahlxLOeI/Design-System---AIMS-OS?node-id=5388-23473)

Semantic container for grouping related content — the DS default for any bordered, filled box. If a screen needs a container with a border and a background, this is it, never a hand-rolled div. 11 colour styles communicate intent at a glance, but Default is the right answer in the overwhelming majority of cases; reach for a colour only when the design genuinely calls for one. S for compact items — entity rows, selectable cards, and items with a CTA inside a SlideOut or Modal. M for general content, L for featured sections. Nothing visual that is not part of the component belongs inside it: no accent stripes, no coloured top borders, no dividers bolted on. EmptyState renders inside the dashed variant.

## Properties

| Name | Type | Values | Default | Note |
| --- | --- | --- | --- | --- |
| Style | Variant | Default,White Opacity,Primary,Green,Reed,Orange,Yellow,Purple,Light Blue,Lime Green,Dashed | Default | — |
| Size | Variant | S,M,L | M | — |
| Selected | Boolean | true,false | false | Border width increases to 1px and color shifts to selected token. Use for card-based selection UI (radio cards, choice sets) |
| Disabled | Boolean | true,false | false | Reduces opacity to 40% and blocks pointer events |

## Sizes / scale

| Size | Padding | CornerRadius | Stroke |
| --- | --- | --- | --- |
| S | 12px all sides | 8px | 0.5px inside |
| M | 16px H / 24px V | 8px | 0.5px inside |
| L | 24px all sides | 16px | 0.5px inside |

## States / token groups

### Default

Border width: `0.5px`

| Role | Token / Variable | Figma variable | Light | Dark |
| --- | --- | --- | --- | --- |
| Background | --card-default-bg |  | #ffffff | rgba(255,255,255,0.05) |
| Border | --card-default-border |  | #bababa | rgba(255,255,255,0.15) |
| Border hover | --card-default-hover-bd |  | #5c5c5c | rgba(255,255,255,0.1) |
| Border selected | --card-default-selected-bd |  | #2173ff | #2b7fff |
| Hover shadow | --card-default-hover-shadow |  | 0 8px 24px rgba(33,115,255,0.12), 0 2px 6px rgba(0,0,0,0.06) | 8px 8px 16px 0px rgba(0,0,0,0.08), 0 0 4px 1px rgba(255,255,255,0.4), 0 0 14px 0px rgba(255,255,255,0.15) |

### White Opacity

Border width: `0.5px`

| Role | Token / Variable | Figma variable | Light | Dark |
| --- | --- | --- | --- | --- |
| Background (own token) | --card-whiteopacity-bg |  | #ffffff | rgba(255,255,255,0.1) |
| Border (reused) | --card-default-border |  | #bababa | rgba(255,255,255,0.15) |
| Border hover (reused) | --card-default-hover-bd |  | #5c5c5c | rgba(255,255,255,0.1) |
| Border selected (reused) | --card-default-selected-bd |  | #2173ff | #2b7fff |
| Hover shadow (own token) | --card-whiteopacity-hover-shadow |  | 0 8px 24px rgba(33,115,255,0.12), 0 2px 6px rgba(0,0,0,0.06) | 8px 8px 16px 0px rgba(0,0,0,0.08), 0 0 4px 1px rgba(255,255,255,0.4), 0 0 14px 0px rgba(255,255,255,0.15) |

### Primary

Border width: `0.5px`

| Role | Token / Variable | Figma variable | Light | Dark |
| --- | --- | --- | --- | --- |
| Background | --card-primary-bg |  | #f6f9ff | rgba(43,127,255,0.08) |
| Border | --card-primary-border |  | #80afff | rgba(43,127,255,0.1) |
| Border hover | --card-primary-hover-bd |  | #2173ff | #2b7fff |
| Border selected | --card-primary-selected-bd |  | #2173ff | #2b7fff |
| Hover shadow | --card-primary-hover-shadow |  | 0 8px 24px rgba(33,115,255,0.20), 0 0 12px rgba(33,115,255,0.12) | 8px 8px 16px 0px rgba(0,0,0,0.08), 0 0 4px 1px rgba(33,115,255,0.4), 0 0 14px 0px rgba(33,115,255,0.15) |

### Green

Border width: `0.5px`

| Role | Token / Variable | Figma variable | Light | Dark |
| --- | --- | --- | --- | --- |
| Background | --card-green-bg |  | #e5fdf8 | #0a1f1a |
| Border | --card-green-border |  | #00a07e | rgba(0,201,80,0.3) |
| Border hover | --card-green-hover-bd |  | #009978 | #34d399 |
| Border selected | --card-green-selected-bd |  | #009978 | #34d399 |
| Hover shadow | --card-green-hover-shadow |  | 0 8px 24px rgba(0,160,126,0.16), 0 2px 6px rgba(0,0,0,0.05) | 8px 8px 16px 0px rgba(0,0,0,0.08), 0 0 4px 1px rgba(0,201,79,0.4), 0 0 14px 0px rgba(0,201,79,0.15) |

### Reed

Border width: `0.5px`

| Role | Token / Variable | Figma variable | Light | Dark |
| --- | --- | --- | --- | --- |
| Background | --card-reed-bg |  | #fdeded | rgba(251,44,54,0.1) |
| Border | --card-reed-border |  | #d32f2f | #fb2c36 |
| Border hover | --card-reed-hover-bd |  | #d32f2f | #fb2c36 |
| Border selected | --card-reed-selected-bd |  | #d32f2f | #fb2c36 |
| Hover shadow | --card-reed-hover-shadow |  | 0 8px 24px rgba(211,47,47,0.16), 0 2px 6px rgba(0,0,0,0.05) | 8px 8px 16px 0px rgba(0,0,0,0.08), 0 0 4px 1px rgba(250,43,54,0.4), 0 0 14px 0px rgba(250,43,54,0.15) |

### Orange

Border width: `0.5px`

| Role | Token / Variable | Figma variable | Light | Dark |
| --- | --- | --- | --- | --- |
| Background | --card-orange-bg |  | #fff4e5 | #281e00 |
| Border | --card-orange-border |  | #edc6a6 | #2d1a08 |
| Border hover | --card-orange-hover-bd |  | #b25102 | #f59e0b |
| Border selected | --card-orange-selected-bd |  | #ed6c02 | #fbbf24 |
| Hover shadow | --card-orange-hover-shadow |  | 0 8px 24px rgba(237,108,2,0.16), 0 2px 6px rgba(0,0,0,0.05) | 8px 8px 16px 0px rgba(0,0,0,0.08), 0 0 4px 1px rgba(237,107,3,0.4), 0 0 14px 0px rgba(237,107,3,0.15) |

### Yellow

Border width: `0.5px`

| Role | Token / Variable | Figma variable | Light | Dark |
| --- | --- | --- | --- | --- |
| Background | --card-yellow-bg |  | #fffaf0 | #281e00 |
| Border | --card-yellow-border |  | #edc6a6 | #f59e0b |
| Border hover | --card-yellow-hover-bd |  | #ed6c02 | #fbbf24 |
| Border selected | --card-yellow-selected-bd |  | #663c00 | #fcd34d |
| Hover shadow | --card-yellow-hover-shadow |  | 0 8px 24px rgba(237,108,2,0.12), 0 2px 6px rgba(0,0,0,0.04) | 8px 8px 16px 0px rgba(0,0,0,0.08), 0 0 4px 1px rgba(252,199,0,0.4), 0 0 14px 0px rgba(252,199,0,0.15) |

### Purple

Border width: `0.5px`

| Role | Token / Variable | Figma variable | Light | Dark |
| --- | --- | --- | --- | --- |
| Background | --card-purple-bg |  | #f3e9fd | #120520 |
| Border | --card-purple-border |  | #cfa7f9 | rgba(173,70,255,0.2) |
| Border hover | --card-purple-hover-bd |  | #7b27ed | #a855f7 |
| Border selected | --card-purple-selected-bd |  | #2c075c | #d8b4fe |
| Hover shadow | --card-purple-hover-shadow |  | 0 8px 24px rgba(123,39,237,0.16), 0 2px 6px rgba(0,0,0,0.05) | 8px 8px 16px 0px rgba(0,0,0,0.08), 0 0 4px 1px rgba(173,69,255,0.4), 0 0 14px 0px rgba(173,69,255,0.15) |

### Light Blue

Border width: `0.5px`

| Role | Token / Variable | Figma variable | Light | Dark |
| --- | --- | --- | --- | --- |
| Background | --card-lightblue-bg |  | #e5f8ff | #071828 |
| Border | --card-lightblue-border |  | #99e5f9 | rgba(81,162,255,0.2) |
| Border hover | --card-lightblue-hover-bd |  | #00b5d9 | #38bdf8 |
| Border selected | --card-lightblue-selected-bd |  | #02445a | #7dd3fc |
| Hover shadow | --card-lightblue-hover-shadow |  | 0 8px 24px rgba(0,181,217,0.16), 0 2px 6px rgba(0,0,0,0.05) | 8px 8px 16px 0px rgba(0,0,0,0.08), 0 0 4px 1px rgba(82,163,255,0.4), 0 0 14px 0px rgba(82,163,255,0.15) |

### Lime Green

Border width: `0.5px`

| Role | Token / Variable | Figma variable | Light | Dark |
| --- | --- | --- | --- | --- |
| Background | --card-limegreen-bg |  | #f9fee5 | #111a04 |
| Border | --card-limegreen-border |  | #d4f381 | rgba(189,238,73,0.2) |
| Border hover | --card-limegreen-hover-bd |  | #a0da1d | #84cc16 |
| Border selected | --card-limegreen-selected-bd |  | #3e5c0a | #bdee49 |
| Hover shadow | --card-limegreen-hover-shadow |  | 0 8px 24px rgba(160,218,29,0.14), 0 2px 6px rgba(0,0,0,0.04) | 8px 8px 16px 0px rgba(0,0,0,0.08), 0 0 4px 1px rgba(189,237,74,0.4), 0 0 14px 0px rgba(189,237,74,0.15) |

### Dashed

Border width: `0.5px dashed`

| Role | Token / Variable | Figma variable | Light | Dark |
| --- | --- | --- | --- | --- |
| Background | — |  | transparent | transparent |
| Border (reused from Default) | --card-default-border |  | #bababa | rgba(255,255,255,0.15) |
| Border hover (reused from Default) | --card-default-hover-bd |  | #5c5c5c | rgba(255,255,255,0.1) |
| Border selected (reused from Default) | --card-default-selected-bd |  | #2173ff | #2b7fff |
| Hover shadow | --card-dashed-hover-shadow |  | 0 8px 24px rgba(33,115,255,0.10), 0 2px 6px rgba(0,0,0,0.04) | 8px 8px 16px 0px rgba(0,0,0,0.08), 0 0 4px 1px rgba(33,115,255,0.4), 0 0 14px 0px rgba(33,115,255,0.15) |

---

_Generated from `src/App.tsx` by `scripts/generate-specs.cjs`. This mirrors the same data the in-app SpecModal renders — edit the `_SPEC` object in `src/App.tsx`, not this file, then re-run the script._
