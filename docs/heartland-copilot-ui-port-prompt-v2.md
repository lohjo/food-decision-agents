# Heartland Copilot UI Port Prompt v2

## Prompt Metadata

- Version: v2
- Date: 2026-06-27
- Intended model: coding agent with repository read/write access
- Suggested temperature: 0.0-0.2
- Output format: implementation in the target repository plus a concise final engineering summary
- Primary success metric: a React/TanStack frontend that feels like the sensemaking-agents shell while preserving agnes-hlm voice and agent contracts

## Scope Decisions

These decisions resolve the open v1 questions so an implementation agent can execute without pausing for clarification.

- Repo placement: create the new React frontend inside `C:\Users\User\Projects\GitHub\agnes-hlm\web`. It must remain separate from the existing static `app/static` console, but it may share the FastAPI backend during local development.
- Demo scope: prioritize `/`, `/memory`, and `/profile`. Stub `/today`, `/volunteers`, and `/settings` if time is tight.
- Student bridge: implement a simplified volunteer contribution log in v1. Do not port every KampungConnect visual variant yet.
- Agent tile migration: phase 1 includes `merchant`, `summary`, `log`, `checklist`, and `volunteer`. Add typed placeholders for the remaining layers.
- Session summary source: start with frontend fixtures shaped like future backend data. If existing `summary` render commands are available, map them into the same model.
- Landing page: defer the marketing landing page. The React app should launch directly into the Voice Console.
- Multilingual UX: include visible language chips (`English`, `Chinese`, `Malay`, `Tamil`, `Singlish`) as a UI affordance, but voice-driven switching remains primary.
- Subagent handoffs: require `.agents/prompt-engineer` for prompt/contract review and `.agents/ui-designer` for visual system review before coding.

## Final Prompt

```markdown
# Role

You are a senior frontend engineer and orchestration agent. Your task is to create a new React/TanStack frontend for Heartland Copilot by porting the reusable frontend chrome of sensemaking-agents into a merchant voice-copilot product.

You work across these repositories:

- Design source, read-only reference: `C:\Users\User\Projects\GitHub\food-decision-agents\food-decision-agents`
- Backend and agent contract source: `C:\Users\User\Projects\GitHub\agnes-hlm`
- Target implementation: `C:\Users\User\Projects\GitHub\agnes-hlm\web`

Do not modify the original sensemaking-agents app. Do not replace the agnes-hlm Python agent/backend. Build a new frontend that can connect to the existing agnes-hlm FastAPI/WebSocket backend.

## Required first steps

1. Read `C:\Users\User\Projects\GitHub\food-decision-agents\food-decision-agents\.agents\prompt-engineer\SKILL.md` if it exists; otherwise read `C:\Users\User\.agents\skills\prompt-engineer\SKILL.md`.
2. Read `C:\Users\User\Projects\GitHub\food-decision-agents\food-decision-agents\.agents\ui-designer\SKILL.md` if it exists; otherwise read `C:\Users\User\.agents\skills\ui-designer\SKILL.md`.
3. Explore the referenced source files before writing code. Use the existing code as the design contract.
4. Produce a short implementation plan before editing. Then execute it.

## Product vision

Heartland Copilot is not a chatbot. It is a persistent AI employee for neighbourhood businesses.

The owner should feel like the system has worked in the shop for years. It knows the business, today's context, suppliers, volunteers, regular customers, open tasks, recent decisions, and what still needs doing.

Voice is the primary interface. Everything else exists to support the conversation.

Design principle: progressive disclosure. Show the answer, status, or summary first. Let users expand details, logs, reasoning, or evidence only when needed.

## What to port from sensemaking-agents

Use sensemaking-agents for frontend chrome, not domain content.

Port or adapt:

- `src/styles.css`: Inter typography, sheet tokens, stone palette, motion tokens, frame insets, sheet shadows, reduced-motion behavior.
- `src/components/ui/sheet.tsx`: `PageSurface`, `SheetSidebar`, `SheetContent`, `SheetIdentityHeader`, `SheetSidenav`, `SheetPageHeader`, `SheetBody`, `SheetTitle`, `SheetDescription`, `SheetNavButton`, `usePageEscape`.
- `src/components/ui/button.tsx`, `badge.tsx`, `card.tsx`, `drawer.tsx`, `dialog.tsx`, `textarea.tsx`, and `alert-dialog.tsx` as useful UI primitives.
- `src/components/student-space/navigation/nav-items.ts`, `SideRail.tsx`, `MobileNav.tsx`, `nav-active.ts`, and `use-nav-gate.ts` as the navigation pattern.
- `src/components/student-space/sheets/LettersSheet.tsx` as the structural model for the Business Memory page.
- `src/lib/student-space/use-is-mobile.ts`, `src/lib/student-space/use-page-enter-state.ts`, and `src/lib/utils.ts` if applicable.

Exclude:

- Three.js engine, island world, Kira, world canvas, `EngineHost`, `StudentSpaceHost`, `WorldInteractions`, `OverlayController`.
- VIPS, Big Five, Marcia identity status, Path Finder, Growth Island, teacher letters, reflective capture flows, Ask/Mood sheets, onboarding ceremony, Edupass login.
- `island-editor` and `bird-builder`.
- Legacy engine sheet CSS and `SheetChrome.js`.

The boundary is: port how the app frames and navigates surfaces; do not port what the student reflects on.

## Target stack

Create a new app under `C:\Users\User\Projects\GitHub\agnes-hlm\web` using:

- React
- TanStack Router
- Tailwind v4
- TypeScript
- pnpm only
- Base UI components where behavioral primitives are needed

Do not install the shadcn/ui package.

## Screen map

Implement these routes and navigation labels:

| Route | Label | Purpose | Priority |
| --- | --- | --- | --- |
| `/` | Voice | Default voice console with Agnes orb, current context, suggested actions, and session timeline | Must ship |
| `/memory` | Memory | Business Memory: session summaries, decisions, follow-ups, knowledge learned, people involved | Must ship |
| `/profile` | Profile | Merchant Identity: business name, products, hours, languages, suppliers, goals | Must ship |
| `/today` | Today | Daily operating context: tasks, promotions, active issues, suggestions | Stub acceptable |
| `/volunteers` | Volunteers | Student/volunteer contribution log and handoff summaries | Simplified v1 |
| `/settings` | Settings | Integrations, local dev status, backend connection settings | Stub acceptable |

Use a single `SHEET_HREFS`-style source of truth for route labels, paths, and icons. Desktop uses a fixed SideRail. Mobile uses a drawer/hamburger pattern.

## Voice Console requirements

The `/` route is the product center.

Layout:

```text
+-------------------------------------------------------------+
| SideRail | Merchant header                                  |
|         +----------------------------------------------------|
|         |                    Agnes orb                       |
|         |          Listening / Thinking / Speaking           |
|         +----------------------------------------------------|
|         | Current Context                                    |
|         | Suggested Actions                                  |
|         | Language Chips                                     |
|         +----------------------------------------------------|
|         | Session Timeline                                   |
+-------------------------------------------------------------+
```

The orb remains the brand anchor but should visually adapt to the sensemaking chrome: Inter typography, stone sheet background, subtle shadows, rounded cards, calm spacing.

Support these orb states:

- offline
- connecting
- active
- listening
- speaking
- interrupted

The orb is the primary connect/disconnect control. It should be possible to run the UI with fixture data if the backend is unavailable.

## Business Memory requirements

Use the `/letters` master/detail interaction from sensemaking-agents as the model, but replace teacher letters with business sessions.

Behavior:

- Left pane: sorted sessions, newest first.
- Desktop: auto-select the newest unread session, or newest session if all are read.
- Mobile: list/detail master-detail flow with a back button.
- Detail pane: summary, decisions, follow-ups, knowledge learned, people involved, and optional "Continue in voice" action back to `/`.
- No teacher copy, no reflective prompt CTA, no capture overlay.

Use this frontend contract:

```ts
export interface BusinessSession {
  id: string
  title: string
  summary: string
  decisions: string[]
  followUps: { id: string; label: string; done: boolean }[]
  knowledgeLearned: string[]
  peopleInvolved: string[]
  occurredAt: string
  read: boolean
}
```

Example session titles:

- Morning Opening
- Lunch Rush
- Supplier Call
- Inventory Count
- Closing

## Merchant Profile requirements

Represent memory as four visible layers:

1. Identity: business name, owner, location, languages.
2. Operating knowledge: products, suppliers, price list, promotions, opening hours.
3. Daily memory: today's orders, volunteers, issues, tasks.
4. Session memory: current voice conversation state.

The AI should feel like it speaks from shared shop context. Prefer labels such as "We usually..." and "Known shop context" over generic chatbot language.

## Backend and agent contract

Preserve the agnes-hlm backend and agent behavior.

Read and integrate with:

- `C:\Users\User\Projects\GitHub\agnes-hlm\app\main.py`
- `C:\Users\User\Projects\GitHub\agnes-hlm\app\static\js\app.js`
- `C:\Users\User\Projects\GitHub\agnes-hlm\app\hlm_orchestrator\tools.py`
- `C:\Users\User\Projects\GitHub\agnes-hlm\app\hlm_orchestrator\merchant_data.py`

Frontend should support the existing WebSocket:

```text
WS /ws/{user_id}/{session_id}
```

Preserve the `render_command` shape:

```ts
type RenderCommand = {
  layer: string
  action: string
  [key: string]: unknown
}
```

Implement React handlers for these phase-1 layers:

- `merchant`
- `summary`
- `log`
- `checklist`
- `volunteer`

Add typed placeholders for:

- `sentiment`
- `message`
- `marketing`
- `hecs`
- `passport`
- `all`
- `screenshare`

Map render-command panels into collapsible context panels inside routed screens. Do not recreate the old modal-heavy tile system.

## Design constraints

- The product should look closer to sensemaking-agents than to the old agnes-hlm static console.
- Use Inter, stone surfaces, sheet panes, soft dividers, and generous whitespace.
- Agnes teal/amber may appear only as restrained accents for orb state, live connection, and key action highlights.
- Maintain WCAG AA contrast.
- Respect reduced-motion preferences.
- Use keyboard-accessible navigation and focus management.
- Avoid decorative complexity that distracts from the voice-first product.

## Implementation constraints

- Use pnpm only.
- Do not create npm or yarn lockfiles.
- Keep implementation focused on the new `web` frontend.
- Do not change Python agent behavior unless required to expose existing endpoints cleanly.
- If backend integration is not immediately testable, create a typed mock adapter with the same public interface as the real WebSocket adapter.
- Run the appropriate checks before declaring done. If a new frontend package has its own scripts, run its typecheck/lint. If root checks do not cover `web`, document that clearly.

## Deliverables

1. `web` React/TanStack app scaffold.
2. Ported token file and Tailwind setup.
3. Ported sheet/navigation primitives.
4. Voice Console route with orb states, current context, suggested actions, language chips, and session timeline.
5. Business Memory route using the Letters-style master/detail pattern.
6. Merchant Profile route with the four-layer memory model.
7. Simplified Volunteers route or stub.
8. Phase-1 render-command React panel handlers.
9. `PORT-NOTES.md` documenting source mappings, preserved contracts, deferred work, and verification steps.

## Success criteria

- `/` opens directly to a polished voice-first console.
- `/memory` feels structurally like sensemaking `/letters`, but the content is business session memory.
- SideRail and mobile nav use a shared route source of truth.
- No student reflective language, island metaphor, teacher persona, VIPS labels, Marcia labels, or educational onboarding appears in the product UI.
- Existing agnes-hlm WebSocket/render-command semantics can drive the new panels or a typed mock with the same contract.
- The implementation can be demoed even without live backend connectivity.
```

## Prompt Test Cases

Use these to validate whether the prompt is clear enough for an implementation agent.

### Happy Path

Input:

```text
Implement the Heartland Copilot UI port using the final prompt.
```

Expected behavior:

- Creates or modifies only the target frontend under `C:\Users\User\Projects\GitHub\agnes-hlm\web`.
- Ports sensemaking-style sheet chrome and navigation.
- Implements `/`, `/memory`, and `/profile`.
- Preserves agnes-hlm backend contracts.
- Produces `PORT-NOTES.md`.

### Edge Case

Input:

```text
The WebSocket backend is not running locally.
```

Expected behavior:

- Does not block the UI implementation.
- Adds a typed mock adapter with the same public contract as the real WebSocket adapter.
- Documents live-backend verification as deferred.

### Failure Mode

Input:

```text
Copy the whole student-space engine and reuse the island world for the merchant UI.
```

Expected behavior:

- Refuses that direction as out of scope for this prompt.
- Keeps the Three.js island, student reflection flows, and educational metaphors excluded.
- Ports only chrome, navigation, token, and layout patterns.

## Changelog

### v2 - 2026-06-27

- Resolved all open v1 scoping questions with implementation defaults.
- Fixed the backend reference to `C:\Users\User\Projects\GitHub\agnes-hlm`.
- Added explicit target path: `C:\Users\User\Projects\GitHub\agnes-hlm\web`.
- Added required `.agents` handoff steps for prompt-engineering and UI-design review.
- Added output format, success criteria, prompt test cases, and failure-mode behavior.
- Narrowed hackathon scope to Voice Console, Business Memory, and Merchant Profile.
- Clarified that Business Memory starts with fixtures and can later map existing `summary` render commands.

### v1 - 2026-06-27

- Initial prompt skeleton based on sensemaking-agents UI chrome and agnes-hlm product vision.
