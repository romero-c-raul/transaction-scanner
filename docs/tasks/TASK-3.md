# Task #3: Upload Image and Preview

## Goal

Build the upload screen — a file picker and image preview. This is the first real UI feature: the user picks a receipt image from their phone or computer, the app validates it's a supported format, and displays a preview. By the end, you'll have two reusable React components wired together through a shared piece of state.

## Prerequisites

- **Task #2 complete** — types exist in `types/receipt.ts`, project passes `npm run build`
- You've read through `app/page.tsx` and understand the placeholder page from Task #1

## A Note on Scope

DESIGN.md's Task #3 description includes drag & drop, camera capture, image compression, and a state management decision. **We're simplifying.** Here's what changed and why:

| DESIGN.md item | Decision | Reason |
|----------------|----------|--------|
| Drag & drop | **Removed** | The primary user is on mobile, where drag & drop doesn't apply. The file picker covers the use case. Can be added as polish in Task #8. |
| Camera capture | **Removed** | On mobile, the file picker already opens the gallery *and* camera — no extra code needed. Adding a separate camera button adds complexity with no real benefit. |
| Image compression (`browser-image-compression`) | **Deferred to Task #4** | Compression only matters for OCR performance. Keep this task focused on upload and preview. |
| State management decision (Context vs Zustand) | **Deferred entirely** | Cross-page state isn't needed until Task #5/6 when data flows to the verify page. For now, plain `useState` in the page component is all we need. |
| "Process Receipt" button | **Deferred to Task #4** | That button triggers OCR, which is Task #4's concern. This task ends at "image is visible on screen." |

The result: Task #3 is focused on one thing — **pick a file, validate it, show a preview**. Simple, testable, and done.

---

## Step 3.1: Build `components/receipt-uploader.tsx`

### What to build

A React component with a file input (`<input type="file" accept="image/*">`) that lets the user pick an image. When they select a valid file (JPG or PNG), the component calls a callback prop to notify the parent. If the file isn't a valid image, it shows an error message.

**UI details:**
- Wrap the upload area in a shadcn `Card` component for visual structure
- Use a shadcn `Button` as the upload trigger (not the browser's default file input, which is ugly and inconsistent across browsers)
- Show a short instruction like "Supported formats: JPG, PNG"
- If the user picks an invalid file, display an error message below the button (e.g., "Please select a JPG or PNG image")

**Props:**
- `onFileSelect: (file: File) => void` — a callback the parent provides. When the user picks a valid file, call this function with the `File` object.

### Concepts to understand

**React functional components with props.** In Express, middleware receives `(req, res, next)` — arguments that Express passes in. React components are similar: they're functions that receive a single `props` object containing whatever the parent passes. You define a TypeScript interface for the props, and the component destructures what it needs:

```tsx
interface ReceiptUploaderProps {
  onFileSelect: (file: File) => void;
}

export function ReceiptUploader({ onFileSelect }: ReceiptUploaderProps) {
  return ( /* JSX here */ );
}
```

**The callback props pattern.** Notice that `onFileSelect` is a *function* passed as a prop. This is how child components communicate with parents in React. The child doesn't know what happens when a file is selected — it just calls the function. The parent decides what to do (in our case: store the file in state). This is similar to Express event emitters or callback patterns you've seen in Node.js.

**Event handling in React.** In HTML, you'd write `<input onchange="handleChange()">`. In React, it's `<input onChange={handleChange} />` — camelCase, and you pass the function itself (not a string). The handler receives an event object, and for file inputs, the selected file lives at `event.target.files[0]`.

**The File API.** When a user picks a file through `<input type="file">`, the browser creates a `File` object. This is a built-in browser API (not a Node.js thing). A `File` has properties like `name`, `size`, `type` (e.g., `"image/jpeg"`), and it represents the file's data in memory. We'll use the `type` property for validation and pass the whole `File` object to the parent.

**Hidden file input pattern.** The browser's default `<input type="file">` looks different on every browser and can't be styled easily. The standard workaround: hide the input with CSS, create a ref to it with `useRef`, and when the user clicks your styled `Button`, programmatically call `inputRef.current.click()` to open the file picker. The input is invisible but still functional.

```tsx
const fileInputRef = useRef<HTMLInputElement>(null);

// In JSX:
<input ref={fileInputRef} type="file" className="hidden" onChange={handleChange} />
<Button onClick={() => fileInputRef.current?.click()}>Upload Image</Button>
```

`useRef` creates a reference — a way to "point at" a DOM element so you can interact with it directly. Think of it like `document.getElementById()` but integrated into React's system.

### Validation logic

Check the file's MIME type against the accepted formats:

```typescript
const validTypes = ["image/jpeg", "image/png"];
if (!validTypes.includes(file.type)) {
  // Show error, don't call onFileSelect
}
```

Use a piece of local state (`useState<string | null>(null)`) to hold the error message. Set it when validation fails, clear it when a valid file is selected.

### Test checkpoint

- Component renders with a visible upload button inside a card
- Clicking the button opens the browser's file picker
- Selecting a valid JPG/PNG triggers the `onFileSelect` callback with the File object
- Selecting an invalid file (e.g., a `.txt` or `.pdf`) shows an error message
- The error clears when a valid file is subsequently selected

---

## Step 3.2: Build `components/receipt-preview.tsx`

### What to build

A component that receives a `File | null` and displays the image as a preview. When no file is selected, it shows nothing (or a subtle placeholder). When a file exists, it renders the image.

**Props:**
- `file: File | null` — the file to preview, or `null` if nothing is selected yet

### Concepts to understand

**Conditional rendering.** In React, you control what appears on screen using JavaScript expressions inside JSX. The most common pattern is the `&&` operator:

```tsx
{file && <img src={previewUrl} alt="Receipt preview" />}
```

This reads as: "if `file` is truthy, render the `<img>`." If `file` is `null`, nothing renders — React skips it entirely. This is different from hiding an element with CSS (`display: none`). With conditional rendering, the element doesn't exist in the page at all until the condition is met.

**`URL.createObjectURL` and object URLs.** You can't just set `<img src={file}>` — the `File` object isn't a URL. You need to convert it into something the browser can display. `URL.createObjectURL(file)` creates a temporary URL (like `blob:http://localhost:3000/abc-123`) that points to the file's data in memory. This URL works as an `<img src>` value.

```typescript
const previewUrl = URL.createObjectURL(file);
// previewUrl is something like "blob:http://localhost:3000/3a4b5c6d..."
```

**Cleanup with `useEffect`.** Object URLs consume memory. When the component unmounts (disappears from the page) or the file changes, you should release the old URL with `URL.revokeObjectURL()`. This is what `useEffect`'s cleanup function is for:

```tsx
useEffect(() => {
  if (!file) return;
  const url = URL.createObjectURL(file);
  setPreviewUrl(url);

  return () => {
    URL.revokeObjectURL(url);
  };
}, [file]);
```

The function returned from `useEffect` (the `return () => { ... }` part) runs when the component unmounts or before the effect re-runs with a new `file`. Think of it like closing a database connection when you're done — you acquired a resource (the object URL), so you clean it up when it's no longer needed. The `[file]` at the end is the dependency array — this effect only re-runs when `file` changes.

**The `<img>` element with dynamic `src`.** Once you have a preview URL, rendering is straightforward:

```tsx
<img src={previewUrl} alt="Receipt preview" className="max-w-full rounded-lg" />
```

The `alt` attribute is for accessibility (screen readers) and shows as fallback text if the image fails to load. Tailwind classes handle sizing — `max-w-full` ensures the image doesn't overflow its container.

### Test checkpoint

- When `file` is `null`, nothing (or a placeholder) is shown
- When `file` is a valid image File, the image displays as a preview
- Selecting a different file updates the preview to the new image
- No memory leak warnings in the browser console (object URLs are cleaned up)

---

## Step 3.3: Update `app/page.tsx` — Compose the Upload Screen

### What to do

Replace the Task #1 placeholder page with the actual upload screen. Import both components, wire them together with state, and lay them out on the page.

### Concepts to understand

**`useState` hook.** React components need a way to remember things between renders — like which file the user selected. `useState` gives you a value and a function to update it:

```tsx
const [selectedFile, setSelectedFile] = useState<File | null>(null);
```

Think of it as a variable that React *watches*. When you call `setSelectedFile(someFile)`, React re-renders the component with the new value. This is fundamentally different from a regular `let` variable — a `let` would reset to its initial value on every render. `useState` persists across renders.

The `<File | null>` part is a TypeScript generic — it tells TypeScript what type of value this state holds. Starting with `null` means "no file selected yet."

**Lifting state up.** Why does the *page* hold the state instead of the uploader component? Because two components need access to the same data — `ReceiptUploader` needs to *set* the file, and `ReceiptPreview` needs to *read* the file. When siblings need to share data, you "lift" the state up to their common parent:

```
page.tsx (holds selectedFile state)
├── ReceiptUploader (receives setSelectedFile as onFileSelect prop)
└── ReceiptPreview (receives selectedFile as file prop)
```

The parent passes the state down as props. This is a core React pattern — data flows down from parent to children.

**Component composition.** You're building a page from smaller, focused pieces. Each component has a single job: `ReceiptUploader` handles file selection, `ReceiptPreview` handles display. The page composes them together. This is like Express middleware chains — each middleware does one thing, and you compose them into a route.

**The `"use client"` directive.** By default, Next.js components are **Server Components** — they run on the server and send static HTML to the browser. But our page needs interactivity: file inputs, state changes, event handlers. These require a **Client Component**, which runs in the browser. Adding `"use client"` at the top of the file tells Next.js to send this component to the browser as JavaScript.

```tsx
"use client";

import { useState } from "react";
// ... rest of the component
```

When do you need `"use client"`? Whenever a component uses hooks (`useState`, `useEffect`, `useRef`), event handlers (`onClick`, `onChange`), or browser APIs (`File`, `URL.createObjectURL`). Our page uses all of these, so it must be a Client Component.

### Layout

Use Tailwind classes for a centered, mobile-friendly layout:
- Center content on the page with reasonable max-width
- Stack the uploader and preview vertically with spacing
- Add a heading ("Receipt Scanner" or "Upload Receipt")
- Keep it simple — this is a single-purpose screen

### Test checkpoint

- Full flow works: open the page, click the upload button, pick an image file, see the preview appear
- Pick a different file — the preview updates
- Pick an invalid file — error message appears, no preview shown
- The page looks reasonable on both desktop and mobile-width browser windows

---

## Step 3.4: Final Verification

### What to do

**1. Production build check:**

```bash
npm run build
```

The build should complete with no TypeScript errors, no missing imports, and no warnings. This catches issues the dev server might miss.

**2. Manual browser test:**

```bash
npm run dev
```

Open http://localhost:3000 and test the full flow:
- Page loads with the upload UI (card with button)
- Click the upload button — file picker opens
- Select a JPG or PNG image — preview appears below/beside the upload area
- Select a non-image file — error message appears, no preview
- Select a different valid image — preview updates to the new image

**3. File structure review:**

Your project should now look like this (new files marked with ✦):

```
transaction-scanner/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              ← modified
│   └── globals.css
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── table.tsx
│   ├── receipt-uploader.tsx  ✦ new
│   └── receipt-preview.tsx   ✦ new
├── types/
│   └── receipt.ts
├── lib/
│   └── utils.ts
├── docs/
│   ├── DESIGN.md
│   └── tasks/
│       ├── TASK-1.md
│       ├── TASK-2.md
│       └── TASK-3.md
└── ...
```

---

## Wrap-Up

### What you accomplished

- **`components/receipt-uploader.tsx`** — a file picker component with validation (JPG/PNG only) and a clean UI using shadcn Card and Button
- **`components/receipt-preview.tsx`** — an image preview component using object URLs with proper cleanup
- **`app/page.tsx`** — the upload screen, composing both components with shared state via `useState`

### Concepts you learned

| Concept | What it does |
|---------|-------------|
| React functional components | Functions that return UI, receive props from their parent |
| TypeScript props interface | Defines the contract between parent and child components |
| `useState` hook | Gives components memory that persists across renders |
| `useEffect` cleanup | Runs code when a component unmounts or dependencies change (like closing a resource) |
| `useRef` | Creates a reference to a DOM element for direct interaction |
| Lifting state up | Moving shared state to the nearest common parent |
| Component composition | Building complex UIs from small, focused pieces |
| `"use client"` directive | Marks a component as interactive (runs in the browser, not on the server) |
| File API | Browser API for working with user-selected files |
| `URL.createObjectURL` | Creates a temporary URL from in-memory data for display |
| Conditional rendering | Showing/hiding UI elements based on state |
| Callback props | Child components notifying parents about events |

### What's next

**Task #4: OCR text extraction** — you'll add a "Process Receipt" button to the upload screen, install Tesseract.js, and extract text from the uploaded image. The `File` object you're already capturing in state is exactly what Tesseract needs as input.
