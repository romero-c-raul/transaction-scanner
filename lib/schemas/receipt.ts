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
