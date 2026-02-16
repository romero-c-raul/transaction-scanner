# Task #5: AI Parsing with OpenAI

## Goal

Wire up an OpenAI-powered API route that receives raw OCR text and returns structured receipt data (store, date, items, tax, total). By the end, you'll have a tested API endpoint at `app/api/parse-receipt/route.ts`, Zod-validated responses using OpenAI's structured outputs, basic rate limiting, and a frontend that automatically sends OCR text to the API and displays the parsed result -- replacing the raw text debug display from Task #4.

## Prerequisites

- **Task #4 complete** -- `app/page.tsx` has the "Process Receipt" button, OCR works end-to-end, `npm test` and `npm run build` pass
- **Node.js 18+** installed
- **An OpenAI API key** -- sign up at https://platform.openai.com if you don't have one. You'll need a key that starts with `sk-`. Add credit ($5 minimum) to your account -- GPT-4o-mini costs roughly $0.01 per receipt.
- A receipt image for manual testing (the same one from Task #4 works)

## A Note on Scope

DESIGN.md's Task #5 description covers the API route, frontend wiring, rate limiting, and a security review. Here's how we're handling each:

| Item | Decision | Reason |
|------|----------|--------|
| OpenAI structured outputs with Zod | **Included** | Guarantees valid JSON matching our schema. Better than parsing raw text and hoping for the best. |
| `lib/openai.ts` (client setup) | **Included** | DESIGN.md lists this file. We'll use it for OpenAI client initialization and the parsing function, keeping the route handler thin. |
| In-memory rate limiting | **Included (learning exercise)** | Demonstrates the pattern. Won't persist across Vercel serverless cold starts, but teaches the concept. |
| Security principles | **Included (implementation + documentation)** | Input sanitization, env var checks, error sanitization -- all implemented. Plus a conceptual section explaining why and what to add for production. |
| Cross-page state management (React Context) | **Included** | The parsed receipt needs to reach Task #6's verify page. We'll set up a lightweight React Context to share state between pages. |
| Raw OCR text display | **Replaced** | Task #4's raw text `<pre>` block was a debug tool. After parsing, the page shows a structured results summary instead. |

---

## Step 5.1: Install Dependencies (OpenAI SDK + Zod)

### What to do

Install the OpenAI SDK and Zod:

```bash
npm install openai zod
```

This adds two libraries:
- **`openai`** -- the official OpenAI Node.js SDK for calling GPT models
- **`zod`** -- a TypeScript-first schema validation library

### What is Zod?

If you've used Joi or Yup for request validation in Express, Zod fills the same role -- it defines a schema and validates data against it at runtime. The key difference: Zod is built for TypeScript. It can **infer** TypeScript types directly from your schema, so you define the shape once and get both runtime validation and compile-time types from the same source.

```typescript
import { z } from "zod";

// Define a schema
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

// Infer the TypeScript type from the schema
type User = z.infer<typeof UserSchema>;
// Result: User is { name: string; age: number }

// Validate data at runtime -- throws ZodError if invalid
const result = UserSchema.parse(someData);
```

In Express, you might validate `req.body` with Joi and then separately define a TypeScript interface for the same shape. With Zod, those are the same thing -- no duplication, no drift between what you validate and what you type-check.

The OpenAI SDK has built-in Zod integration for structured outputs. You pass a Zod schema to the API call, and OpenAI guarantees the response matches that schema. This eliminates the need to parse raw JSON strings and handle malformed responses.

### Test checkpoint

```bash
npm ls openai zod
```

Both should appear in the dependency tree. Then:

```bash
npm run build
```

Build should pass -- installing dependencies doesn't break anything.

---

## Step 5.2: Add Your OpenAI API Key to `.env.local`

### What to do

Open the `.env.local` file in the project root. It should already have a placeholder from Task #1. Replace it with your actual key:

```
OPENAI_API_KEY=sk-your-actual-key-here
```

If the file doesn't exist, create it. Make sure `.env.local` is listed in `.gitignore` (Next.js adds this by default).

### Why `.env.local`?

In Express, you might use the `dotenv` package to load environment variables from a `.env` file. Next.js does this automatically -- it reads `.env.local` on startup and makes the values available via `process.env.OPENAI_API_KEY` in server-side code (API routes, Server Components). The `.local` suffix means "local to this machine, never committed to git."

The key is only accessible on the server side. Client-side code (components with `"use client"`) cannot read `process.env.OPENAI_API_KEY` -- Next.js strips it out during the build to prevent accidental exposure. If you need a variable in the browser, you'd prefix it with `NEXT_PUBLIC_` -- but we deliberately avoid that for secrets. This is why we're building an API route: the browser calls our route, and our route calls OpenAI with the key safely on the server.

### Test checkpoint

Verify the file exists and is git-ignored:

```bash
git status
```

`.env.local` should NOT appear as an untracked file. If it does, check `.gitignore` for a `.env.local` entry and add it if missing.

---

## Step 5.3: Define the Zod Schema for Parsed Receipts

### What to do

Create a new directory and file at `lib/schemas/receipt.ts`. This file defines the Zod schema that describes what the OpenAI response should look like.

```typescript
import { z } from "zod";

/**
 * Schema for a single line item returned by the AI parser.
 *
 * Note: this does NOT include `id` -- the AI doesn't generate unique
 * identifiers. IDs are added by the API route before returning the
 * response (see lib/openai.ts).
 */
export const ReceiptItemSchema = z.object({
  name: z.string(),
  price: z.number(),
});

/**
 * Schema for the full receipt as returned by OpenAI.
 * Matches the prompt structure in DESIGN.md Section 8.
 *
 * Fields like `store` and `date` are nullable because the AI
 * returns null when it can't determine a value from the OCR text.
 */
export const ReceiptSchema = z.object({
  store: z.string().nullable(),
  date: z.string().nullable(),
  items: z.array(ReceiptItemSchema),
  tax: z.number(),
  total: z.number(),
});
```

### Why a separate schema file from `types/receipt.ts`?

The project already has `types/receipt.ts` with `Receipt` and `ReceiptItem` interfaces. Those are compile-time types -- they disappear after TypeScript compiles to JavaScript. They can't validate data at runtime.

The Zod schema exists at runtime -- it can check that OpenAI actually returned valid data with the right types and structure. Think of it like the difference between a TypeScript interface for a Mongoose document vs. the Mongoose schema itself. The interface tells TypeScript what shape to expect; the schema actually enforces that shape when data arrives.

We keep them in separate files because they serve different audiences:
- `types/receipt.ts` is the app-wide data contract (imported everywhere)
- `lib/schemas/receipt.ts` is specific to the AI parsing logic (imported only by the OpenAI integration)

Notice that `ReceiptItemSchema` lacks the `id` field that `ReceiptItem` has. OpenAI won't generate unique IDs -- that's our job. In Step 5.5, the `parseReceiptText` function will map the AI response to the full `Receipt` type by adding an `id` to each item.

### Test checkpoint

```bash
npm run build
```

Build should pass. The schema file is pure TypeScript with a `zod` import -- no external service calls, no side effects.

---

## Step 5.4: Write Tests for the API Route (TDD -- Tests First)

> **Implementation note:** We broke this step into 4 sub-steps to make it
> easier to learn one concept at a time:
> - **4a:** Mock setup + helper function + happy path test (learn mocking)
> - **4b:** Input validation tests — 400s (learn error response testing)
> - **4c:** Error handling tests — 500s (learn error sanitization)
> - **4d:** Rate limiting test — 429 (learn loop-based testing)
>
> This worked well for absorbing new patterns. Consider the same approach
> for future steps that introduce many concepts at once.

### What to do

Create the test file at `app/api/parse-receipt/__tests__/route.test.ts` **before** writing the implementation. DESIGN.md marks Task #5 for TDD with these test areas: response shape validation, error responses, and rate limiting logic.

The tests should cover six cases:

1. **Successful parsing** -- given valid OCR text, the route returns a 200 response with a body matching the `Receipt` type (store, date, items with IDs, tax, total).
2. **Missing OCR text** -- sending an empty or missing `text` field returns a 400 error with a clear message.
3. **Input too long** -- sending an extremely long string (over 10,000 characters) returns a 400 error. This prevents abuse and excessive API costs.
4. **Missing API key** -- when `OPENAI_API_KEY` is not set, the route returns a 500 error with a generic message (not leaking internal details).
5. **OpenAI failure** -- when the OpenAI call throws, the route returns a 500 error with a sanitized message.
6. **Rate limiting** -- sending many requests in quick succession eventually returns a 429 (Too Many Requests) response.

### Mocking the OpenAI SDK

You need to mock the OpenAI SDK so tests don't make real API calls (which would cost money and be slow). The mock should intercept the `openai.beta.chat.completions.parse` method -- that's the structured output method we'll use in the implementation.

```typescript
// Tell Jest: when any code imports "openai", give it this fake instead
jest.mock("openai", () => {
  // Create the mock function outside so tests can configure its return value
  const mockParse = jest.fn();

  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      beta: {
        chat: {
          completions: {
            parse: mockParse,
          },
        },
      },
    })),
  };
});
```

This replaces the entire `openai` module with a fake. When the route code does `new OpenAI()`, it gets a mock object. When it calls `openai.beta.chat.completions.parse(...)`, it hits `mockParse` -- a jest spy you can configure per test.

For each test, you configure the mock to return success or throw an error:

```typescript
// For success tests: configure mockParse to return a valid response
mockParse.mockResolvedValue({
  choices: [
    {
      message: {
        parsed: {
          store: "Walmart",
          date: "2024-01-15",
          items: [{ name: "Milk", price: 3.99 }],
          tax: 0.32,
          total: 4.31,
        },
      },
    },
  ],
});

// For error tests: configure mockParse to throw
mockParse.mockRejectedValue(new Error("OpenAI API error"));
```

### Testing Next.js API routes

Next.js App Router API routes export functions like `POST(request: NextRequest)`. To test them, you import the function directly and pass a constructed `NextRequest`:

```typescript
import { POST } from "@/app/api/parse-receipt/route";
import { NextRequest } from "next/server";

// Helper function to create a fake request
function createRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/parse-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
```

This is similar to how you might test an Express route handler by creating a mock `req` object. The difference is that Next.js uses the standard `Request`/`Response` Web APIs instead of Express's custom objects.

### Rate limiter testing

The rate limiter (Step 5.6) uses an in-memory Map, so tests can trigger it by calling `POST` repeatedly in a loop. The rate limiter module will export a `resetRateLimiter()` function specifically for tests -- call it in `beforeEach` so each test starts with a clean slate.

### Test structure

```typescript
import { POST } from "@/app/api/parse-receipt/route";
import { resetRateLimiter } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

jest.mock("openai", () => {
  const mockParse = jest.fn();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      beta: {
        chat: {
          completions: {
            parse: mockParse,
          },
        },
      },
    })),
  };
});

// Helper to build a request with a JSON body
function createRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/parse-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/parse-receipt", () => {
  // Get a reference to the mock so tests can configure it
  let mockParse: jest.Mock;

  beforeEach(() => {
    // Reset the rate limiter so each test starts fresh
    resetRateLimiter();

    // Clear all mock call history
    jest.clearAllMocks();

    // Get reference to the mock parse function
    const OpenAI = require("openai").default;
    const openaiInstance = new OpenAI();
    mockParse = openaiInstance.beta.chat.completions.parse;

    // Ensure the API key is set for most tests
    process.env.OPENAI_API_KEY = "sk-test-key";
  });

  it("returns parsed receipt data for valid OCR text", async () => {
    // Arrange: mock returns a valid parsed receipt
    mockParse.mockResolvedValue({
      choices: [
        {
          message: {
            parsed: {
              store: "Walmart",
              date: "2024-01-15",
              items: [
                { name: "Milk 2%", price: 3.99 },
                { name: "Bread", price: 2.49 },
              ],
              tax: 0.52,
              total: 7.00,
            },
          },
        },
      ],
    });

    // Act
    const request = createRequest({ text: "WALMART\nMilk 2% $3.99\nBread $2.49\nTax $0.52\nTotal $7.00" });
    const response = await POST(request);
    const data = await response.json();

    // Assert: 200 status and correct shape
    expect(response.status).toBe(200);
    expect(data.store).toBe("Walmart");
    expect(data.date).toBe("2024-01-15");
    expect(data.items).toHaveLength(2);
    expect(data.tax).toBe(0.52);
    expect(data.total).toBe(7.00);

    // Assert: each item has an id (generated by our code, not OpenAI)
    expect(data.items[0].id).toBeDefined();
    expect(typeof data.items[0].id).toBe("string");
    expect(data.items[0].name).toBe("Milk 2%");
    expect(data.items[0].price).toBe(3.99);
  });

  it("returns 400 when text is missing", async () => {
    // Act: send a request with no text field
    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns 400 when text exceeds maximum length", async () => {
    // Arrange: create a string longer than the 10,000 character limit
    const longText = "a".repeat(10_001);

    // Act
    const request = createRequest({ text: longText });
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toMatch(/length/i);
  });

  it("returns 500 when OPENAI_API_KEY is not configured", async () => {
    // Arrange: remove the API key
    delete process.env.OPENAI_API_KEY;

    // Act
    const request = createRequest({ text: "some receipt text" });
    const response = await POST(request);
    const data = await response.json();

    // Assert: 500 with a generic message (no key details leaked)
    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
    expect(data.error).not.toMatch(/sk-/); // must not leak the key format
  });

  it("returns 500 with sanitized message when OpenAI call fails", async () => {
    // Arrange: mock throws an internal error with sensitive details
    mockParse.mockRejectedValue(
      new Error("Request failed: invalid API key sk-abc123")
    );

    // Act
    const request = createRequest({ text: "some receipt text" });
    const response = await POST(request);
    const data = await response.json();

    // Assert: 500 with a generic message, not the raw error
    expect(response.status).toBe(500);
    expect(data.error).not.toMatch(/sk-/);
    expect(data.error).not.toMatch(/invalid API key/);
  });

  it("returns 429 after too many requests", async () => {
    // Arrange: mock returns success every time
    mockParse.mockResolvedValue({
      choices: [
        {
          message: {
            parsed: {
              store: null,
              date: null,
              items: [],
              tax: 0,
              total: 0,
            },
          },
        },
      ],
    });

    // Act: send requests up to and past the limit
    // The rate limiter allows 10 requests per 60 seconds
    const responses = [];
    for (let i = 0; i < 12; i++) {
      const request = createRequest({ text: "receipt text" });
      const response = await POST(request);
      responses.push(response);
    }

    // Assert: the last responses should be 429
    const statusCodes = responses.map((r) => r.status);
    expect(statusCodes).toContain(429);

    // The first 10 should succeed
    const successCount = statusCodes.filter((s) => s === 200).length;
    expect(successCount).toBe(10);
  });
});
```

### Test checkpoint

Run:

```bash
npm test
```

All tests should **fail** -- that's expected and correct for TDD. You'll see errors like "Cannot find module `@/app/api/parse-receipt/route`" and "Cannot find module `@/lib/rate-limit`". This confirms the tests are correctly trying to import modules you haven't written yet. The next steps write the implementations to make them pass.

---

## Step 5.5: Implement `lib/openai.ts` (OpenAI Client + Parsing Function)

### What to do

Create `lib/openai.ts` with two things:
1. An OpenAI client instance
2. A `parseReceiptText` function that sends OCR text to GPT-4o-mini and returns a validated `Receipt`

**OpenAI client setup:**

```typescript
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { ReceiptSchema } from "@/lib/schemas/receipt";
import { Receipt } from "@/types/receipt";
```

Create the client at module level:

```typescript
// The SDK reads the API key from process.env.OPENAI_API_KEY automatically,
// but we pass it explicitly for clarity. This file only runs on the server
// (imported by the API route), so process.env access is safe.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

**The system prompt:**

Use the prompt from DESIGN.md Section 8. Store it as a module-level constant:

```typescript
// System prompt instructs the AI on its role and the expected output format.
// Even though structured outputs enforce the schema, the prompt gives the AI
// context about what it's parsing and how to handle ambiguous cases.
const SYSTEM_PROMPT = `You are a receipt parser. Extract structured data from receipt text.
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
```

**The `parseReceiptText` function:**

```typescript
export async function parseReceiptText(ocrText: string): Promise<Receipt> {
  // 1. Call OpenAI with structured output -- the Zod schema guarantees
  //    the response matches ReceiptSchema exactly
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Parse this receipt text:\n\n${ocrText}` },
    ],
    response_format: zodResponseFormat(ReceiptSchema, "receipt"),
  });

  // 2. Extract the parsed data from the response.
  //    The SDK has already validated it against ReceiptSchema.
  const parsedReceipt = completion.choices[0].message.parsed;

  // 3. Handle the edge case where parsing returns null
  //    (e.g., the model refused to respond or content was filtered)
  if (!parsedReceipt) {
    throw new Error("Failed to parse receipt: no data returned from AI");
  }

  // 4. Map to our Receipt type by adding unique IDs to each item.
  //    OpenAI doesn't generate IDs -- that's our responsibility.
  //    crypto.randomUUID() is available in Node.js 18+ and generates
  //    a UUID v4 string like "550e8400-e29b-41d4-a716-446655440000".
  const receipt: Receipt = {
    store: parsedReceipt.store,
    date: parsedReceipt.date,
    items: parsedReceipt.items.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      price: item.price,
    })),
    tax: parsedReceipt.tax,
    total: parsedReceipt.total,
  };

  return receipt;
}
```

### What is `zodResponseFormat`?

The `zodResponseFormat` helper bridges Zod and OpenAI's structured output feature. When you pass it to the API call, OpenAI constrains its response to match the schema exactly -- the model physically cannot produce output that violates the schema. This is different from just asking "please return JSON" in the prompt (where the model might forget a field or use the wrong type).

Think of it as the difference between application-level validation ("check the data after it arrives") vs. database-level constraints ("the data can't be wrong in the first place"). Structured outputs are the latter -- the constraint is enforced at the source.

The second argument (`"receipt"`) is a name for the schema that OpenAI uses internally. It can be any descriptive string.

### What is `crypto.randomUUID()`?

In Express, you might use the `uuid` npm package to generate unique IDs. Modern Node.js (18+) has this built in: `crypto.randomUUID()` generates a UUID v4 string. Since this runs on the server (in the API route), the `crypto` global is the Node.js crypto module, not the browser's Web Crypto API. Same function name, same result, different runtime.

We add IDs here (on the server) rather than on the frontend so that the API response matches the `Receipt` type exactly. The frontend doesn't need to do any post-processing -- it can use the response directly.

### Test checkpoint

```bash
npm run build
```

Build should pass. The file compiles cleanly. Some tests from Step 5.4 may still fail because the route file and rate limiter don't exist yet -- that's expected.

---

## Step 5.6: Implement the Rate Limiter (`lib/rate-limit.ts`)

### What to do

Create `lib/rate-limit.ts` with a simple in-memory rate limiter. This module tracks request counts per IP address using a sliding window and rejects requests that exceed a threshold.

**The full implementation:**

```typescript
/**
 * In-memory sliding window rate limiter.
 *
 * Tracks request timestamps per IP address. When a new request arrives,
 * it removes expired timestamps (outside the window) and checks if the
 * remaining count exceeds the limit.
 *
 * IMPORTANT: This is a learning exercise. In production on Vercel, each
 * serverless function invocation gets its own memory -- this Map won't
 * be shared across instances or survive cold starts. For production,
 * use Upstash Redis (see Step 5.8 for details).
 */

const MAX_REQUESTS = 10;
const WINDOW_MS = 60_000; // 60 seconds

// Map of IP address -> array of request timestamps (in milliseconds)
const requestLog = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const timestamps = requestLog.get(ip) ?? [];

  // Remove timestamps that are outside the current window.
  // Only keep requests from the last WINDOW_MS milliseconds.
  const recentTimestamps = timestamps.filter(
    (timestamp) => now - timestamp < WINDOW_MS
  );

  // If this IP has hit the limit, reject the request
  if (recentTimestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = recentTimestamps[0];
    // Tell the client how long to wait before the oldest request
    // "falls out" of the window, freeing up a slot
    const retryAfterMs = WINDOW_MS - (now - oldestInWindow);
    return { allowed: false, retryAfterMs };
  }

  // Request is allowed -- record the timestamp
  recentTimestamps.push(now);
  requestLog.set(ip, recentTimestamps);
  return { allowed: true };
}

/**
 * Clear all rate limit data. Exported for use in tests --
 * each test should start with a clean slate so rate limit
 * state from one test doesn't affect another.
 */
export function resetRateLimiter(): void {
  requestLog.clear();
}
```

### What is a sliding window rate limiter?

In Express, you might have used `express-rate-limit` middleware. That library uses a similar concept: for each client (identified by IP), track how many requests they've made in a time window. If they exceed the limit, reject with HTTP 429 (Too Many Requests).

A **sliding window** means the window moves with time. If the window is 60 seconds and you made your first request at T=0, the window covers T=0 to T=60. At T=30, the window still covers T=0 to T=60. At T=61, that first request "falls out" of the window and doesn't count anymore. This is fairer than a "fixed window" where everyone's counter resets at the same clock time (which causes bursts right after the reset).

The pattern here is:
1. Look up the IP's request history
2. Throw away any timestamps older than the window
3. If the remaining count is at or above the max, reject
4. Otherwise, record the new timestamp and allow

**Why per-IP?** The IP address is the simplest way to identify a client without authentication. It's not perfect -- users behind the same NAT share an IP, and VPNs can change IPs -- but it's the standard approach for unauthenticated rate limiting.

### Test checkpoint

```bash
npm run build
```

Build should pass. The rate limiter is a pure TypeScript module with no external dependencies -- just a Map and some arithmetic.

---

## Step 5.7: Implement `app/api/parse-receipt/route.ts`

### What to do

Create the API route at `app/api/parse-receipt/route.ts`. This is a Next.js App Router API route -- it exports an async `POST` function that handles incoming requests. The route is the thin orchestration layer: it validates input, checks rate limits, calls the parsing function, and returns the result.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { parseReceiptText } from "@/lib/openai";
import { checkRateLimit } from "@/lib/rate-limit";

// Maximum length of OCR text we'll accept. Receipts are typically a few
// hundred characters. 10,000 is generous enough for very long receipts
// but prevents someone from sending a novel-length string that would
// cost significant OpenAI credits to process.
const MAX_TEXT_LENGTH = 10_000;

export async function POST(request: NextRequest) {
  // 1. Environment check -- fail fast if the API key isn't configured.
  //    We check this first so deployment misconfigurations surface immediately
  //    rather than after processing input.
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    return NextResponse.json(
      { error: "Server configuration error. Please try again later." },
      { status: 500 }
    );
  }

  // 2. Rate limiting -- extract client IP and check the limit.
  //    On Vercel, x-forwarded-for contains the real client IP.
  //    Locally, it might be null, so we fall back to "unknown".
  const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = checkRateLimit(clientIp);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      {
        status: 429,
        headers: {
          // Tell the client how many seconds to wait before retrying.
          // This is a standard HTTP header that well-behaved clients respect.
          "Retry-After": String(
            Math.ceil((rateLimitResult.retryAfterMs ?? 0) / 1000)
          ),
        },
      }
    );
  }

  // 3. Input validation -- parse the request body and check the text field.
  let text: string;
  try {
    const body = await request.json();
    text = body?.text;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body. Expected JSON with a 'text' field." },
      { status: 400 }
    );
  }

  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'text' field. Expected a non-empty string." },
      { status: 400 }
    );
  }

  // Trim whitespace before checking length -- leading/trailing whitespace
  // shouldn't count against the limit
  const trimmedText = text.trim();

  if (trimmedText.length === 0) {
    return NextResponse.json(
      { error: "The 'text' field is empty after trimming whitespace." },
      { status: 400 }
    );
  }

  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      {
        error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`,
      },
      { status: 400 }
    );
  }

  // 4. Parse with OpenAI -- the heavy lifting happens in lib/openai.ts.
  //    We wrap this in try/catch to ensure internal errors never reach the client.
  try {
    const receipt = await parseReceiptText(trimmedText);
    return NextResponse.json(receipt);
  } catch (error) {
    // Log the full error server-side for debugging (visible in terminal
    // or Vercel logs). The client gets only a generic message.
    console.error("Failed to parse receipt:", error);
    return NextResponse.json(
      { error: "Failed to parse receipt. Please try again." },
      { status: 500 }
    );
  }
}
```

### What is a Next.js API route?

In Express, you define routes with `app.post("/api/parse-receipt", handler)`. In Next.js App Router, routes are defined by the **file system**. A file at `app/api/parse-receipt/route.ts` automatically becomes the `/api/parse-receipt` endpoint. Exporting a function named `POST` handles POST requests, `GET` handles GET requests, `PUT` handles PUT requests, and so on.

The function receives a `NextRequest` (similar to Express's `req`) and returns a `NextResponse` (similar to Express's `res.json()`). The key difference: instead of calling `res.json(data)` (mutating the response object), you `return NextResponse.json(data)` (returning a new response). It's a functional style -- you return a value instead of mutating one.

Another difference from Express: there's no middleware chain. In Express, you might have `app.use(rateLimit())` as middleware before your route. In Next.js App Router, you call the rate limiter directly inside the route function. It's more explicit -- you can see every step the request goes through without tracing a middleware stack.

### Why sanitize error messages?

Look at the catch block: it logs the full error with `console.error` but sends only `"Failed to parse receipt. Please try again."` to the client. This is intentional. The real error might contain:
- The API key (e.g., `"Invalid API key: sk-abc123..."`)
- Internal file paths (e.g., `"at /app/lib/openai.ts:42"`)
- OpenAI-specific error codes or messages

If an attacker sends crafted input and reads the error response, this information helps them understand your server's internals. Logging it server-side gives *you* the details for debugging; sanitizing the client response gives attackers nothing useful.

### Test checkpoint

Run:

```bash
npm test
```

All six tests from Step 5.4 should now **pass** (green). If any fail, read the error messages carefully -- they'll tell you exactly which assertion didn't match and what the actual value was.

Also run:

```bash
npm run build
```

Build should pass with no TypeScript errors.

---

## Step 5.8: Security Principles for Public-Facing AI Apps

### What to review

This step has no code to write -- it's a checkpoint to verify the security measures from previous steps are in place, and to understand why they matter. Your app will be hosted publicly on Vercel, so anyone can discover and call your API endpoint.

**Verify these are implemented:**

| Security measure | Where | Why |
|-----------------|-------|-----|
| API key on server only | `.env.local` + API route | The key never reaches the browser. If it did, anyone could use your OpenAI account. |
| Input length limit | `route.ts` (10,000 char max) | Prevents someone from sending a massive payload that generates an expensive OpenAI call. |
| Input type validation | `route.ts` (check `text` is a string) | Prevents unexpected data types from reaching OpenAI or crashing your code. |
| Rate limiting | `lib/rate-limit.ts` + `route.ts` | Prevents automated abuse -- someone writing a script to hit your endpoint 1,000 times. |
| Sanitized error messages | `route.ts` catch block | Internal errors are logged server-side but the client sees only a generic message. Never leak stack traces, file paths, or key fragments. |
| `.env.local` in `.gitignore` | `.gitignore` | The API key file is never committed to git. Even in a private repo, this is best practice -- git history is forever. |

**What this doesn't cover (production-grade):**

For a single-user app, the above is sufficient. If you were building this for many users, you'd also want:

| Enhancement | Tool | What it does |
|------------|------|-------------|
| Persistent rate limiting | Upstash Redis + `@upstash/ratelimit` | Rate limit state survives serverless cold starts and is shared across all function instances. Upstash has a free tier. Example: `new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, "60 s") })` |
| Authentication | NextAuth.js or Clerk | Only logged-in users can call the API. Prevents anonymous abuse entirely. |
| CORS restrictions | Next.js `next.config.ts` headers | Limits which domains can call your API. Prevents someone from embedding your endpoint in their own website. |
| Request signing | HMAC signature | Ensures API calls come from your own frontend, not a third party. |
| Spending limits | OpenAI dashboard | Set a monthly budget cap so a compromised key can't run up unlimited charges. |

**Action item:** Log into your OpenAI dashboard at https://platform.openai.com and set a monthly spending limit (e.g., $10). This is your last line of defense -- even if everything else fails, your bill is capped.

### Test checkpoint

Review the "Verify these are implemented" table above. All six measures should be in place. The spending limit on the OpenAI dashboard is the one manual action to take now.

---

## Step 5.9: Create a Receipt Context for Cross-Page State

### What to do

Create a React Context at `lib/receipt-context.tsx` that stores the parsed receipt data and the selected image file. This allows the upload page (`app/page.tsx`) to store the parsed receipt and the verify page (`app/verify/page.tsx`, built in Task #6) to read it.

**Create `lib/receipt-context.tsx`:**

```tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Receipt } from "@/types/receipt";

/**
 * Shape of the data available through the receipt context.
 *
 * Both the receipt and image start as null (nothing processed yet)
 * and get set after successful OCR + AI parsing on the upload page.
 */
interface ReceiptContextValue {
  receipt: Receipt | null;
  setReceipt: (receipt: Receipt | null) => void;
  receiptImage: File | null;
  setReceiptImage: (file: File | null) => void;
}

// Create the context with undefined as default. The useReceipt hook
// below checks for this and throws a helpful error if the provider
// is missing. This prevents confusing "undefined is not an object"
// errors at runtime.
const ReceiptContext = createContext<ReceiptContextValue | undefined>(
  undefined
);

/**
 * Provider component that wraps the app and holds receipt state.
 * Added to app/layout.tsx so every page can access the receipt data.
 */
export function ReceiptProvider({ children }: { children: ReactNode }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);

  // Build the context value object. Every component that calls
  // useReceipt() gets access to these four values.
  const contextValue: ReceiptContextValue = {
    receipt,
    setReceipt,
    receiptImage,
    setReceiptImage,
  };

  return (
    <ReceiptContext.Provider value={contextValue}>
      {children}
    </ReceiptContext.Provider>
  );
}

/**
 * Custom hook to access receipt data from any component.
 *
 * Usage:
 *   const { receipt, setReceipt } = useReceipt();
 *
 * Throws if called outside a ReceiptProvider -- this catches
 * the mistake at development time rather than causing cryptic
 * "cannot read property of undefined" errors.
 */
export function useReceipt(): ReceiptContextValue {
  const context = useContext(ReceiptContext);

  if (context === undefined) {
    throw new Error("useReceipt must be used within a ReceiptProvider");
  }

  return context;
}
```

**Modify `app/layout.tsx`:**

Import the `ReceiptProvider` and wrap `{children}` with it. The layout file can stay as a Server Component -- a Server Component can render a Client Component (the provider), it just can't use hooks itself:

```tsx
import { ReceiptProvider } from "@/lib/receipt-context";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReceiptProvider>{children}</ReceiptProvider>
      </body>
    </html>
  );
}
```

Keep any existing className, fonts, or metadata that are already in your layout file. Only add the `ReceiptProvider` import and wrapper -- don't remove anything that's already there.

### What is React Context?

In Express, if you need to share data across middleware functions in a request, you might attach it to `req` (like `req.user = authenticatedUser`). Any middleware later in the chain can read `req.user`. React Context solves the same problem for components: how do you share data across components that aren't directly connected by props?

Without Context, you'd have to pass the receipt data from `page.tsx` up to `layout.tsx` and then down to `verify/page.tsx` through props at every level. This is called **prop drilling** -- passing props through intermediate components that don't use them, just to get data to where it's needed. Context lets you skip the middle layers.

The pattern has three parts:

1. **`createContext`** -- creates a "channel" for broadcasting data
2. **Provider component** -- wraps a part of the component tree and "broadcasts" data to all descendants
3. **`useContext` hook** (wrapped in our `useReceipt` custom hook) -- any descendant component "tunes in" to receive the data

It's like a pub/sub system. The Provider publishes state changes, and any component using the hook subscribes to those changes. When `setReceipt` is called, every component that reads `receipt` from the context re-renders with the new data.

### What is a custom hook?

The `useReceipt` function is a **custom hook** -- a function that starts with `use` and calls other hooks internally (in this case, `useContext`). Custom hooks are React's way of extracting reusable logic. Instead of every component needing to import both `ReceiptContext` and `useContext`, they import one function: `useReceipt()`.

The error check inside `useReceipt` is especially valuable. If you forget to wrap your app with `ReceiptProvider`, you'd normally get `undefined` back from `useContext` and eventually see a confusing error like "Cannot read property 'receipt' of undefined." The explicit throw gives you a clear message: "useReceipt must be used within a ReceiptProvider." This pattern of guarding against missing providers is standard practice in React libraries.

### Test checkpoint

```bash
npm run build
```

Build should pass. Then start the dev server:

```bash
npm run dev
```

Open http://localhost:3000 and verify the page still works -- the context provider is invisible to the user but should not break existing functionality. Check the browser console for any errors about missing context or rendering issues. The upload and OCR flow from Task #4 should work exactly as before.

---

## Step 5.10: Wire Up the Frontend -- Auto-Parse After OCR

### What to do

Update `app/page.tsx` to:
1. Use the `useReceipt` context to store the parsed receipt and image
2. Automatically call the `/api/parse-receipt` endpoint after OCR completes
3. Replace the raw OCR text display with a structured result summary
4. Show a two-phase processing flow: OCR extraction, then AI parsing
5. Add a "Continue to Verify" link after parsing succeeds

**New imports:**

```typescript
import { useReceipt } from "@/lib/receipt-context";
import { Receipt } from "@/types/receipt";
import Link from "next/link";
```

**New state variables to add:**

```typescript
const [isParsing, setIsParsing] = useState<boolean>(false);
const [parseError, setParseError] = useState<string | null>(null);
```

The existing `ocrResult` state stays (you need the text to send to the API), but the `<pre>` block that displayed the raw text is removed.

**Get the context setters:**

```typescript
const { receipt, setReceipt, setReceiptImage } = useReceipt();
```

**Updated processing flow:**

The `handleProcess` function currently runs OCR and displays raw text. Change it to a two-phase flow -- OCR, then AI parsing:

```typescript
const handleProcess = async () => {
  // Reset all state for a fresh run
  setIsProcessing(true);
  setOcrError(null);
  setParseError(null);
  setOcrProgress(0);
  setReceipt(null);

  // --- Phase 1: OCR ---
  let ocrText: string;
  try {
    const result = await extractText(selectedFile!, (progress) => {
      setOcrProgress(progress);
    });
    ocrText = result.text;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "OCR failed";
    setOcrError(errorMessage);
    setIsProcessing(false);
    return; // Stop here if OCR fails -- don't call the API
  }

  // --- Phase 2: AI Parsing ---
  setIsParsing(true);
  try {
    const response = await fetch("/api/parse-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: ocrText }),
    });

    // fetch doesn't throw on HTTP errors (unlike axios) --
    // we have to check response.ok ourselves
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to parse receipt");
    }

    const parsedReceipt: Receipt = await response.json();

    // Store in context so the verify page can access it
    setReceipt(parsedReceipt);
    setReceiptImage(selectedFile!);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to parse receipt";
    setParseError(errorMessage);
  } finally {
    setIsProcessing(false);
    setIsParsing(false);
  }
};
```

**UI layout updates:**

The page should show these elements conditionally based on state:

| State | What to show |
|-------|-------------|
| No file selected | Upload area only (existing behavior) |
| File selected, idle | Upload area + preview + "Process Receipt" button |
| OCR in progress | Upload area + preview + progress bar + "Extracting text..." |
| AI parsing in progress | Upload area + preview + "Parsing receipt..." message |
| Parse complete (receipt in context) | Upload area + preview + parsed result summary + "Continue to Verify" link |
| OCR error | Upload area + preview + OCR error message + retry button |
| Parse error | Upload area + preview + parse error message + retry button |

**Parsed result summary:**

When parsing succeeds, replace the old raw text `<pre>` block with a summary card showing what was extracted. Use a shadcn `Card` component:

```tsx
{receipt && (
  <Card>
    <CardContent className="pt-6">
      <h3 className="font-semibold mb-2">Parsed Receipt</h3>
      <p>Store: {receipt.store ?? "Unknown"}</p>
      <p>Date: {receipt.date ?? "Unknown"}</p>
      <p>Items: {receipt.items.length} found</p>
      <p>Tax: ${receipt.tax.toFixed(2)}</p>
      <p>Total: ${receipt.total.toFixed(2)}</p>
    </CardContent>
  </Card>
)}
```

This is a brief confirmation that the AI parsed the receipt correctly. The detailed editing happens on the verify page (Task #6).

**"Continue to Verify" navigation:**

After the summary, add a link to the verify page:

```tsx
{receipt && (
  <Link href="/verify">
    <Button className="w-full">Continue to Verify</Button>
  </Link>
)}
```

The `Link` component is Next.js's client-side navigation -- it navigates without a full page reload, so the React Context state (the receipt) is preserved. If you used a regular `<a>` tag, the page would fully reload and the context state would be lost.

**"Parsing receipt..." indicator:**

While `isParsing` is true, show a message so the user knows something is happening after the progress bar completes:

```tsx
{isParsing && (
  <p className="text-muted-foreground text-center">
    Parsing receipt with AI...
  </p>
)}
```

This fills the gap between OCR completing and the API response arriving (typically 2-5 seconds).

**Parse error display:**

```tsx
{parseError && (
  <p className="text-destructive text-center">{parseError}</p>
)}
```

Use Tailwind's `text-destructive` class (from shadcn's theme) for red error text. The user can click "Process Receipt" again to retry both OCR and parsing.

### Concepts to understand

**The `fetch` API.** In Node.js/Express, you might use `axios` or `node-fetch` to make HTTP requests. Modern browsers (and Next.js) include `fetch` natively. It returns a Promise that resolves to a `Response` object. Unlike `axios`, **`fetch` doesn't throw on non-2xx status codes** -- it only throws on network failures (no internet, DNS errors). This is a common gotcha:

```typescript
const response = await fetch(url);

// This does NOT throw even if the server returned 500!
// You must check response.ok (true for 200-299, false otherwise)
if (!response.ok) {
  throw new Error("Request failed");
}
```

**Two-phase async operations.** The user sees a seamless flow (click button, wait, see results), but internally two separate async operations happen in sequence: OCR (runs in the browser) then AI parsing (calls your server, which calls OpenAI). If OCR fails, we bail out early with `return` and never call the API. If parsing fails, we show a different error. This pattern of chaining async operations with early returns is common in Express middleware chains:

```javascript
// Express equivalent pattern:
app.post("/process", async (req, res) => {
  const ocrResult = await runOcr(req.file);
  if (!ocrResult) return res.status(400).send("OCR failed");  // early return

  const parsed = await parseWithAi(ocrResult.text);
  if (!parsed) return res.status(500).send("Parsing failed");  // early return

  res.json(parsed);
});
```

**Client-side navigation with `Link`.** In a traditional web app, clicking a link sends a new HTTP request and the browser loads a fresh page from the server. All JavaScript state is lost. Next.js's `Link` component does client-side navigation instead -- it updates the URL, renders the new page's component, but keeps the React app running. This means React Context state survives navigation. It's similar to how single-page apps (SPAs) work with React Router, but Next.js handles the routing based on the file system.

### Test checkpoint

Start the dev server and test the full flow:

```bash
npm run dev
```

1. Open http://localhost:3000
2. Upload a receipt image -- preview appears
3. Click "Process Receipt" -- progress bar fills (OCR phase, 5-15 seconds)
4. See "Parsing receipt with AI..." (AI phase, 2-5 seconds)
5. See the parsed result summary: store name, date, item count, tax, total
6. See the "Continue to Verify" button
7. Click "Continue to Verify" -- navigates to `/verify` (the page won't have content yet -- that's Task #6, so you'll see a 404 or blank page, which is expected)
8. Test error cases: try processing a non-receipt image (photo of text or a blank image) to see how the AI handles ambiguous input
9. Check the browser's Network tab: the POST to `/api/parse-receipt` should show a 200 response with structured JSON containing store, date, items, tax, and total

Also check the terminal running `npm run dev` -- you should see `console.error` output only when errors occur, never during successful requests.

---

## Step 5.11: Final Verification

### What to do

**1. Run all tests:**

```bash
npm test
```

All tests should pass -- the OCR tests from Task #4 and the new API route tests from Step 5.4. You should see green output for both test suites.

**2. Production build check:**

```bash
npm run build
```

The build should complete with no TypeScript errors, no missing imports, and no warnings.

**3. Manual browser test:**

```bash
npm run dev
```

Open http://localhost:3000 and run through the full flow:

- Upload a receipt image -- preview appears
- Click "Process Receipt" -- progress bar fills (OCR), then "Parsing receipt with AI..." appears
- Parsed result summary shows store, date, item count, tax, total
- "Continue to Verify" button is present
- Try processing a non-receipt image (e.g., a random photo) -- the AI should still return something (it might guess or return nulls), and the app should handle it gracefully
- Check the browser's Network tab: the POST to `/api/parse-receipt` returns 200 with structured JSON

**4. Rate limiter test (optional):**

The rate limiter is hard to trigger manually because OCR takes 5-10 seconds per attempt. The unit tests cover this more reliably. If you want to test it manually, you can temporarily lower `MAX_REQUESTS` in `lib/rate-limit.ts` to 2, process a receipt three times, and see the 429 error. Remember to restore the value afterwards.

**5. File structure review:**

Your project should now look like this (new and modified files marked):

```
transaction-scanner/
├── app/
│   ├── layout.tsx                    <- modified (wrapped with ReceiptProvider)
│   ├── page.tsx                      <- modified (auto-parse, context, result display)
│   ├── globals.css
│   └── api/
│       └── parse-receipt/
│           ├── route.ts              ✦ new (API endpoint)
│           └── __tests__/
│               └── route.test.ts     ✦ new (unit tests)
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   └── progress.tsx
│   ├── receipt-uploader.tsx
│   └── receipt-preview.tsx
├── lib/
│   ├── ocr.ts
│   ├── openai.ts                     ✦ new (OpenAI client + parseReceiptText)
│   ├── rate-limit.ts                 ✦ new (in-memory sliding window rate limiter)
│   ├── receipt-context.tsx           ✦ new (React Context for cross-page state)
│   ├── schemas/
│   │   └── receipt.ts                ✦ new (Zod schema for AI response validation)
│   ├── __tests__/
│   │   └── ocr.test.ts
│   └── utils.ts
├── types/
│   └── receipt.ts
├── docs/
│   ├── DESIGN.md
│   └── tasks/
│       ├── TASK-1.md
│       ├── TASK-2.md
│       ├── TASK-3.md
│       ├── TASK-4.md
│       └── TASK-5.md
├── jest.config.ts
├── .env.local                        <- modified (real OPENAI_API_KEY added)
└── ...
```

### Test checkpoint

Both `npm test` and `npm run build` complete without errors. The manual browser flow works end-to-end: upload -> OCR -> AI parse -> see structured results -> navigate to verify page.

---

## Wrap-Up

### What you accomplished

- **`lib/schemas/receipt.ts`** -- a Zod schema defining the expected AI response shape, used with OpenAI's structured outputs to guarantee valid JSON
- **`lib/openai.ts`** -- OpenAI client initialization and a `parseReceiptText` function that sends OCR text to GPT-4o-mini, validates the response with Zod, and adds unique IDs to each item
- **`lib/rate-limit.ts`** -- an in-memory sliding window rate limiter that tracks requests per IP address and rejects with 429 when the limit is exceeded
- **`app/api/parse-receipt/route.ts`** -- a Next.js API route that validates input, checks rate limits, calls OpenAI, and returns sanitized responses
- **`app/api/parse-receipt/__tests__/route.test.ts`** -- unit tests covering successful parsing, input validation (missing text, text too long), missing API key, OpenAI failures, and rate limiting, with the OpenAI SDK mocked
- **`lib/receipt-context.tsx`** -- a React Context with Provider and custom hook for sharing receipt data and the receipt image across pages
- **`app/layout.tsx`** -- modified to wrap the app with `ReceiptProvider` so all pages can access receipt state
- **`app/page.tsx`** -- modified to automatically call the AI parsing API after OCR, display a structured result summary (replacing the raw text debug display), and navigate to the verify page

### Concepts you learned

| Concept | What it does |
|---------|-------------|
| Next.js API routes (App Router) | File-system based endpoints -- export a `POST` function from `route.ts` and it handles POST requests at that path |
| OpenAI structured outputs | Constrain GPT responses to match a Zod schema exactly, eliminating malformed JSON responses |
| Zod | TypeScript-first schema validation -- define a shape once, get runtime validation and compile-time types from the same source |
| `zodResponseFormat` | Bridge between Zod schemas and OpenAI's response format API -- enforces the schema at the AI level |
| Rate limiting (sliding window) | Track requests per IP in a time window, reject with HTTP 429 when the limit is exceeded |
| Error sanitization | Log full errors server-side for debugging, return only generic messages to clients to avoid leaking internals |
| Input validation | Check type, presence, and length of user input before processing -- defense in depth against malformed or malicious requests |
| React Context | Share state across components without prop drilling -- a Provider broadcasts data, `useContext` receives it |
| Custom hooks (`useReceipt`) | Convenience wrappers around `useContext` that provide better error messages and a cleaner API |
| `fetch` API | Browser-native HTTP client -- unlike `axios`, doesn't throw on non-2xx responses, so you must check `response.ok` |
| Client-side navigation (`Link`) | Next.js navigates without full page reloads, preserving React state (including Context) across page transitions |
| Environment variables in Next.js | `.env.local` values available server-side via `process.env` -- client-side access requires `NEXT_PUBLIC_` prefix, which we deliberately avoid for secrets |
| `crypto.randomUUID()` | Built-in Node.js 18+ function for generating UUID v4 strings -- no external `uuid` package needed |

### What's next

**Task #6: Verification and editing UI** -- you'll build the `/verify` page where the user sees the parsed receipt data alongside the original image and can edit any field (store, date, items, prices). The `Receipt` object you're now storing in React Context is exactly what the verify page will read with `useReceipt()`. You'll also build the `components/item-list.tsx` component for adding, removing, and editing line items, with auto-calculated totals.
