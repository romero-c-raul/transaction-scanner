# Task File Conventions

## Document Structure
1. Title: `# Task #N: {Title}`
2. Goal: 1-2 sentences
3. Prerequisites: what must be done before starting
4. Optional "A Note on Scope" section if deviating from DESIGN.md (uses table format)
5. Steps: `## Step N.X: {Step Title}`
6. Wrap-Up: accomplishments, concepts table, what's next

## Step Structure
- "What to do" or "What to build" — concrete instructions
- Concept explanations connect new ideas to Express/Node.js patterns the dev knows
- "Test checkpoint" — verification that the step works (manual tests, build checks)

## Style Notes
- Uses `---` horizontal rules between steps
- Code blocks have language tags (tsx, typescript, bash)
- Tables for structured info (decisions, file listings, concept summaries)
- Explains "why" not just "what"
- Analogies to Express/Node.js (middleware, event emitters, dotenv, etc.)
- Prior tasks use "Concepts to understand" as a subsection heading within steps

## Scope Deviation Pattern
When a task deviates from DESIGN.md, add a section after Prerequisites:
```
## A Note on Scope
DESIGN.md's Task #N description includes X, Y, Z. **We're simplifying.** Here's what changed and why:
| DESIGN.md item | Decision | Reason |
```

## Final Step Pattern
Last step before Wrap-Up is always "Final Verification" with:
1. `npm run build` check
2. Manual browser test flow
3. File structure review (shows new/modified files)
