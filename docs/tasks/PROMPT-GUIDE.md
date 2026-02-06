# Prompt Guide: Generating TASK-N.md Documents

This guide describes a two-phase prompting workflow for creating task breakdown documents. Each phase is a separate LLM conversation. The output of Phase 1 feeds into Phase 2.

---

## Phase 1: Discovery

### Purpose

Surface ambiguities, technical decisions, and open questions **before** writing the task breakdown. This prevents you from generating a document full of assumptions that need rework.

### Input

Paste the following into a new LLM conversation:

1. The full contents of `docs/DESIGN.md`
2. The full contents of every existing `docs/tasks/TASK-*.md` file (so the LLM knows what's already been built)

### Prompt

```
I'm building a receipt scanner app. Here is the design document followed by all completed task breakdowns so far.

<DESIGN>
{paste DESIGN.md}
</DESIGN>

<COMPLETED_TASKS>
{paste each TASK-*.md, separated by headers}
</COMPLETED_TASKS>

I want to write a detailed task breakdown for **Task #N: {task title from DESIGN.md}**.

Before writing the breakdown, analyze this task and tell me:

1. **Ambiguities or gaps** — What does the design doc leave unclear or unspecified for this task? What assumptions would you have to make?

2. **Technical decisions** — What choices need to be made before implementation? (e.g., library selection, architecture pattern, API design, state management approach). For each decision, list the options with brief trade-offs.

3. **Dependencies on previous tasks** — What specific files, types, components, or patterns from earlier tasks does this task depend on? Call out anything that must exist before this task can start.

4. **Questions for the developer** — What would you ask me before writing the breakdown? Focus on things where my preference matters (UX behavior, scope boundaries, error handling strategy, etc.).

Do NOT write the task breakdown yet. Only output the analysis above.
```

### What you get back

A structured list of questions and decisions. Review each one and write down your answers. These answers become input to Phase 2.

### Tips

- If the LLM identifies a gap in DESIGN.md that affects multiple future tasks, consider updating DESIGN.md itself rather than patching it in one task.
- Some questions may be "non-decisions" — cases where there's an obvious right answer. Note those quickly and move on.
- If a technical decision is complex, you can ask follow-up questions in the same conversation before moving to Phase 2.

---

## Phase 2: Generation

### Purpose

Produce the actual TASK-N.md document, following the conventions established in TASK-1.md.

### Input

Paste the following into a new LLM conversation (or continue the Phase 1 conversation):

1. The full contents of `docs/DESIGN.md`
2. The full contents of every existing `docs/tasks/TASK-*.md` file
3. Your answers from Phase 1

### Prompt

```
I'm building a receipt scanner app. Here is the design document, all completed task breakdowns, and my answers to the discovery questions for the next task.

<DESIGN>
{paste DESIGN.md}
</DESIGN>

<COMPLETED_TASKS>
{paste each TASK-*.md, separated by headers}
</COMPLETED_TASKS>

<DISCOVERY_ANSWERS>
{paste your answers from Phase 1}
</DISCOVERY_ANSWERS>

Write a complete task breakdown for **Task #N: {task title from DESIGN.md}**.

Follow these conventions (established in TASK-1.md):

**Structure:**
- Start with a `## Goal` section: 1-2 sentences on what this task accomplishes and what the developer will have when done
- Include a `## Prerequisites` section: what must be installed, configured, or completed before starting
- Number steps as `## Step N.1`, `## Step N.2`, etc. (where N is the task number)
- End with a `## Wrap-Up` section

**Each step must include:**
- `### What to do` — Concrete instructions: commands to run, files to create/modify, code to write. Be specific enough that the developer knows exactly what to do, but don't write all the code — leave implementation to the LLM assisting them.
- `### What is [concept]?` (when introducing something new) — A conceptual explanation connecting the new concept to things the developer already knows. Write for someone who knows Node.js/Express but is new to React/Next.js.
- `### Test` — A verification step: a command to run, a behavior to observe, or a question to answer that confirms the step was completed correctly.

**Tone and style:**
- Write for a developer learning React/Next.js who has backend Node.js experience
- Explain *why*, not just *what* — connect new concepts to familiar ones
- Use tables for structured information (prompts, file descriptions)
- Include code blocks with language tags for all commands and code
- Keep the "What to do" sections actionable — avoid long prose when a command or file path suffices

**Wrap-Up section must include:**
- "What you accomplished" — bullet list summarizing deliverables
- "What each piece does" — table mapping components to their roles (only if new concepts were introduced)
- "What's next" — 2-3 sentences previewing the next task
- "Optional further reading" — relevant documentation links
```

### What you get back

A complete TASK-N.md document ready to save to `docs/tasks/`.

### Tips

- Read through the generated document before saving. Check that test steps are actually verifiable (not just "it should work").
- If a step is too large (more than ~15 minutes of work), ask the LLM to split it.
- Make sure the "Prerequisites" section matches what prior tasks actually produced — not what DESIGN.md *planned* for them to produce.
- If continuing from the Phase 1 conversation, you can skip re-pasting DESIGN.md and TASK files — the LLM already has them in context.

---

## Quick Reference

| Phase | Input | Output |
|-------|-------|--------|
| Discovery | DESIGN.md + existing TASK files + task number | Questions and decisions to resolve |
| Generation | DESIGN.md + existing TASK files + discovery answers | Complete TASK-N.md document |

## File Naming

Save generated documents as `docs/tasks/TASK-N.md` where N matches the task number from DESIGN.md (e.g., `TASK-2.md`, `TASK-3.md`).
