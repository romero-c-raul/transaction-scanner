# Receipt Scanner App - Design & Exploration Plan

## Overview
A web application that allows users to scan receipts, verify/correct the extracted data, and export to Excel. Primary user: your dad. Hosted publicly for learning purposes.

---

## Implementation Tasks (Hybrid Approach)

Tasks are organized as: Foundation first, then vertical feature slices (each testable), then polish.

### Foundation

**Task #1: Initialize Next.js 15 + TypeScript + Tailwind + shadcn/ui**
- Initialize Next.js 15 project with TypeScript and Tailwind CSS
- Install dependencies: tesseract.js, openai, xlsx, browser-image-compression
- Set up shadcn/ui with components: button, input, card, table
- Create .env.local template for OPENAI_API_KEY
- **Test:** Project runs with `npm run dev`

**Task #2: Create TypeScript types** [blocked by #1]
- Create `types/receipt.ts` with interfaces for Receipt, ReceiptItem
- **Test:** Types compile without errors

### Feature Slices

**Task #3: Upload image and preview** [blocked by #2]
- Build `app/page.tsx` (upload screen)
- Build `components/receipt-uploader.tsx` (drag & drop, file picker, camera capture)
- Build `components/receipt-preview.tsx` (display uploaded image)
- Decide state management approach for passing receipt data to verify page (React Context or Zustand)
- **Test:** Upload/capture image, see preview displayed

**Task #4: OCR text extraction** [blocked by #3]
- Create `lib/ocr.ts` with Tesseract.js wrapper
- Integrate OCR into upload flow
- Add progress indicator during OCR
- **Test:** Upload receipt image, see extracted text in console/UI

**Task #5: AI parsing with OpenAI** [blocked by #4]
- Create `app/api/parse-receipt/route.ts` endpoint
- Receive OCR text, call OpenAI GPT-4o-mini, return structured JSON
- Wire up frontend to call API after OCR completes
- Add basic rate limiting to the API route to prevent abuse
- Review basic security principles for these kinds of apps
- **Test:** Upload receipt, see parsed JSON with store, date, items, prices

**Task #6: Verification and editing UI** [blocked by #5]
- Build `app/verify/page.tsx` with receipt image + editable fields
- Build `components/item-list.tsx` (editable items, add/remove)
- Auto-calculate total from items + tax
- Wire up state management from upload page
- **Test:** Edit item name/price, see total update correctly

**Task #7: Excel export** [blocked by #6]
- Create `lib/excel.ts` with SheetJS export function
- Build `components/export-button.tsx`
- Generate .xlsx file and trigger browser download
- **Test:** Click export, file opens in Excel/Google Sheets with correct data

### Polish & Deploy

**Task #8: Loading states, error handling, mobile testing** [blocked by #7]
- Add loading states during OCR and AI parsing
- Add error handling with user-friendly messages
- Test full flow on mobile browser (iOS Safari/Chrome)
- Fix responsive UI issues
- **Test:** Full flow works smoothly on phone

**Task #9: Deploy to Vercel** [blocked by #8]
- Push to GitHub
- Connect to Vercel
- Add OPENAI_API_KEY environment variable
- Deploy and verify live URL
- **Test:** App accessible and working via Vercel URL

---

## 1. User Flow (Detailed)

### Screen 1: Upload Receipt
```
┌─────────────────────────────────────┐
│         📷 Scan Receipt             │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │   Drop image here or        │   │
│  │   [Take Photo] [Upload]     │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Supported: JPG, PNG                 │
└─────────────────────────────────────┘
```
- User takes photo with phone camera OR uploads existing image
- Image preview shown after selection
- "Process Receipt" button to continue

### Screen 2: Processing (Loading State)
```
┌─────────────────────────────────────┐
│         Processing Receipt...       │
│                                     │
│         [████████░░] 80%            │
│                                     │
│  ✓ Image uploaded                   │
│  ✓ Text extracted                   │
│  ⟳ Parsing items...                 │
└─────────────────────────────────────┘
```
- Show progress as OCR and AI parsing happen
- ~3-10 seconds depending on image size

### Screen 3: Verification & Editing
```
┌─────────────────────────────────────┐
│  Verify Receipt        [Receipt img]│
│                                     │
│  Store: [Walmart___________] ✏️     │
│  Date:  [2024-01-15________] ✏️     │
│                                     │
│  Items:                             │
│  ┌─────────────────────────────┐   │
│  │ Milk 2% Gallon    │ $3.99  │ 🗑 │
│  │ Bread Wheat       │ $2.49  │ 🗑 │
│  │ [+ Add Item]                │   │
│  └─────────────────────────────┘   │
│                                     │
│  Tax:    $0.52                      │
│  Total:  $6.48  (auto-calculated)   │
│                                     │
│  [Cancel]          [Export to Excel]│
└─────────────────────────────────────┘
```
- Side-by-side: original receipt image + extracted data
- Editable fields for store name, date, each item
- Add/remove items
- Auto-calculate total from items + tax
- User corrects any OCR mistakes

### Screen 4: Export Complete
```
┌─────────────────────────────────────┐
│         ✓ Export Complete!          │
│                                     │
│  Your receipt has been saved to:    │
│  📄 receipt_walmart_2024-01-15.xlsx │
│                                     │
│  [Download Again]  [Scan Another]   │
└─────────────────────────────────────┘
```
- Excel file auto-downloads
- Option to scan another receipt

---

## 2. Requirements

### Functional Requirements
- [ ] Upload images via file picker or camera capture
- [ ] Support common image formats (JPG, PNG)
- [ ] Extract text from receipt images using OCR
- [ ] Parse extracted text into structured data (store, date, items, prices, tax, total)
- [ ] Display verification screen with original image alongside extracted data
- [ ] Allow editing all extracted fields (store, date, items, prices)
- [ ] Allow adding/removing line items
- [ ] Auto-calculate total from items + tax
- [ ] Export verified data to Excel (.xlsx) format
- [ ] Mobile-friendly responsive design (dad will use phone)

### Non-Functional Requirements
- [ ] Works on mobile browsers (iOS Safari, Chrome)
- [ ] Processes receipts in under 15 seconds
- [ ] Simple, clean UI that's easy for non-technical users
- [ ] Hosted publicly with HTTPS

---

## 3. Tech Stack

### Frontend + Backend: Next.js 14 (App Router)
**Why:**
- Full-stack React framework - one codebase for frontend + API
- Built by Vercel, deploys to Vercel with zero config
- Server components for API routes (keeps OpenAI key secure)
- Excellent developer experience, hot reload, TypeScript support

### Language: TypeScript
**Why:**
- Type safety catches bugs before runtime
- Better IDE autocomplete and documentation
- Industry standard for modern web dev

### Styling: Tailwind CSS + shadcn/ui
**Why:**
- Tailwind: Utility-first CSS, fast to write, no CSS files to manage
- shadcn/ui: Beautiful, accessible components (buttons, inputs, dialogs)
- Both are free and well-documented

### Database: None (for MVP)
**Why:**
- Receipts are processed and exported immediately
- No user accounts or history needed initially
- Can add Supabase/PostgreSQL later if needed

---

## 4. Libraries

### OCR: Tesseract.js
```bash
npm install tesseract.js
```
- **Purpose:** Extract raw text from receipt images
- **Runs:** In browser (Web Worker) or server-side
- **Learning:** How OCR works, image preprocessing, async processing
- **Docs:** https://github.com/naptha/tesseract.js

### AI Parsing: OpenAI API
```bash
npm install openai
```
- **Purpose:** Convert raw OCR text → structured JSON (items, prices)
- **Model:** GPT-4o-mini (fast, cheap ~$0.01/receipt)
- **Learning:** Prompt engineering, structured outputs, API integration
- **Docs:** https://platform.openai.com/docs

### Excel Export: SheetJS (xlsx)
```bash
npm install xlsx
```
- **Purpose:** Generate .xlsx files from JSON data
- **Runs:** In browser, triggers download
- **Learning:** File generation, binary data handling
- **Docs:** https://docs.sheetjs.com/

### UI Components: shadcn/ui
```bash
npx shadcn@latest init
npx shadcn@latest add button input card table
```
- **Purpose:** Pre-built accessible components
- **Learning:** Component composition, accessibility
- **Docs:** https://ui.shadcn.com/

### Image Handling: browser-image-compression
```bash
npm install browser-image-compression
```
- **Purpose:** Compress images before OCR (faster processing)
- **Learning:** Client-side image manipulation

---

## 5. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        BROWSER                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌─────────────┐   ┌─────────────┐  │
│  │   Upload    │───▶│  Tesseract  │──▶│   Verify    │  │
│  │   Page      │    │  (OCR)      │   │   Page      │  │
│  └─────────────┘    └─────────────┘   └──────┬──────┘  │
│         │                                     │         │
│         │                                     ▼         │
│         │                            ┌─────────────┐   │
│         │                            │   SheetJS   │   │
│         │                            │  (Excel)    │   │
│         │                            └─────────────┘   │
└─────────┼───────────────────────────────────────────────┘
          │
          │ API Call (with raw OCR text)
          ▼
┌─────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  /api/parse-receipt                              │   │
│  │                                                  │   │
│  │  1. Receive raw OCR text                        │   │
│  │  2. Call OpenAI API with structured prompt      │   │
│  │  3. Return parsed JSON (items, prices, etc.)    │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
└───────────────────────────┼─────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   OpenAI API  │
                    │   (GPT-4o-mini)│
                    └───────────────┘
```

### Data Flow:
1. User uploads image → stored in browser memory
2. Tesseract.js (browser) extracts raw text
3. Raw text sent to `/api/parse-receipt` endpoint
4. Server calls OpenAI to structure the data
5. Structured JSON returned to browser
6. User verifies/edits data
7. SheetJS generates Excel file
8. Browser triggers download

### Why This Architecture:
- **OCR in browser:** No need to upload large images to server
- **AI on server:** Keeps API key secure, not exposed to browser
- **Excel in browser:** No server storage needed, instant download

---

## 6. File Structure

```
transaction-scanner/
├── app/
│   ├── layout.tsx          # Root layout with fonts, metadata
│   ├── page.tsx            # Home/Upload page
│   ├── verify/
│   │   └── page.tsx        # Verification/editing page
│   └── api/
│       └── parse-receipt/
│           └── route.ts    # OpenAI parsing endpoint
├── components/
│   ├── ui/                 # shadcn components
│   ├── receipt-uploader.tsx
│   ├── receipt-preview.tsx
│   ├── item-list.tsx
│   └── export-button.tsx
├── lib/
│   ├── ocr.ts              # Tesseract.js wrapper
│   ├── openai.ts           # OpenAI client setup
│   └── excel.ts            # SheetJS export functions
├── types/
│   └── receipt.ts          # TypeScript interfaces
├── .env.local              # API keys (not committed)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 7. Hosting & Deployment

### Platform: Vercel (Free Tier)
**Why Vercel:**
- Made by Next.js team - zero config deployment
- Free tier: 100GB bandwidth, perfect for personal use
- Automatic HTTPS, custom domains
- Git integration - push to deploy

### Deployment Steps:
1. Push code to GitHub repository
2. Connect GitHub repo to Vercel
3. Add environment variables (OPENAI_API_KEY)
4. Deploy - get URL like `transaction-scanner.vercel.app`
5. (Optional) Add custom domain

### Environment Variables:
```
OPENAI_API_KEY=sk-...
```

### Cost Estimate:
- **Vercel hosting:** Free
- **Domain (optional):** ~$12/year
- **OpenAI API:** ~$0.01-0.05 per receipt (GPT-4o-mini)
  - 100 receipts/month ≈ $1-5/month

---

## 8. OpenAI Prompt Design

```typescript
const systemPrompt = `You are a receipt parser. Extract structured data from receipt text.
Return ONLY valid JSON with this exact structure:
{
  "store": "store name",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "item name", "price": 0.00}
  ],
  "tax": 0.00,
  "total": 0.00
}
If a field cannot be determined, use null.`;

const userPrompt = `Parse this receipt text:\n\n${ocrText}`;
```

---

## 9. Learning Milestones

As you build this, you'll learn:

| Phase | Skills Learned |
|-------|---------------|
| Project Setup | Next.js App Router, TypeScript, Tailwind CSS |
| Upload Feature | File handling, image compression, React state |
| OCR Integration | Tesseract.js, Web Workers, async processing |
| AI Parsing | OpenAI API, prompt engineering, error handling |
| Verification UI | Form handling, state management, UX design |
| Excel Export | SheetJS, file generation, browser downloads |
| Deployment | Vercel, environment variables, domains, CI/CD |

---

## 10. Verification & Testing

After implementation, verify with these tests:

1. **Upload Test:** Take photo of receipt with phone, upload successfully
2. **OCR Test:** Text is extracted (check console logs)
3. **AI Parse Test:** Items, prices appear in verification screen
4. **Edit Test:** Change an item name, price updates total
5. **Add/Remove Test:** Add new item, remove existing item
6. **Export Test:** Download Excel, open in Excel/Google Sheets, verify data
7. **Mobile Test:** Full flow works on phone browser
8. **Deploy Test:** App accessible via Vercel URL

---

## 11. Future Enhancements (Not in MVP)

### PDF Support + Server-Side OCR Upgrade (High Priority)
**Why deferred:** Adds complexity, but will be needed since receipts are often scanned as PDFs.

**Two options when implementing PDF support:**

**Option A: Keep Browser OCR (Simpler)**
```bash
npm install pdfjs-dist
```
- Use `pdfjs-dist` (Mozilla's PDF.js) to render PDF pages to canvas
- Convert each page to an image, then run Tesseract OCR
- Concatenate text from all pages before sending to OpenAI
- Code location: Add to `lib/ocr.ts` with a `extractTextFromPDF()` function

**Option B: Move to Server-Side OCR (More Accurate)**
- Move OCR from browser to Next.js API route
- Use Google Cloud Vision or AWS Textract (handles both images and PDFs)
- Benefits: Better accuracy, consistent performance, cleaner PDF handling
- Trade-off: Small cost (~$1.50/1000 images), images uploaded to server
- Code location: New API route `/api/ocr` that returns extracted text

**When to choose Option B:**
- If Tesseract accuracy is insufficient for your receipts
- If browser OCR is too slow
- If you want batch processing capabilities
- Natural time to evaluate: when adding PDF support

### Multi-Image Support
**Why deferred:** Adds UI complexity (reordering, previewing multiple images).

**Implementation approach when ready:**
- Allow drag-and-drop of multiple images
- Show thumbnail strip with drag-to-reorder
- Process images in order, concatenate OCR text
- Consider max limit (e.g., 5 images per receipt)

### Other Future Enhancements
- User accounts & receipt history
- Multiple receipt batch processing
- Categories for items (groceries, household, etc.)
- Monthly spending reports
- Receipt image storage (cloud)
- Share receipts with family members

---

## Sources

**OCR Research:**
- [OCR Benchmark 2026](https://research.aimultiple.com/ocr-accuracy/)
- [Top OCR Models Compared](https://modal.com/blog/8-top-open-source-ocr-models-compared)

**Tech Stack:**
- [React Tech Stack 2025](https://www.robinwieruch.de/react-tech-stack/)
- [Next.js Tech Stack Guide](https://www.wisp.blog/blog/what-nextjs-tech-stack-to-try-in-2025-a-developers-guide-to-modern-web-development)
- [Tesseract.js + Next.js Tutorial](https://dev.to/moibra/building-an-image-to-text-converter-with-nextjs-and-tesseractjs-45c3)

**Hosting:**
- [Free Next.js Hosting 2025](https://dev.to/joodi/free-nextjs-hosting-providers-in-2025-pros-and-cons-2a0e)
- [Vercel vs Netlify vs Railway](https://syntaxhut.tech/blog/choosing-nextjs-hosting-vercel-vs-netlify-vs-railway-compare)

**Excel Export:**
- [SheetJS Documentation](https://docs.sheetjs.com/docs/solutions/output/)
- [ExcelJS npm](https://www.npmjs.com/package/exceljs)
