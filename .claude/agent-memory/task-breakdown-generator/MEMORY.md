# Task Breakdown Generator - Memory

## Project Overview
- Receipt Scanner App: upload receipt image -> OCR -> AI parse -> verify/edit -> Excel export
- Primary user: developer's dad. Mobile-first.
- Tech: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- No database (MVP). Hosted on Vercel.

## Architecture
- OCR runs in browser (Tesseract.js) to avoid uploading large images
- AI parsing runs on server (keeps OpenAI key secure)
- Excel export runs in browser (SheetJS)
- File structure: `app/`, `components/`, `lib/`, `types/`

## Key Types (from `types/receipt.ts`)
- `ReceiptItem`: { id: string, name: string, price: number }
- `Receipt`: { store: string|null, date: string|null, items: ReceiptItem[], tax: number, total: number }

## Task File Conventions
- See [task-conventions.md](task-conventions.md) for detailed format notes
- Target audience: developer learning React/Next.js with Node.js backend experience
- Steps are atomic, ordered, testable, scoped
- Each step: "What to do", optional "Concepts to understand" / "What is X?", "Test checkpoint"
- "A Note on Scope" section used when deviating from DESIGN.md

## Completed Tasks
- TASK-1: Project setup (Next.js 15, TS, Tailwind, shadcn/ui)
- TASK-2: TypeScript types (Receipt, ReceiptItem interfaces)
- TASK-3: Upload image and preview (receipt-uploader, receipt-preview, page.tsx composition)
- TASK-4: OCR text extraction (Tesseract.js, Jest setup, progress bar, raw text display)
- TASK-5: AI parsing with OpenAI (API route, Zod schemas, rate limiting, React Context)

## Key Decisions Made in Prior Tasks
- Dependencies installed per-task, not all upfront (deviated from DESIGN.md)
- Image compression deferred from Task #3 -> Task #4 -> now deferred further (Task #8 polish)
- "Process Receipt" button deferred from Task #3, now included in Task #4
- Drag & drop / camera capture deferred to Task #8
- Jest (not Vitest) chosen for testing with `@next/jest`
- OCR returns `{ text: string; confidence: number }` via OcrResult type in `lib/ocr.ts`
- Tesseract worker created fresh per call (no reuse for MVP)
- shadcn Progress component added for OCR progress bar

## Decisions from Task #5
- Zod + OpenAI structured outputs (zodResponseFormat) for guaranteed valid JSON
- In-memory rate limiter as learning exercise (won't persist on Vercel serverless)
- React Context (`lib/receipt-context.tsx`) chosen for cross-page state management
- Auto-parse after OCR (no manual trigger for AI parsing step)
- Raw OCR text display replaced by structured result summary
- IDs generated server-side in `lib/openai.ts` via `crypto.randomUUID()`
- Zod schemas live in `lib/schemas/receipt.ts`, separate from TS interfaces in `types/`
- Security: input sanitization, env var checks, error sanitization implemented
- API route tests in `app/api/parse-receipt/__tests__/route.test.ts`

## Test Infrastructure (from Task #4)
- Jest + @next/jest + @types/jest + ts-node
- jest.config.ts at project root
- Test files in `__tests__/` dirs next to source (e.g., `lib/__tests__/ocr.test.ts`)
- testEnvironment: "jsdom", moduleNameMapper for `@/` alias

## State Management (from Task #5)
- React Context in `lib/receipt-context.tsx` with ReceiptProvider + useReceipt hook
- Provider wraps app in `app/layout.tsx`
- Stores: receipt (Receipt | null), receiptImage (File | null)
- Task #6 verify page reads from this context

## Task Breakdown Patterns Learned
- TDD tasks: test step comes before implementation steps, tests should fail on assertions (not on missing imports)
- TDD with multiple dependencies: when tests import from multiple modules that don't exist yet, include a step to create minimal implementations of those modules BEFORE the test-writing step. Tests that fail at the import level give no feedback — that's not effective TDD.
- Mocking pattern for OpenAI: mock `openai` module, return controlled responses from `chat.completions.parse` (SDK v6+, not `beta.chat.completions.parse`)
- Security step: no-code review checkpoint with verification table
- Large tasks (11 steps): install -> config -> schema -> tests -> implementation modules -> orchestration route -> security review -> state management -> frontend wiring -> final verification
