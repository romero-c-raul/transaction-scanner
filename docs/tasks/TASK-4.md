# Task #4: OCR Text Extraction

## Goal

Add OCR (optical character recognition) to the upload screen — the user clicks "Process Receipt," the app extracts text from the image using Tesseract.js, and displays the raw text on screen. By the end, you'll have a tested OCR wrapper in `lib/ocr.ts`, a progress bar showing extraction progress, and visible output confirming the OCR worked.

## Prerequisites

- **Task #3 complete** — `app/page.tsx` renders the upload screen with `ReceiptUploader` and `ReceiptPreview`, file selection works, and `npm run build` passes
- **Node.js 18+** installed
- A receipt image (photo of a real receipt, or a sample receipt image from the internet) for manual testing

## A Note on Scope

DESIGN.md's Task #4 description and deferred items from Task #3 create a larger surface area than we'll cover. Here's what's in and what's out:

| Item | Decision | Reason |
|------|----------|--------|
| Image compression (`browser-image-compression`) | **Deferred** | Adds scope and a dependency. OCR will be slower on large images, but acceptable for MVP. Can be added as polish in Task #8. |
| "Process Receipt" button | **Included** | Deferred from Task #3 into this task. The button triggers OCR. |
| Progress bar (shadcn Progress) | **Included** | DESIGN.md calls for a progress indicator. We'll install the shadcn `progress` component. |
| Raw text display | **Included** | Temporary UI to verify OCR output. Will be replaced when Task #5 wires up AI parsing. |
| Tesseract worker reuse | **Skipped** | Worker is created and terminated per OCR call. Simpler for MVP — no lifecycle management. |
| Test setup (Jest) | **Included** | DESIGN.md marks Task #4 for TDD. We'll set up Jest with `@next/jest` and write unit tests for `lib/ocr.ts`. |

---

## Step 4.1: Install Tesseract.js

### What to do

Install the Tesseract.js library:

```bash
npm install tesseract.js
```

This adds the OCR engine to your project. Tesseract.js is a JavaScript port of Google's Tesseract OCR engine — it runs entirely in the browser using Web Workers, so no server-side processing is needed and no images are uploaded to an external service.

### What is Tesseract.js?

If you've worked with child processes in Node.js (`child_process.exec`), Tesseract.js follows a similar pattern — it offloads heavy work to a separate thread so the main thread (your UI) stays responsive. In the browser, the equivalent of a child process is a **Web Worker**: a background thread that can do CPU-intensive work without freezing the page.

Tesseract.js manages these workers for you. When you ask it to recognize text in an image, it:

1. Spins up a Web Worker
2. Loads a ~15MB language model (English by default) from a CDN
3. Processes the image pixel by pixel to identify characters
4. Returns the extracted text and a confidence score

The language model download happens once and is cached by the browser. Subsequent OCR calls are faster because the model is already available.

### Test checkpoint

```bash
npm ls tesseract.js
```

Should show `tesseract.js` in the dependency tree. Also run:

```bash
npm run build
```

Build should still pass — installing a dependency alone shouldn't break anything.

---

## Step 4.2: Set Up Jest with `@next/jest`

### What to do

Install the testing dependencies:

```bash
npm install --save-dev jest @next/jest @types/jest ts-node
```

Create a Jest configuration file at the project root called `jest.config.ts`:

```typescript
import type { Config } from "jest";
import nextJest from "@next/jest";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default createJestConfig(config);
```

Add a test script to `package.json`:

```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch"
}
```

### What is `@next/jest`?

When you run tests in a Next.js project, your test files need to understand the same things your app understands — TypeScript, path aliases (`@/`), JSX, CSS imports. Normally you'd have to configure each of these manually in Jest. `@next/jest` is a helper that reads your `next.config.ts` and `tsconfig.json` and automatically generates the correct Jest configuration. Think of it as a preset that says "set up Jest to work the way Next.js works."

The `testEnvironment: "jsdom"` setting tells Jest to simulate a browser environment. Without this, browser APIs like `File`, `URL.createObjectURL`, and the DOM wouldn't exist in your test environment. It's like using a lightweight headless browser for your tests.

The `moduleNameMapper` entry ensures that `@/lib/ocr` in your test files resolves to the actual `lib/ocr.ts` file, just like it does in your app code.

### Test checkpoint

Create a temporary test file at `lib/__tests__/sanity.test.ts`:

```typescript
describe("Jest setup", () => {
  it("runs a basic test", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run:

```bash
npm test
```

You should see green output: `1 passed`. Delete the sanity test file after confirming Jest works.

---

## Step 4.3: Write Tests for `lib/ocr.ts` (TDD — Tests First)

### What to do

Create the test file at `lib/__tests__/ocr.test.ts` **before** writing the implementation. This is TDD — you define the behavior you want, then write code to make the tests pass.

The tests should cover:

1. **Successful extraction** — given a valid image file, `extractText` returns an object with `text` (string) and `confidence` (number between 0 and 100).
2. **Error handling** — given an invalid file (e.g., a text file), `extractText` throws a descriptive error.
3. **Progress callback** — when an `onProgress` callback is provided, it gets called with a number between 0 and 1.

Since Tesseract.js is a heavy external dependency that downloads language models and uses Web Workers, you need to **mock it** in tests. You don't want your unit tests to actually run OCR — that would be slow, flaky, and require a real image. Instead, you mock the Tesseract module so you can control exactly what it returns.

### What is mocking?

If you've used Sinon.js or test doubles in Node.js, Jest's mocking is the same concept — replacing a real dependency with a fake one you control. When your test says `jest.mock("tesseract.js")`, Jest intercepts every import of `tesseract.js` in the code under test and replaces it with a mock object. You then tell the mock what to return:

```typescript
// This tells Jest: when code imports tesseract.js, give it this fake instead
jest.mock("tesseract.js");
```

The mock should simulate Tesseract's `createWorker` API. The real Tesseract worker has methods like `recognize(image)` that return `{ data: { text, confidence } }`. Your mock should return a fake worker with the same shape but predictable data.

### Test structure

Structure your test file with these test cases:

```typescript
import { extractText } from "@/lib/ocr";

jest.mock("tesseract.js");

describe("extractText", () => {
  it("returns text and confidence from a valid image", async () => {
    // Arrange: set up mock to return known text
    // Act: call extractText with a fake File
    // Assert: result has { text: "mocked text", confidence: 95 }
  });

  it("throws an error for invalid input", async () => {
    // Arrange: set up mock to simulate a Tesseract error
    // Act & Assert: expect extractText to reject with an error
  });

  it("calls onProgress callback during processing", async () => {
    // Arrange: set up mock, create a jest.fn() for onProgress
    // Act: call extractText with the onProgress callback
    // Assert: onProgress was called with a number between 0 and 1
  });
});
```

The `jest.fn()` call creates a **spy** — a fake function that records how it was called. After running the code, you can assert things like "this function was called" (`expect(onProgress).toHaveBeenCalled()`) or "it was called with a value matching this pattern." Spies are useful whenever you want to verify that a callback was invoked correctly without caring about its real implementation.

To create a fake `File` object in tests, use the `File` constructor (available in jsdom):

```typescript
const fakeFile = new File(["fake image data"], "receipt.jpg", {
  type: "image/jpeg",
});
```

This creates a `File` object that looks like a JPEG to your code but contains no real image data. That's fine — Tesseract is mocked, so it never actually reads the file contents.

### Test checkpoint

Run:

```bash
npm test
```

All tests should **fail** — that's expected and correct for TDD. You'll see red output like "Cannot find module `@/lib/ocr`". This confirms the tests are correctly trying to import the module you haven't written yet. The next step writes the implementation to make them pass.

---

## Step 4.4: Implement `lib/ocr.ts`

### What to do

Create `lib/ocr.ts` with a single exported async function called `extractText`. This is the OCR wrapper that the rest of the app will use. The function should:

1. Accept a `File` object and an optional `onProgress` callback
2. Create a Tesseract.js worker
3. Run OCR on the file
4. Terminate the worker (cleanup)
5. Return `{ text: string; confidence: number }`

**Function signature:**

```typescript
export interface OcrResult {
  text: string;
  confidence: number;
}

export type OcrProgressCallback = (progress: number) => void;

export async function extractText(
  file: File,
  onProgress?: OcrProgressCallback
): Promise<OcrResult> {
  // implementation here
}
```

**Tesseract.js API pattern:**

Tesseract.js v5 uses this general pattern:

```typescript
import { createWorker } from "tesseract.js";

const worker = await createWorker("eng", 1, {
  logger: (info) => {
    // info.status is a string like "recognizing text"
    // info.progress is a number from 0 to 1
  },
});

const { data } = await worker.recognize(file);
// data.text is the extracted text
// data.confidence is a number (0-100)

await worker.terminate();
```

The first argument to `createWorker` is the language code (`"eng"` for English). The second is the OEM (OCR Engine Mode) — `1` means use the LSTM neural network engine (most accurate). The third is an options object where `logger` receives progress updates.

**Progress callback wiring:** The Tesseract `logger` fires for multiple status phases (loading language data, initializing, recognizing text). The `onProgress` callback your function exposes should forward the `progress` value from the "recognizing text" phase specifically, since that's the meaningful work phase. You can check `info.status === "recognizing text"` to filter.

**Error handling:** Wrap the Tesseract calls in a try/catch. If OCR fails (corrupt image, worker initialization error), throw a clear error message. Make sure to terminate the worker in a `finally` block so it's always cleaned up, even on errors:

```typescript
const worker = await createWorker(/* ... */);
try {
  const { data } = await worker.recognize(file);
  return { text: data.text, confidence: data.confidence };
} finally {
  await worker.terminate();
}
```

This `try/finally` pattern is like using a database connection pool in Express — you always close the connection when done, whether the query succeeded or failed.

### What is the `finally` block?

You've likely seen `try/catch` in Node.js. `finally` is the third piece — code that runs **no matter what**, whether the try block succeeded or the catch block handled an error. It's the right place for cleanup operations: closing files, terminating workers, releasing resources. Without `finally`, if `worker.recognize()` throws, the `worker.terminate()` after it would never run, and you'd leak a Web Worker.

### Test checkpoint

Run:

```bash
npm test
```

All three tests from Step 4.3 should now **pass** (green). If any fail, read the error messages carefully — they'll tell you exactly which expectation failed and what the actual value was.

---

## Step 4.5: Add the shadcn Progress Component

### What to do

Install the shadcn/ui progress component:

```bash
npx shadcn@latest add progress
```

This copies a `progress.tsx` file into `components/ui/`. The Progress component renders an animated bar that fills based on a `value` prop (0 to 100).

### How the Progress component works

The shadcn Progress component wraps the Radix UI `Progress` primitive — an accessible progress bar that handles ARIA attributes (screen readers will announce "50% complete" etc.) automatically. You use it like this:

```tsx
import { Progress } from "@/components/ui/progress";

<Progress value={75} />  // 75% filled bar
```

The `value` prop accepts a number from 0 to 100. Tesseract's progress callback gives you 0 to 1, so you'll need to multiply by 100 when converting.

### Test checkpoint

Verify the file exists:

- `components/ui/progress.tsx`

And run:

```bash
npm run build
```

Build should pass with the new component added.

---

## Step 4.6: Add "Process Receipt" Button and OCR Integration to the Page

### What to do

Update `app/page.tsx` to add three things:

1. **A "Process Receipt" button** that appears after an image is selected
2. **A progress bar** that shows during OCR processing
3. **A raw text display** that shows the extracted text after OCR completes

**New state variables to add:**

```typescript
const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
const [ocrProgress, setOcrProgress] = useState<number>(0);
const [isProcessing, setIsProcessing] = useState<boolean>(false);
const [ocrError, setOcrError] = useState<string | null>(null);
```

Import `OcrResult` from `@/lib/ocr`.

**Processing flow when the user clicks "Process Receipt":**

1. Set `isProcessing` to `true`, clear any previous `ocrResult` and `ocrError`, reset `ocrProgress` to 0
2. Call `extractText(selectedFile, (progress) => setOcrProgress(progress))` from `lib/ocr.ts`
3. On success: store the result in `ocrResult`, set `isProcessing` to `false`
4. On error: store the error message in `ocrError`, set `isProcessing` to `false`

**UI layout updates:**

The page should show these elements conditionally based on state:

| State | What to show |
|-------|-------------|
| No file selected | Upload area only (existing behavior) |
| File selected, not processing | Upload area + image preview + "Process Receipt" button |
| Processing (isProcessing === true) | Upload area + image preview + progress bar with percentage text + disabled button |
| OCR complete (ocrResult exists) | Upload area + image preview + raw text display + "Process Receipt" button (to re-run) |
| Error (ocrError exists) | Upload area + image preview + error message + "Process Receipt" button (to retry) |

**"Process Receipt" button details:**
- Use a shadcn `Button` component
- Disable the button while `isProcessing` is true (prevents double-clicks)
- Show "Processing..." text while processing, "Process Receipt" otherwise

**Progress bar details:**
- Only visible when `isProcessing` is true
- Use the shadcn `Progress` component with `value={Math.round(ocrProgress * 100)}`
- Show a text label below like "Extracting text... 45%" so the user has a numeric reference too

**Raw text display details:**
- Only visible when `ocrResult` is not null
- Show the extracted text in a `<pre>` block with some basic styling (background color, padding, overflow scroll, monospaced font)
- Optionally show the confidence score (e.g., "Confidence: 87%") so the developer can gauge OCR quality
- This display is temporary — Task #5 will replace it with AI parsing that converts this text to structured data

**Error display details:**
- Only visible when `ocrError` is not null
- Show the error message in a styled container (red/destructive coloring to indicate failure)
- The user can click "Process Receipt" again to retry

### Concepts to understand

**Multiple state variables working together.** In Express, you might track a request's lifecycle with a single status object. In React, each piece of independent state gets its own `useState`. This might feel verbose compared to one big state object, but it's intentional — when you call `setOcrProgress(0.5)`, React only re-renders because *that specific piece* of state changed. If everything were in one object, you'd have to be careful about spreading the old state every time: `setState(prev => ({ ...prev, progress: 0.5 }))`.

We use four separate state variables here because they change independently: `isProcessing` toggles at start/end, `ocrProgress` updates many times per second during OCR, `ocrResult` is set once at the end, and `ocrError` is set only if something fails.

**Async event handlers.** The button's `onClick` handler needs to be `async` because `extractText` returns a Promise. In React, this looks like:

```tsx
const handleProcess = async () => {
  setIsProcessing(true);
  setOcrError(null);
  setOcrResult(null);
  setOcrProgress(0);

  try {
    const result = await extractText(selectedFile!, (progress) => {
      setOcrProgress(progress);
    });
    setOcrResult(result);
  } catch (err) {
    setOcrError(err instanceof Error ? err.message : "OCR failed");
  } finally {
    setIsProcessing(false);
  }
};
```

The `selectedFile!` non-null assertion is safe here because the button is only visible when `selectedFile` is not null. The `try/catch/finally` pattern mirrors what we did in `lib/ocr.ts` — cleanup (`setIsProcessing(false)`) runs no matter what.

**Conditional rendering patterns.** You've already seen the `&&` pattern from Task #3. This step uses it heavily:

```tsx
{isProcessing && <Progress value={Math.round(ocrProgress * 100)} />}
{ocrResult && <pre>{ocrResult.text}</pre>}
{ocrError && <p className="text-red-500">{ocrError}</p>}
```

Each line renders its element only when the condition is truthy. This keeps the JSX declarative — you describe *what should appear for each state*, not *how to show/hide elements*.

### Test checkpoint

Run the dev server and test the full flow:

```bash
npm run dev
```

1. Open http://localhost:3000
2. Upload a receipt image — preview appears
3. Click "Process Receipt" — progress bar appears and fills up (this will take 5-15 seconds on the first run as Tesseract downloads the language model)
4. After completion — raw extracted text appears on the page, with a confidence percentage
5. Verify the text roughly matches what's on the receipt (OCR won't be perfect — misspellings and formatting issues are normal)
6. Try clicking "Process Receipt" again — it should reset and re-run OCR
7. Open the browser console — there should be no errors or warnings about memory leaks

Note: The first OCR run will be slow (~10-20 seconds) because Tesseract downloads a ~15MB language model. Subsequent runs on the same browser session will be faster (~5-10 seconds) because the model is cached.

---

## Step 4.7: Final Verification

### What to do

**1. Run all tests:**

```bash
npm test
```

All tests should pass. You should see green output for the `lib/__tests__/ocr.test.ts` test suite.

**2. Production build check:**

```bash
npm run build
```

The build should complete with no TypeScript errors, no missing imports, and no warnings.

**3. Manual browser test:**

```bash
npm run dev
```

Open http://localhost:3000 and run through the full flow one more time:

- Upload a receipt image → preview appears
- Click "Process Receipt" → progress bar fills up
- OCR completes → raw text is displayed with confidence score
- Try an error case: if possible, test with a very small or blank image to see the error handling

**4. File structure review:**

Your project should now look like this (new and modified files marked):

```
transaction-scanner/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                ← modified (added Process button, progress, text display)
│   └── globals.css
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   └── progress.tsx        ✦ new (shadcn component)
│   ├── receipt-uploader.tsx
│   └── receipt-preview.tsx
├── lib/
│   ├── ocr.ts                  ✦ new (Tesseract.js wrapper)
│   ├── __tests__/
│   │   └── ocr.test.ts         ✦ new (unit tests)
│   └── utils.ts
├── types/
│   └── receipt.ts
├── docs/
│   ├── DESIGN.md
│   └── tasks/
│       ├── TASK-1.md
│       ├── TASK-2.md
│       ├── TASK-3.md
│       └── TASK-4.md
├── jest.config.ts              ✦ new (Jest configuration)
└── ...
```

### Test checkpoint

Both `npm test` and `npm run build` complete without errors. The manual browser flow works end-to-end: upload → process → see extracted text.

---

## Wrap-Up

### What you accomplished

- **`lib/ocr.ts`** — a Tesseract.js wrapper that takes an image `File`, runs OCR, and returns `{ text, confidence }` with progress callbacks and proper cleanup
- **`lib/__tests__/ocr.test.ts`** — unit tests covering successful extraction, error handling, and progress callbacks, with Tesseract.js mocked
- **`jest.config.ts`** — Jest testing infrastructure set up with `@next/jest` for the project
- **`components/ui/progress.tsx`** — shadcn Progress component installed for the progress bar
- **`app/page.tsx`** — updated with a "Process Receipt" button, progress bar during OCR, raw text display after completion, and error handling

### Concepts you learned

| Concept | What it does |
|---------|-------------|
| Tesseract.js | Browser-based OCR engine that runs in a Web Worker — extracts text from images without server calls |
| Web Workers | Background threads in the browser for CPU-intensive work, keeping the UI responsive |
| `createWorker` / `terminate` | Tesseract's lifecycle: create a worker, use it, clean it up. Similar to opening/closing a database connection |
| `try/finally` | Ensures cleanup code runs regardless of success or failure — essential for resource management |
| Jest with `@next/jest` | Testing framework configured to understand Next.js conventions (TypeScript, path aliases, JSX) |
| Mocking (`jest.mock`) | Replacing real dependencies with fakes in tests — controls behavior, avoids slow external calls |
| Spy functions (`jest.fn`) | Fake functions that record how they were called — used to verify callbacks are invoked correctly |
| TDD (Test-Driven Development) | Writing tests before implementation — defines behavior first, then writes code to satisfy it |
| Multiple `useState` variables | Each independent piece of state gets its own hook — React re-renders efficiently based on what changed |
| Async event handlers | Using `async/await` in React click handlers to manage Promises from asynchronous operations |
| shadcn Progress component | An accessible progress bar with ARIA support, driven by a `value` prop (0-100) |

### What's next

**Task #5: AI parsing with OpenAI** — the raw OCR text you're now extracting will be sent to an OpenAI API endpoint that converts it into structured JSON (store name, date, items with prices, tax, total). You'll create a Next.js API route at `app/api/parse-receipt/route.ts` and wire the frontend to call it after OCR completes. The `OcrResult.text` you're capturing in state is exactly what the API route will receive.
