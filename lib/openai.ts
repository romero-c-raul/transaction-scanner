import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { ReceiptSchema } from "@/lib/schemas/receipt";
import { Receipt } from "@/types/receipt";

// The SDK reads the API key from process.env.OPENAI_API_KEY automatically,
// but we pass it explicitly for clarity. This file only runs on the server
// (imported by the API route), so process.env access is safe.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function parseReceiptText(ocrText: string): Promise<Receipt> {
  // 1. Call OpenAI with structured output -- the Zod schema guarantees
  //    the response matches ReceiptSchema exactly
  // In OpenAI SDK v6, .parse() lives on openai.chat.completions (not beta).
  // TASK-5.md references openai.beta.chat.completions.parse() which was
  // the v4 location -- the SDK moved it to the main namespace in v6.
  const completion = await openai.chat.completions.parse({
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
