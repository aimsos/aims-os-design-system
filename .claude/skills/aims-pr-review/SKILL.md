---
name: aims-pr-review
description: Reviews an open pull request on the aims-os-design-system repo end to end — pulls the exact branch into an isolated worktree, runs the build and the full audit-tokens.cjs checks, then does the manual/visual pass the repo's own CLAUDE.md documents as not automated (hand-rolled components disguised as inline JSX, button hierarchy, CODEOWNERS-protected files, screen registration, DS-GAP integrity), and finally gives a clear approve/not-approve verdict. When not approvable, produces both a short Slack message for the PM and a scoped, copy-paste-ready Claude Code prompt that fixes only what's broken. Use whenever Michael asks to check/review a PR (by number, by author, or "is there anything new from Thom/Lex"), asks whether a PR is ready to approve, or says to review and approve if it's clean. Do NOT use this for generating a new prototype screen (use aims-prototype-screen for that) or for syncing a DS component with Figma (use aims-ds-component).
---

# AIMS OS — PR Review

Turns the multi-step manual process Michael has been running by hand (find the PR → run CI → pull the branch → run the audit script → read the code for patterns the script can't catch → decide → write feedback) into one pass. The goal isn't to remove Michael from the approval decision — CODEOWNERS still requires his sign-off on protected paths, and that's intentional — it's to remove the mechanical labor so his time goes to the judgment calls that actually need a designer, not to re-discovering the same five anti-patterns by hand every time.

## Why this exists

Automated CI (build + `audit-tokens.cjs`) catches hardcoded colors, broken builds, named component shadows, and `variant="main"` overuse — but it has real, demonstrated gaps: a hand-rolled card-shaped `<div>` written inline (not wrapped in a named function) is invisible to the shadow-detection check, and nothing automated checks whether a screen's registration in `App.tsx` is scoped correctly or whether a core-file edit is additive vs. a risky rewrite. Every PR review in this repo's history so far has needed a human (or an agent) to actually read the diff for these — this skill encodes that reading so it happens the same way every time, regardless of how much time is available for the review.

## Step 1 — Find the target

If a PR number is given, use it directly. If not (`"revisa los PRs de Thom"`, `"¿hay algo nuevo?"`):

```bash
gh pr list --repo aimsos/aims-os-design-system --state open --json number,title,author,createdAt,updatedAt,mergeable,mergeStateStatus
```

Flag anything from a PM author that's new or updated since the last check. If there are several, review each independently — don't average a verdict across multiple PRs.

## Step 2 — CI status first

```bash
gh pr view <number> --repo aimsos/aims-os-design-system --json mergeable,mergeStateStatus,statusCheckRollup,files --jq '{mergeable, mergeStateStatus, checks: [.statusCheckRollup[] | {name: (.name // .context), status: (.conclusion // .state)}], files: [.files[].path]}'
```

- `mergeable: CONFLICTING` → stop here, report it, don't audit further until it's rebased.
- `checks: FAILURE` on the `checks` job → pull the failing run's log (`gh run view <id> --log-failed`) and go straight to Step 5 with the exact compiler/audit errors. Don't bother with the manual pass yet — a build that doesn't compile hasn't earned a design read.
- All green → continue to Step 3.

## Step 3 — Pull the exact branch and run the real checks locally

Never trust the CI summary alone for line-level detail — pull the branch into an isolated worktree (never the main checkout, never a branch name that collides with one Michael might be using):

```bash
git fetch origin pull/<number>/head
git worktree add /Users/mike/code/aims-os-pr<number>-review FETCH_HEAD
cd /Users/mike/code/aims-os-pr<number>-review
npm install --silent
npx tsc -b --noEmit
node scripts/audit-tokens.cjs
```

Read the full output, not just the exit code. Note which warnings are *new* (introduced by this PR's files) vs. pre-existing elsewhere in the repo — don't hold a PR responsible for warnings in files it didn't touch.

## Step 4 — The manual pass (the part CI can't do)

This is the checklist CLAUDE.md's own "DS consistency health check" section names as not automated. Go through the actual diff (`gh pr diff <number>`), not just the file list:

1. **Inline hand-rolled cards.** Check 8 in `audit-tokens.cjs` only catches a *named function* that takes `children` and renders card-shaped styling. It cannot catch the same pattern written directly inline in JSX. Grep the diff for the shape by hand:
   ```bash
   grep -nE 'style=\{\{[^}]*border[^}]*background|style=\{\{[^}]*background[^}]*border' <file>
   ```
   Any hit with `borderRadius` in the 8–16 range next to `var(--border)`/`var(--surface)`-family tokens is a CardContainer candidate — confirm by checking whether it's a clickable/bordered content block (card) vs. a small icon badge or inline alert (not a card, leave it).

2. **Button hierarchy, semantically.** The `main-overuse` check only counts literal occurrences. Read where each `variant="main"` actually sits — is it truly the one header-level CTA, or a content-area action that happens to be the only `main` in the file (so the count is 1, but it's still in the wrong place)? Cross-check against `CLAUDE.md`'s Button hierarchy rules and the one named exception (`RecordHeader`'s agent trigger).

3. **CODEOWNERS-protected files.** Check `.github/CODEOWNERS` first — if the diff touches `src/App.tsx`, `src/components/`, `src/index.css`, `src/lib/`, or `tailwind.config.*`, that's expected to require Michael's review, but scope matters:
   - `App.tsx` diff should be exactly an import line + one `PROTOTYPE_PAGES` entry (or, for an unrelated bugfix, a small self-contained change with a clear comment explaining it). Anything bigger is a signal to look closer.
   - A change to a shared `src/components/ui/` or `layouts/` file: is it **additive** (new optional prop, backward-compatible — generally fine to accept) or a **rewrite of existing internal behavior** (changes how something already works for every screen that uses it — needs to be pulled out of the PR and evaluated on its own, the way the `sidebar.tsx` collapse-logic rewrite was)? State which one it is explicitly in the verdict.
   - Never wave through a `.github/CODEOWNERS` edit that removes a protected path — that's a governance decision for Michael to make deliberately in its own conversation, never something to approve as part of an unrelated PR (this happened once already — see PR #55's history if it recurs).

4. **DS-GAP integrity.** Any new file in `src/components/experimental/` must start with a `// DS-GAP:` comment naming the closest real DS component. If a screen composes something bespoke without one, ask for the comment rather than assuming it's fine.

5. **Registration correctness.** If a new screen is being added, confirm it's actually reachable: registered in `PROTOTYPE_PAGES`, with a unique `id` and `?proto=` slug that doesn't collide with an existing one.

6. **Visual spot-check.** Pull the Vercel preview URL from the PR's bot comment (`gh pr view <number> --json comments`, or the `Vercel` check's target URL) and open it. Click through every tab/state the PR's own test plan lists. A build that compiles and passes the audit can still look visually wrong — screenshot anything that looks off.

7. **Create-flow surface selection.** If the diff adds a "New [Entity]" / "Create" affordance, run the Create pattern's own cascade against it (`CLAUDE.md` → "Create pattern — surface selection"; full reasoning in `docs/patterns/create.md`) rather than trusting whatever surface the PR picked. In order: does the object have its own builder/canvas → should be a hand-off, not a surface here at all; 2+ stages or any branching → must be a full-page wizard with `Stepper` + `StepperNavFooter`, never a `Stepper` inside a `SlideOut`; does the new object hang off something already on screen → `SlideOut type="full-slot"` regardless of field count; otherwise standalone → `ModalDialog variant="content"` only at 5 fields or fewer, a full-page form above that. Common miss: a contextual create (attaches to a visible parent) built as a `ModalDialog` instead of a `SlideOut`, or a standalone form over 5 fields crammed into a modal instead of promoted to a full page. Also check: an irreversible/tenant-wide create has a `ModalDialog variant="confirmation"` before saving (§4), and a create whose result isn't immediately visible calls `useToast().success(...)` rather than nothing or an in-flow `AlertBanner` (§4b).

**What to look for.** A screenshot only helps if you know what you are hunting.
Every item below is something that shipped in this repo while `tsc` and the
audit were both green:

- **Content clipped by a fixed height.** A widget slot, a card, a panel. The
  last row of a four-row list vanishing is invisible unless you count the rows.
- **Double padding.** A container that insets its own children *and* sits inside
  something that already inset it. The tell is a body that starts further in
  than its own title — `WidgetFather` gives 24px and content added another 16.
- **Labels wrapping to two lines.** Harmless-looking, but it grows a 37px row to
  55, and four of those overflow a fixed-height container and eat a row.
- **Content under a sticky footer.** `StepperNavFooter` is 72px against
  ScreenLayout's 64px bottom padding.
- **An empty state that does not fit its container.** The default `EmptyState`
  is 64px of vertical padding and clips its own CTA inside a widget. Use
  `compact`.
- **The same thing looking different in two screens.** Open both. This is the
  only way to catch drift — each screen is internally consistent, so nothing
  looks wrong until they are side by side.

Check at **1440px** (the DS baseline) and again in a **narrow column**, and in
both themes.

## Step 4b — Before any merge, two checks that cost seconds

Both of these were learned the expensive way on 2026-09-03.

**Check the base branch.** Never assume a PR targets `main`.

```bash
gh pr view <number> --json baseRefName,headRefName
```

PR #70 targeted `feat/voice-channel`, not `main`. Merging it changed nothing on
main, and `--delete-branch` removed the branch that PR #71 was stacked on —
which closed #71 automatically. Recovering it meant recreating the deleted
branch, reopening, retargeting, and resolving the conflicts the squash created.

If the base is not `main`, say so before merging, and check whether that base
has its own PR to `main`. If it does not, the work is not going anywhere.

**Check for stacked PRs before `--delete-branch`.**

```bash
gh pr list --state open --base $(gh pr view <number> --json headRefName -q .headRefName)
```

Any result means deleting the branch will close that PR. Merge without
`--delete-branch`, or retarget the dependent PR first.

**Check for in-flight work in the same files.** Before reviewing — and before
building anything yourself in that area:

```bash
gh pr list --state open --json number,author,files --jq '.[] | {n:.number, who:.author.login, files:[.files[].path]}'
```

An agent rebuilt a Stepper migration that the PM had already completed in an
open PR, on the same day. Nobody had looked.

## Step 5 — Verdict

State plainly: **approvable** or **not yet**. If not yet, produce two things, ready to hand off without further editing:

**A Slack message for the PM** — short, bullet points, matching this repo's established tone: what's wrong, why it matters (tie it to a concrete consequence, not just "this violates a rule"), no scolding.

**A scoped Claude Code prompt** — self-contained (the PM's session has no memory of this conversation), narrow (fixes only what's broken, explicit "don't add anything else" instruction so it doesn't snowball into new scope), with exact file/line references from Step 3-4's findings and the real component API (props, variants) pulled from the actual source file — never guessed from memory.

If approvable and Michael's instruction included "approve it if it's clean" (or equivalent), proceed directly:

```bash
gh pr review <number> --repo aimsos/aims-os-design-system --approve --body "<one-line summary of what was verified>"
gh pr merge <number> --repo aimsos/aims-os-design-system --merge --delete-branch
```

Note: if Michael is the PR author (his own DS-maintenance PRs), the `review --approve` call will fail with "Can not approve your own pull request" — that's expected, not an error to fix; proceed to merge directly.

Otherwise, report the verdict and wait for Michael to say to go ahead — don't assume "clean" means "go ahead" unless he said so.

## Step 6 — Clean up

Always remove the worktree once done, whether approved or not:

```bash
cd /Users/mike/code/aims-os-design-system
git worktree remove /Users/mike/code/aims-os-pr<number>-review --force
```

Leaving worktrees around from prior reviews is how `git worktree list` turns into clutter across sessions.

## What good output looks like

- A one-paragraph verdict up top, not buried after a wall of command output.
- Every claim backed by something actually read (a line number, a grep hit, a screenshot) — never "this looks fine" without having opened the file.
- Pre-existing warnings from other files clearly separated from what this specific PR introduced.
- If a prompt is generated, it stands alone — no "as we discussed," no assumed context the PM's own session won't have.
