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
