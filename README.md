# AIMS OS — Design System

A React + TypeScript component library and documentation site for AIMS OS, built directly against the Figma design file (`v6rmYKA2zmyXWOahlxLOeI`) so every token, state, and component behavior traces back to a real, verifiable source — not an approximation.

It exists to remove a specific bottleneck: **a PM should be able to generate a high-fidelity prototype screen without the design team redrawing it by hand**, using the exact same components engineering ships. See the in-app "DS Strategy" page (Overview tab) for the full reasoning.

## Repo structure

```
aims-os-design-system/
├── CLAUDE.md                        # rules Claude Code reads automatically every session
├── .claude/skills/                  # Claude Code skills (prototype generation, Figma audits)
├── .claude-plugin/                  # plugin marketplace manifest (see "Using the skills" below)
├── .github/CODEOWNERS               # enforces review on DS-owned files, see "Ownership" below
├── src/
│   ├── components/ui/               # the component library — Michael only
│   ├── components/layouts/          # composed layouts (ScreenLayout, ListViewSection, ...) — Michael only
│   ├── components/experimental/     # DS-GAP components, pending official promotion
│   ├── screens/                     # PM-generated prototype screens — PMs create/edit freely here
│   ├── App.tsx                      # the documentation site + PROTOTYPE_PAGES registry
│   └── index.css                    # design tokens (light/dark) — Michael only
└── scripts/                         # audit-tokens.cjs (CI-enforced), generate-specs.cjs
```

## Running it

```bash
npm install
npm run dev            # localhost:5173
npm run build           # tsc -b && vite build — must pass with 0 errors before any PR merges
npm run audit:tokens    # fails CI on hardcoded hex/rgba or orphaned components
```

## Generating a prototype screen

Full instructions (including a no-terminal path) live in the app itself: **DS Strategy → PM Working Guide** — that's the canonical, kept-up-to-date source, not this file. Short version:

1. Get Claude Code running against this repo — via the terminal CLI, the Claude Desktop app, or `claude.ai/code` (see the guide above for all three).
2. Describe the screen you need in plain language. The `aims-prototype-screen` skill (`.claude/skills/aims-prototype-screen/`) picks it up automatically, composes it from real components, registers it in the sidebar's "Prototypes" section, and ships it via a branch + PR.
3. Review with `npm run dev` (there is no per-PR preview URL — see "Where prototypes are deployed"), iterate in the same conversation, merge once checks pass.

## Using the skills as an installable plugin

This repo is also a Claude Code plugin marketplace (`.claude-plugin/marketplace.json`). Any collaborator can run:

```
/plugin marketplace add aimsos/aims-os-design-system
/plugin install aims-prototype-screen
```

This is an additional distribution channel on top of the automatic project-scoped loading — either way, you still need the repo connected to work with it (see "Generating a prototype screen" above).

## Ownership — what you can and cannot edit

| Path | Who | Enforcement |
|---|---|---|
| `src/screens/pm-[name].tsx` | Anyone | Freely create/edit — this is the whole point |
| `src/components/`, `src/App.tsx`, `src/index.css`, `src/lib/`, `tailwind.config.*`, `CLAUDE.md` | Michael (`@michaelorellana-design`) only | `.github/CODEOWNERS` auto-requests his review on any PR touching these, regardless of who authored it. It **requests**, it does not block — blocking needs branch protection on `main`, which this repo does not have. Treat his review as required by agreement, not by the tooling |

`.claude/`, `.claude-plugin/`, and `README.md` aren't CODEOWNERS-protected — low-risk doc/tooling changes there can merge without waiting on review.

## Where prototypes are deployed

Production: **https://aimsos.github.io/aims-os-design-system/** — each registered prototype gets a direct shareable link at `?proto=[prototype-id]`, viewable by anyone with the URL, no login. The site publishes from `main` to GitHub Pages (`gh-pages`) via Actions.
