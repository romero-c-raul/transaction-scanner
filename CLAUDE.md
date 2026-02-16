# Project Conventions

## Readability First

All code is reviewed by a developer who is learning frontend concepts and libraries (React, Next.js, Tesseract.js, shadcn/ui, etc.). Optimize every line for readability:

- Extract inline callbacks and complex expressions into named variables
- Keep functions short and flat — avoid nesting beyond 2 levels
- Use descriptive variable names, no abbreviations
- Add brief comments explaining **why** when using non-obvious framework patterns or library APIs (e.g., why `try/finally` without `catch`, why a specific Tesseract option)
- No clever one-liners — prefer clear over concise

## Learning Workflow

When implementing a step from a task file (e.g., TASK-5.md step 5.9), follow this process:

1. **Assess complexity** — Before implementing, evaluate if the step introduces multiple new concepts or touches several files. If it does, propose breaking it into sub-steps.
2. **Propose a breakdown** — If sub-steps are needed, list them with the concepts each introduces. Ask the user if the breakdown looks right or if they want to adjust it.
3. **Implement one sub-step at a time** — Write the code for one sub-step, then pause.
4. **Explain what was written** — After each sub-step, briefly explain the key concepts and what the code does.
5. **Wait for questions** — Let the user ask questions or confirm understanding before moving to the next sub-step.
6. **Skip breakdown for simple steps** — If a step is a single file with one concept (e.g., installing a dependency, creating a config), implement it in one go without sub-steps.
