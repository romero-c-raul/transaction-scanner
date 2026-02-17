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
