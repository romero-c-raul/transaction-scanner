# Task #2: Define TypeScript Types for Receipt Data

## Goal

Create the TypeScript interfaces that describe what a parsed receipt looks like. These types are the "data contract" for the entire app — every future task (OCR parsing, API responses, the verification UI, Excel export) will import and use them. Getting the shape right now means less refactoring later.

## Prerequisites

- **Task #1 complete** — you have a working Next.js project that passes `npm run build`
- Basic familiarity with TypeScript (you've used it in Node.js/Express)

---

## Step 2.1: Create the `types/` Directory and `receipt.ts` File

### What to do

Create a new file at `types/receipt.ts` in the project root (next to `app/`, `components/`, `lib/`). Add two exported interfaces:

```typescript
export interface ReceiptItem {
  id: string;        // unique identifier for list operations (add/remove in Task #6)
  name: string;      // item name, e.g. "Milk 2% Gallon"
  price: number;     // item price, e.g. 3.99
}

export interface Receipt {
  store: string | null;    // store name, null if OCR can't determine
  date: string | null;     // date in YYYY-MM-DD format, null if unknown
  items: ReceiptItem[];    // list of line items
  tax: number;             // tax amount
  total: number;           // total amount
}
```

### What are TypeScript interfaces?

If you've used Mongoose schemas in Express, interfaces are a similar idea — they define the **shape** of your data. The key difference: Mongoose schemas exist at runtime (they validate data when you save to MongoDB). TypeScript interfaces exist **only at compile time** — they're completely erased when your code is built into JavaScript. They don't add any runtime overhead; they're purely a tool for catching mistakes while you write code.

Here's what each concept does:

**`interface` vs `class`**: A class creates something you can `new` up — it exists at runtime. An interface just describes a shape. You can't write `new Receipt()`. Instead, you create plain objects that match the shape: `const r: Receipt = { store: "Walmart", ... }`. Interfaces are lighter — use them when you just need to describe data, not behavior.

**`string | null` (union types)**: The `|` means "or." `store: string | null` says the store can be a string like `"Walmart"` OR it can be `null`. Why not just `string`? Because OCR isn't perfect — sometimes it can't read the store name from a receipt image. By making it `string | null`, TypeScript forces you to handle the null case everywhere you use `store`. If you try to call `receipt.store.toUpperCase()` without checking for null first, TypeScript will show an error. This prevents the classic "Cannot read property of null" runtime crash.

**Why `null` instead of `undefined`?**: JavaScript has both `null` and `undefined`, which is confusing. We're using `null` deliberately because it matches the JSON format — when the OpenAI API (Task #5) returns parsed receipt data, missing values come back as `null`, not `undefined`. Using the same convention keeps things consistent.

**Why define types upfront?**: In a small Express app, you might get away with passing `req.body` around as untyped objects. But as an app grows, you lose track of what shape the data is. TypeScript interfaces act as documentation that the compiler enforces — if you rename `store` to `storeName` in the interface, every file that uses `receipt.store` will immediately show an error. You find the problem at build time, not when a user clicks a button.

### Test

```bash
npm run build
```

The build should complete with no errors. This confirms TypeScript can find and compile the new file. The `types/` directory is automatically included because `tsconfig.json` has `"include": ["**/*.ts", "**/*.tsx"]` — any `.ts` file in the project is compiled.

---

## Step 2.2: Verify Types Catch Mistakes

### What to do

This step is about understanding *how* TypeScript protects you — you won't keep the changes, just observe the behavior. Open `app/page.tsx` and temporarily add an import and a test object at the top of the component function:

```tsx
import { Receipt } from "@/types/receipt";

export default function Home() {
  // Temporary test — remove after this step
  const testReceipt: Receipt = {
    store: "Target",
    date: "2025-01-15",
    items: [
      { id: "1", name: "Milk", price: 3.99 },
      { id: "2", name: "Bread", price: 2.49 },
    ],
    tax: 0.52,
    total: 7.00,
  };

  console.log(testReceipt);

  return (
    // ... existing JSX stays the same
  );
}
```

This should compile fine. Now try introducing mistakes to see TypeScript catch them:

**Mistake 1: Wrong type for price**
```typescript
{ id: "1", name: "Milk", price: "3.99" }  // string instead of number
```
Your editor should underline `price: "3.99"` in red with an error like: `Type 'string' is not assignable to type 'number'`.

**Mistake 2: Missing required field**
```typescript
{ id: "1", name: "Milk" }  // missing price
```
Error: `Property 'price' is missing in type '{ id: string; name: string; }' but required in type 'ReceiptItem'`.

**Mistake 3: Assigning null to a non-nullable field**
```typescript
const testReceipt: Receipt = {
  store: "Target",
  date: "2025-01-15",
  items: [],
  tax: null,     // tax is `number`, not `number | null`
  total: 7.00,
};
```
Error: `Type 'null' is not assignable to type 'number'`. This is the value of being deliberate about which fields can be null — `store` and `date` can be null (OCR might fail to read them), but `tax` and `total` must always be numbers (the UI needs them for calculations).

After observing these errors, **remove the test code** and restore `page.tsx` to its original state. The point was to understand the safety net, not to leave test code in the file.

### Test

After removing the temporary test code:

```bash
npm run build
```

Build should pass clean — no errors, no warnings. This confirms you haven't left any broken code behind.

---

## Wrap-Up

### What you accomplished

- **`types/receipt.ts`** — two interfaces (`Receipt` and `ReceiptItem`) that define the data shape for the entire application
- Understood **interfaces vs classes**, **union types** (`string | null`), and why TypeScript's compile-time checks prevent runtime crashes

### What each field is for

| Field | Type | Why |
|-------|------|-----|
| `ReceiptItem.id` | `string` | Unique key for React list rendering and add/remove operations (Task #6) |
| `ReceiptItem.name` | `string` | Item description from the receipt |
| `ReceiptItem.price` | `number` | Item price — number, not string, so you can do math |
| `Receipt.store` | `string \| null` | Store name — null if OCR can't read it |
| `Receipt.date` | `string \| null` | Date in YYYY-MM-DD format — null if unreadable |
| `Receipt.items` | `ReceiptItem[]` | Array of line items |
| `Receipt.tax` | `number` | Tax amount — always a number (required for totals) |
| `Receipt.total` | `number` | Total amount — always a number |

### What's next

**Task #3: Upload image and preview** — you'll build a component that lets the user select a receipt image and see a preview. The `Receipt` type you just created will be used to type the state that holds the parsed receipt data once OCR processes the image.

### Optional further reading

- [TypeScript Handbook: Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html) — the official guide to interfaces
- [TypeScript Handbook: Union Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) — more on the `|` syntax
- [TypeScript Handbook: Type vs Interface](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces) — when to use `type` vs `interface`
