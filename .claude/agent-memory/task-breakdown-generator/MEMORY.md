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

## Key Decisions Made in Prior Tasks
- Dependencies installed per-task, not all upfront (deviated from DESIGN.md)
- Image compression deferred from Task #3 to Task #4
- "Process Receipt" button deferred from Task #3 to Task #4
- State management decision deferred to Task #5/6
- Drag & drop / camera capture deferred to Task #8
- `useState` used for local state; no cross-page state yet
