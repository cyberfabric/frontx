# PRD — FrontX Builder: Embedded AI Idea Generator

## Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Background / Problem Statement](#12-background--problem-statement)
  - [1.3 Goals](#13-goals)
  - [1.4 Glossary](#14-glossary)
  - [1.5 Working Prototype](#15-working-prototype)
- [2. Actors](#2-actors)
  - [2.1 Human Actors](#21-human-actors)
  - [2.2 System Actors](#22-system-actors)
- [3. Operational Concept & Environment](#3-operational-concept--environment)
  - [3.1 Module-Specific Environment Constraints](#31-module-specific-environment-constraints)
- [4. Scope](#4-scope)
  - [4.1 In Scope](#41-in-scope)
  - [4.2 Out of Scope](#42-out-of-scope)
- [5. Functional Requirements](#5-functional-requirements)
  - [5.1 Builder Activation](#51-builder-activation)
  - [5.2 Chat Panel](#52-chat-panel)
  - [5.3 Preview Panel](#53-preview-panel)
  - [5.4 AI Code Generation](#54-ai-code-generation)
- [6. Non-Functional Requirements](#6-non-functional-requirements)
  - [6.1 NFR Inclusions](#61-nfr-inclusions)
  - [6.2 NFR Exclusions](#62-nfr-exclusions)
- [7. Use Cases](#7-use-cases)
- [8. Acceptance Criteria](#8-acceptance-criteria)
- [9. Dependencies](#9-dependencies)
- [10. Assumptions](#10-assumptions)
- [11. Risks](#11-risks)
- [12. Future Considerations](#12-future-considerations)

## 1. Overview

### 1.1 Purpose

FrontX Builder is an AI-powered idea generator embedded within FrontX Studio.
It enables product managers, designers, and other non-technical stakeholders to
describe a UI concept in plain language and instantly receive a working,
interactive preview — without writing code. The builder surfaces as an
on-demand panel system within the Studio shell, keeping the AI generation
experience native to the FrontX development environment.

### 1.2 Background / Problem Statement

The FrontX screenset model introduces a three-stage SDLC pipeline
(draft → mockup → production), with the draft stage explicitly intended for
PM-driven prototyping. However, the current tooling requires PMs to work
directly in the CLI or IDE to create a screenset — a barrier for
non-technical stakeholders. There is no way for a PM or designer to go from
an idea to a running UI prototype without developer involvement.

A lightweight, prompt-driven builder embedded in Studio closes this gap. It
gives non-technical actors a first-class authoring experience for draft
screensets, enabling the rapid prototyping workflow the screenset model was
designed to support.

There is also a recognized need for a **pre-draft personal sandbox** — a
space where an individual can explore an idea privately, share a preview
informally for early feedback, and only promote it to an official draft
screenset once there is enough confidence in the concept. This PRD covers
Phase 1 of the Builder: the core chat and preview experience. The mechanism
by which a personal sandbox is stored, shared, and promoted into the
official screenset pipeline (for example, via personal forks) is an open
design question deferred to a future phase.

### 1.3 Goals

- Enable a non-technical user to go from a plain-language description to a
  running interactive UI preview in under two minutes.
- Reduce the time a PM spends waiting for a developer to scaffold a draft
  screenset from hours to minutes.
- Produce draft screensets whose structure is fully compatible with the FrontX
  screenset model, requiring no manual cleanup before promotion to mockup.

### 1.4 Glossary

| Term | Definition |
|------|------------|
| Builder | The FrontX Studio embedded AI idea generator described in this PRD |
| Chat Panel | The left-side sliding panel containing the conversation thread |
| Preview Panel | The right-side sliding panel displaying the live generated UI |
| Prompt | A plain-language description of the desired UI submitted by the user |
| Session | A single project conversation — one prompt thread and its generated output |
| AI Backend | The external language model API that processes prompts and generates code |
| Personal Sandbox | A private, pre-draft exploration space where a user can generate and refine a UI idea before it enters the official screenset pipeline |

---

## 1.5 Working Prototype

The following screenshot is taken from a working prototype of the Builder
built to validate this concept. The trigger control — an "Idea Generator"
button anchored to the far left of the Studio shell — opens the Builder.
Once activated, the Chat Panel (left) and Preview Panel (right) slide into
place, with a generated UI visible in the preview after a plain-language
prompt was submitted.

![FrontX Builder prototype — trigger button, chat and preview panels open](https://github.com/user-attachments/assets/9b649dba-aaa5-4de6-ae6b-0ba7942e1e89)

This prototype was used to demonstrate the concept internally. It includes
additional capabilities (Bitbucket repository creation, pull request
automation via personal access token) that are intentionally out of scope
for this Phase 1 proposal and described further in Section 12.

---

## 2. Actors

### 2.1 Human Actors

#### Product Manager

**ID**: `cpt-frontx-builder-actor-pm`

**Role**: Creates new draft UI ideas using plain-language prompts. Iterates on
generated output through follow-up messages. Shares preview links for
informal feedback before committing anything to the official project.

**Needs**: A zero-configuration way to go from an idea to a visible, interactive
UI prototype without writing code or using the CLI.

#### Designer

**ID**: `cpt-frontx-builder-actor-designer`

**Role**: Reviews AI-generated drafts, submits refinement prompts to adjust
visual layout, color, and interaction patterns.

**Needs**: A fast feedback loop for visual iteration without depending on a
developer to implement changes.

### 2.2 System Actors

#### FrontX Studio

**ID**: `cpt-frontx-builder-actor-studio`

**Role**: Host environment that renders the Builder trigger, manages panel
visibility and layout, and forwards theme and language context to the
Preview Panel.

#### AI Backend

**ID**: `cpt-frontx-builder-actor-ai-backend`

**Role**: Receives structured prompts containing the user's intent and existing
project context, generates TypeScript/React component code conforming to
FrontX screenset conventions, and returns the result to the Builder backend.

---

## 3. Operational Concept & Environment

### 3.1 Module-Specific Environment Constraints

- Builder runs exclusively within FrontX Studio — it is not a standalone
  application.
- The AI Backend is accessed over HTTPS via a REST API. API credentials are
  stored server-side only; they are never transmitted to or stored in the
  browser.
- Generated code MUST be persisted to the local filesystem of the machine
  running Studio, within the active project directory.
- The Preview Panel MUST render generated output in an isolated execution
  context to prevent generated code from affecting the Studio host. Theme
  and language tokens MUST be forwarded from the Studio host to the preview
  context without requiring user intervention.

---

## 4. Scope

### 4.1 In Scope

- A trigger control in the FrontX Studio shell that activates and deactivates
  the Builder
- A Chat Panel (left side) that slides in to display the conversation thread
- A Preview Panel (right side) that slides in to display the live generated UI
- Sending a plain-language prompt to the AI Backend and receiving generated
  code in response
- Rendering the AI-generated code in the Preview Panel as a live interactive
  preview
- Iterative refinement through follow-up messages in the same session
- Persisting the conversation thread per project across sessions
- Forwarding the active Studio theme and language selection to the Preview Panel

### 4.2 Out of Scope

- Version control integration (commits, pushes, pull requests, company VCS
  hosting) — intentionally deferred to a future phase
- Authentication token management
- Deployment or publishing of generated output
- Screenset stage management (promotion, demotion)
- Multi-user collaboration or shared sessions
- Mobile or desktop (Electron) rendering of the Builder panels

---

## 5. Functional Requirements

### 5.1 Builder Activation

#### Trigger Control

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-trigger`

The Studio shell MUST render a persistent trigger control that, when
activated, opens the Builder in its last-used state (chat panel visible,
preview panel visible, or both).

**Rationale**: The builder must be instantly accessible from anywhere in
Studio without navigating away from the current context.

**Actors**: `cpt-frontx-builder-actor-studio`, `cpt-frontx-builder-actor-pm`

#### Panel Visibility Toggle

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-panel-toggle`

The system MUST allow independent toggling of the Chat Panel and Preview
Panel. Activating the trigger when the Builder is already open MUST close
all Builder panels.

**Rationale**: Users need control over screen real estate — a PM reviewing
a preview may want to hide the chat; a user composing a prompt may want to
temporarily hide the preview.

**Actors**: `cpt-frontx-builder-actor-pm`, `cpt-frontx-builder-actor-designer`

### 5.2 Chat Panel

#### Slide-In Animation

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-chat-animation`

The Chat Panel MUST animate in from the left edge of the Studio viewport
and animate out to the left on close. The animation MUST NOT cause layout
reflow in other Studio panels during transition.

**Rationale**: A smooth, directional animation communicates panel origin and
prevents disorienting layout jumps.

**Actors**: `cpt-frontx-builder-actor-studio`

#### Conversation Thread Display

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-chat-thread`

The Chat Panel MUST display the full conversation thread for the active
session, with user messages and AI responses visually distinguished.
AI responses containing markdown MUST be rendered as formatted content.

**Rationale**: The conversation is the primary interface for iterating on
a generated UI. Users need to see the history to understand what has been
tried.

**Actors**: `cpt-frontx-builder-actor-pm`, `cpt-frontx-builder-actor-designer`

#### Prompt Input

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-prompt-input`

The Chat Panel MUST provide a text input for composing prompts. Submitting
a prompt MUST be possible via keyboard (Enter or equivalent) and via an
explicit send control. The input MUST be disabled while the AI Backend is
processing a response.

**Rationale**: Keyboard submission is essential for a fast iteration loop.
Disabling input during processing prevents duplicate submissions.

**Actors**: `cpt-frontx-builder-actor-pm`, `cpt-frontx-builder-actor-designer`

#### AI Clarifying Questions

- [ ] `p2` - **ID**: `cpt-frontx-builder-fr-clarifying-questions`

When the AI Backend determines a prompt is ambiguous, it MUST respond with
a clarifying question and MUST NOT generate code until the ambiguity is
resolved. The system MUST present predefined answer choices when the AI
provides them, allowing one-tap selection.

**Rationale**: Ambiguous prompts produce low-quality output that requires
multiple correction rounds. A single clarifying exchange produces a better
first result than iterating on a bad one.

**Actors**: `cpt-frontx-builder-actor-pm`, `cpt-frontx-builder-actor-ai-backend`

#### Session Persistence

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-session-persistence`

The system MUST persist the full conversation thread per project. Closing
and reopening the Builder MUST restore the previous conversation state.

**Rationale**: Prototyping sessions span multiple sittings. Losing
conversation history forces users to reconstruct context manually.

**Actors**: `cpt-frontx-builder-actor-pm`

### 5.3 Preview Panel

#### Slide-In Animation

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-preview-animation`

The Preview Panel MUST animate in from the right edge of the Studio viewport
and animate out to the right on close.

**Rationale**: Symmetric directional animations (chat from left, preview
from right) create a coherent spatial model for the two-panel layout.

**Actors**: `cpt-frontx-builder-actor-studio`

#### Live Preview Rendering

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-preview-render`

The Preview Panel MUST render the generated UI in an isolated iframe. The
preview MUST update automatically after the AI Backend returns a successful
response, without requiring a manual refresh.

**Rationale**: Automatic preview updates close the feedback loop and let
users evaluate generated output immediately.

**Actors**: `cpt-frontx-builder-actor-pm`, `cpt-frontx-builder-actor-designer`

#### Theme and Language Forwarding

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-theme-forwarding`

The Preview Panel MUST receive the active Studio theme (light/dark and
custom palette tokens) and the active language selection, and MUST apply
them to the rendered preview.

**Rationale**: A preview that does not match the active Studio theme gives
a misleading impression of how the generated UI will actually look.

**Actors**: `cpt-frontx-builder-actor-studio`

#### Preview Readiness State

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-preview-readiness`

The Preview Panel MUST display a loading state while the dev server for the
generated project is initializing. Once the dev server is ready, the preview
MUST load automatically. If the dev server disconnects, the Preview Panel
MUST display a reconnecting state and reload when connectivity is restored.

**Rationale**: Dev server startup is not instant. A clear loading state
prevents users from assuming the preview is broken.

**Actors**: `cpt-frontx-builder-actor-studio`

### 5.4 AI Code Generation

#### Prompt Processing

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-prompt-processing`

The system MUST send the user's prompt to the AI Backend along with
sufficient context about the active project's existing source files and
FrontX screenset conventions to produce output that integrates correctly
with the project.

**Rationale**: Without project context, the AI Backend produces generic
output that conflicts with the project's existing structure and conventions.

**Actors**: `cpt-frontx-builder-actor-ai-backend`

#### Generated Code Writing

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-code-writing`

The system MUST write AI-generated code to the correct locations in the
active project's screenset directory on the local filesystem. Generated
files MUST conform to FrontX screenset file structure conventions.

**Rationale**: The generated output must be immediately usable within the
FrontX project without manual file placement.

**Actors**: `cpt-frontx-builder-actor-ai-backend`, `cpt-frontx-builder-actor-studio`

#### Generation Error Handling

- [ ] `p1` - **ID**: `cpt-frontx-builder-fr-error-handling`

When AI-generated code fails validation (parse errors, type errors), the
system MUST automatically attempt to correct the errors before presenting
output to the user. The system MUST notify the user if correction fails and
MUST preserve the last valid project state.

**Rationale**: Surfacing raw compile errors to non-technical users breaks
the prototyping flow and erodes confidence in the tool.

**Actors**: `cpt-frontx-builder-actor-pm`, `cpt-frontx-builder-actor-ai-backend`

---

## 6. Non-Functional Requirements

### 6.1 NFR Inclusions

#### Response Latency

- [ ] `p1` - **ID**: `cpt-frontx-builder-nfr-latency`

The system MUST display a visible processing indicator within 300ms of
prompt submission. The AI Backend MUST return a code response within 30
seconds for prompts that do not require clarification.

**Threshold**: Processing indicator < 300ms; full response < 30s.

**Rationale**: Visible feedback under 300ms prevents users from
double-submitting. A 30-second ceiling keeps the iteration loop from feeling broken.

#### API Credential Security

- [ ] `p1` - **ID**: `cpt-frontx-builder-nfr-credential-security`

AI Backend credentials MUST be stored server-side only and MUST NOT be
transmitted to or accessible from the browser at any point.

**Threshold**: Zero credential exposure in client-side network traffic or
browser storage.

**Rationale**: Client-side credential exposure would allow any page visitor
to make API calls at the credential owner's expense.

### 6.2 NFR Exclusions

- **Accessibility (WCAG 2.1 AA)**: Out of scope for this draft-stage tool.
  Target users are internal stakeholders in a controlled environment.
- **Offline support**: The AI Backend requires network connectivity; offline
  mode is not applicable.

---

## 7. Use Cases

### PM Generates a New UI Idea

- [ ] `p1` - **ID**: `cpt-frontx-builder-usecase-new-idea`

**Actor**: `cpt-frontx-builder-actor-pm`

**Preconditions**:
- FrontX Studio is running with an active project

**Main Flow**:
1. PM clicks the Builder trigger in the Studio shell
2. Chat Panel slides in from the left; Preview Panel slides in from the right
3. PM types a plain-language description of the desired UI
4. System sends prompt and project context to the AI Backend
5. AI Backend returns generated component code
6. System writes generated files to the project's screenset directory
7. Preview Panel automatically updates to show the live generated UI
8. PM reviews the result

**Postconditions**:
- Generated files exist in the project's screenset directory
- Preview Panel displays the generated UI
- Conversation is persisted to the session

**Alternative Flows**:
- **AI asks a clarifying question**: PM selects from presented choices or
  types a response; generation proceeds after clarification
- **Generation fails validation**: System auto-corrects; if correction fails,
  user sees an error message and project state is preserved

### PM Iterates on Generated Output

- [ ] `p1` - **ID**: `cpt-frontx-builder-usecase-iterate`

**Actor**: `cpt-frontx-builder-actor-pm`

**Preconditions**:
- A prior generation exists in the active session

**Main Flow**:
1. PM reviews the Preview Panel and identifies a desired change
2. PM types a follow-up prompt describing the change
3. System sends updated prompt with full conversation history and project
   context to the AI Backend
4. AI Backend returns updated code
5. Preview Panel updates to reflect the change

**Postconditions**:
- Updated files are written to the project's screenset directory
- Preview reflects the latest generated state

---

## 8. Acceptance Criteria

- [ ] Clicking the Builder trigger opens both Chat Panel and Preview Panel with
  slide-in animations from their respective sides
- [ ] Submitting a prompt results in visible AI-generated UI in the Preview Panel
  within 30 seconds
- [ ] The Preview Panel reflects the active Studio theme without manual
  intervention
- [ ] Closing and reopening the Builder restores the previous conversation thread
- [ ] AI Backend credentials are not present in any browser network request
- [ ] A failed code generation does not corrupt the last valid project state
- [ ] Follow-up prompts refine the existing output without starting over

---

## 9. Dependencies

| Dependency | Description | Criticality |
|---|---|---|
| FrontX Studio Shell | Hosts the Builder trigger and panel containers | p1 |
| AI Backend API | External LLM API for code generation (Anthropic Claude) | p1 |
| FrontX Screenset CLI | Provides screenset directory structure conventions | p1 |
| Local Dev Server | Serves the generated project for Preview Panel rendering | p1 |

---

## 10. Assumptions

- FrontX Studio is already running and a project is active when the Builder
  is used
- The AI Backend API is accessible over the network from the machine running
  Studio
- The local filesystem is writable at the active project's screenset directory
- The local dev server for the active project is managed separately from the
  Builder (the Builder detects readiness via polling, it does not start it)
- In Phase 1, sharing a generated preview requires the reviewer to be on the
  same machine or connected via screen share — no remote or hosted preview
  URL is provided

---

## 11. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| AI Backend generates code that does not conform to FrontX conventions | Preview fails to render; user sees error | Include FrontX screenset rules and existing source context in every prompt; validate before writing |
| AI Backend latency exceeds 30 seconds | User abandons session, loses confidence | Show streaming progress indicator; set hard timeout with user-facing message |
| Dev server startup time creates perceived Preview Panel failure | User thinks generation failed | Explicit loading/reconnecting states in Preview Panel; distinguish "loading" from "error" |
| Generated code accumulates over iterations, exceeding context window | AI Backend loses early context, producing inconsistent output | Re-send full project source files with every request rather than relying on conversation history alone |
| Local-only preview limits the informal feedback loop | A PM cannot easily share a generated idea with a remote stakeholder | A shareable or hosted preview mechanism should be explored in a future phase |

---

## 12. Future Considerations

This section captures known directions that are intentionally out of scope
for Phase 1 but should inform future phases.

### VCS-Backed Personal Sandbox

A working prototype of the Builder was developed that included VCS
integration — each generated project was backed by its own repository,
giving the user a persistent, shareable artifact they could send to a
colleague for feedback.

This approach was deliberately excluded from Phase 1 to keep the proposal
focused on the core chat and preview experience, and to avoid coupling the
concept to a specific VCS provider or authentication model from the start.

### Personal Forks as Sandboxes

One suggestion from the FrontX team is that **personal forks of the main
FrontX project repo** could serve as the sandbox mechanism — each user works
in their own fork, the Builder generates screensets into that fork, and
sharing is handled through the standard GitHub/Bitbucket fork-and-PR model.
This would align with how open-source contributors already work and avoids
the need for a separate hosted preview service. This idea has not been fully
designed and is presented here as an open question for future discussion.

### Promotion to Official Draft

A future phase should define the explicit path by which a personal sandbox
screenset is promoted into the shared FrontX project as an official
`draft`-stage screenset — including what approval or review steps, if any,
are required before it appears in Studio's screenset selector for the
broader team.
