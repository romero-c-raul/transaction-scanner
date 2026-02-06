# Task #1: Initialize Next.js 15 + TypeScript + Tailwind + shadcn/ui

## Goal

Set up the project foundation: a working Next.js 15 app with TypeScript, Tailwind CSS, and shadcn/ui components. By the end, you'll have a running dev server, a clean project structure, and the UI building blocks ready for future tasks.

## Prerequisites

- **Node.js 18+** installed (`node -v` to check)
- **npm** installed (comes with Node.js)
- A code editor (VS Code recommended)
- This repository already cloned (it has `.git` and `DESIGN.md`)

## A Note on Dependencies

DESIGN.md lists installing all dependencies in Task #1 (tesseract.js, openai, xlsx, browser-image-compression). **We're deviating from that.** Each library will be installed in the task that actually uses it — tesseract.js in Task #4, openai in Task #5, xlsx in Task #7, and browser-image-compression in Task #3. This keeps each task focused and avoids installing things you don't yet understand.

---

## Step 1.1: Create the Next.js Project

### What to do

Run the following command **inside the existing project directory** (the one that already has `.git` and `DESIGN.md`):

```bash
npx create-next-app@latest .
```

When prompted, select these options:

| Prompt | Answer |
|--------|--------|
| TypeScript? | **Yes** |
| ESLint? | **Yes** |
| Tailwind CSS? | **Yes** |
| `src/` directory? | **No** |
| App Router? | **Yes** |
| Import alias? | **Default (`@/*`)** |

The `.` means "create the project in the current directory" instead of making a new folder.

### What is Next.js?

If you know Express, you're halfway there. Next.js is a **full-stack framework** built on top of React. Like Express, it handles routing and API endpoints. Unlike Express, it *also* handles the frontend UI — the HTML, CSS, and interactive elements that users see in the browser.

The key concept is the **App Router**: your folder structure *is* your URL structure. A file at `app/page.tsx` serves the `/` route. A file at `app/verify/page.tsx` serves `/verify`. If you've ever set up `app.get('/verify', handler)` in Express, this is the same idea — but defined by where the file lives instead of explicit route definitions.

### What is React?

React is a library for building UIs out of reusable **components** — functions that return HTML-like syntax. Instead of templating engines like EJS or Handlebars, you write your UI directly in JavaScript/TypeScript using a syntax called JSX. A component might look like a function that returns `<div>Hello</div>`. You compose small components into bigger ones, like LEGO blocks. Next.js is built on React, so every page you create is a React component.

### Test

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see the **default Next.js welcome page** — a page with the Next.js logo and some links. If you see it, the project was created correctly. Stop the dev server with `Ctrl+C`.

---

## Step 1.2: Explore the Generated Project Structure

### What to do

No commands to run — just open the project in your editor and read through what `create-next-app` generated. Here are the key files and what each one does:

| File/Folder | Purpose |
|-------------|---------|
| `app/layout.tsx` | The **root layout** — a wrapper that surrounds every page. Think of it like a shared HTML template. It includes the `<html>` and `<body>` tags, loads fonts, and wraps your page content. Every page renders *inside* this layout. |
| `app/page.tsx` | The **homepage** — the content you see when you visit `/`. This is where the Next.js welcome content lives right now. |
| `app/globals.css` | Global CSS styles. Tailwind's base utilities are imported here. |
| `package.json` | Same as any Node.js project — lists dependencies, scripts (`dev`, `build`, `start`), project metadata. |
| `tailwind.config.ts` | Tailwind CSS configuration. Tells Tailwind which files to scan for class names. |
| `tsconfig.json` | TypeScript configuration — you've seen this in Node.js projects. Defines compiler settings, path aliases (`@/*`). |
| `next.config.ts` | Next.js framework settings. Mostly empty for now. |
| `public/` | Static files served as-is at the root URL. `public/favicon.ico` becomes available at `/favicon.ico`. This is like Express's `express.static('public')`. |

### What is TSX?

You'll notice files ending in `.tsx` instead of `.ts`. TSX is TypeScript + JSX. **JSX** lets you write HTML-like syntax directly in your TypeScript code:

```tsx
<div className="text-lg">Hello</div>
```

This is *not* a string — it's a syntax extension that gets compiled to function calls. The key difference from HTML: you use `className` instead of `class` (because `class` is a reserved word in JavaScript). Files that contain JSX use the `.tsx` extension; files that don't (like utility functions) use `.ts`.

### What is Tailwind CSS?

In traditional CSS, you'd write styles in a separate file: `color: blue; padding: 16px; font-size: 18px;`. With Tailwind, you apply **utility classes** directly on your elements: `className="text-blue-500 p-4 text-lg"`. Each class does exactly one thing. It feels verbose at first, but it means you almost never need to write or manage separate CSS files. The class names follow a consistent pattern — `p-4` is padding, `m-4` is margin, `text-` prefix is for text properties, `bg-` is for backgrounds.

### Test (Checkpoint)

Can you identify which file controls what appears on the homepage? (Answer: `app/page.tsx`)

---

## Step 1.3: Initialize shadcn/ui

### What to do

Run:

```bash
npx shadcn@latest init
```

It will ask about style/color preferences — the **defaults are fine**, just press Enter through the prompts. This sets up the shadcn/ui system in your project.

### What is shadcn/ui?

Here's what makes shadcn/ui unusual: it is **not a typical npm package**. When you use a library like Express, the code lives in `node_modules/` and you import from it. With shadcn/ui, the CLI **copies actual component source code into your project** — into a `components/ui/` directory. You own that code. You can open it, read it, modify it.

This is intentional: it gives you full control over every component. There's no hidden behavior locked inside `node_modules`. If a button doesn't look right, you open `components/ui/button.tsx` and change it directly.

### What it creates

- **`components.json`** — Configuration file that tells the shadcn CLI where to put components, what styling approach to use, etc.
- **`lib/utils.ts`** — A small utility function (`cn()`) for combining CSS class names. You'll see it used inside every shadcn component.

### Test

Verify these files exist at the expected locations:

- `components.json` (project root)
- `lib/utils.ts`

---

## Step 1.4: Add shadcn/ui Components

### What to do

Install the specific UI components we'll need throughout the app:

```bash
npx shadcn@latest add button input card table
```

This copies four component files into your `components/ui/` directory (and any sub-dependencies they need, like styling primitives).

### What are these components?

Each component is a `.tsx` file — a React component you can import and use. Open one (like `button.tsx`) and read through it. It's not a black box; it's regular React code with Tailwind classes for styling. These are the pre-built UI building blocks we'll use when constructing pages:

- **Button** — clickable actions ("Process Receipt", "Export to Excel")
- **Input** — text fields for editing (store name, item names)
- **Card** — container with a border/shadow for grouping content
- **Table** — structured rows and columns (for the items list)

### Test

Verify these files exist:

- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/card.tsx`
- `components/ui/table.tsx`

---

## Step 1.5: Create the `.env.local` Template

### What to do

Create a file called `.env.local` at the project root with this content:

```
OPENAI_API_KEY=your_key_here
```

### What is `.env.local`?

If you've used `dotenv` in Node.js, this is the same idea — but **built into Next.js**. You don't need to install anything or call `config()`. Next.js automatically loads `.env.local` when the dev server starts.

Important security detail: variables in `.env.local` are **server-side only** by default. Your React components running in the browser cannot access them. To expose a variable to the browser, you'd prefix it with `NEXT_PUBLIC_` — but we specifically do NOT want that for API keys. The OpenAI key stays on the server, hidden from anyone viewing your site.

The `.gitignore` file that `create-next-app` generated already excludes `.env.local`, so it will never be committed to git.

You don't need an actual OpenAI API key until Task #5. This step is just setting up the template so it's ready.

### Test

```bash
git status
```

`.env.local` should **not** appear in the output. It's gitignored, so git doesn't track it. If it does appear, check that `.env*.local` is listed in your `.gitignore`.

---

## Step 1.6: Clean Up the Default Page

### What to do

Replace the boilerplate content in `app/page.tsx` with a minimal placeholder. The page should:

- Display a heading that says "Receipt Scanner"
- Include a shadcn `Button` component (imported from `components/ui/button`)
- Use a few Tailwind classes for basic centering and spacing (e.g., centering the content on the page, adding some padding)

The exact code isn't important — the LLM will write it. What matters is understanding the **pattern** in what it produces:

1. **Importing a component**: `import { Button } from "@/components/ui/button"` — the `@/` alias points to your project root (set up in `tsconfig.json`).
2. **Writing JSX**: The function returns HTML-like markup. Tags, attributes, nesting — it looks like HTML but it's JavaScript.
3. **Applying Tailwind classes**: `className="flex min-h-screen items-center justify-center"` — each class applies one CSS property.

### Test

```bash
npm run dev
```

Open http://localhost:3000. You should see **"Receipt Scanner" with a button** instead of the default Next.js welcome page. The page should look clean and centered.

---

## Step 1.7: Final Verification

### What to do

Run these two commands to verify everything is set up correctly:

**1. Dev server check:**

```bash
npm run dev
```

Visit http://localhost:3000 — the page should load without errors. Check the terminal output for any warnings or errors. Stop with `Ctrl+C`.

**2. Production build check:**

```bash
npm run build
```

This compiles the entire project as if you were deploying it. It will catch TypeScript errors, missing imports, and other issues that the dev server might not flag. The output should show all green checkmarks with no red error text.

**3. File structure review:**

Your project should now have a structure that looks like the beginning of what DESIGN.md section 6 outlines:

```
transaction-scanner/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── table.tsx
├── lib/
│   └── utils.ts
├── public/
├── .env.local
├── components.json
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── DESIGN.md
└── tasks/
    └── TASK-1.md
```

Files from later tasks (`types/receipt.ts`, `components/receipt-uploader.tsx`, `lib/ocr.ts`, `app/api/`, etc.) don't exist yet — that's expected.

### Test

Both `npm run dev` and `npm run build` complete without errors.

---

## Wrap-Up

### What you accomplished

- **Next.js 15** project initialized with TypeScript, Tailwind CSS, and the App Router
- **shadcn/ui** set up with four core components (button, input, card, table) copied into your project
- **Environment template** ready for the OpenAI API key (used in Task #5)
- **Default boilerplate replaced** with a minimal placeholder page
- **Production build passing** — the foundation is solid

### What each piece does

| Piece | Role |
|-------|------|
| Next.js | Full-stack framework — handles routing, pages, and API endpoints |
| TypeScript | Type safety — catches bugs at compile time, improves editor autocomplete |
| Tailwind CSS | Styling — utility classes applied directly to elements, no separate CSS files |
| shadcn/ui | UI components — pre-built buttons, inputs, cards, tables that you own and can modify |
| App Router | File-based routing — folder structure defines URL paths |

### What's next

**Task #2: Create TypeScript types** — defining the data shapes (interfaces) that the app will use. If you've used TypeScript in Node.js, this will feel familiar. You'll create types for `Receipt` and `ReceiptItem` that describe what a parsed receipt looks like.

### Optional further reading

- [Next.js documentation](https://nextjs.org/docs) — start with "Getting Started"
- [Tailwind CSS documentation](https://tailwindcss.com/docs) — browse the utility class reference
- [shadcn/ui documentation](https://ui.shadcn.com) — see all available components
- [React tutorial](https://react.dev/learn) — the official "Learn React" guide
