"use client";

import { useState } from "react";
import Link from "next/link";
import { ReceiptUploader } from "@/components/receipt-uploader";
import { ReceiptPreview } from "@/components/receipt-preview";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { extractText, OcrResult } from "@/lib/ocr";
import { useReceipt } from "@/lib/receipt-context";
import { Receipt } from "@/types/receipt";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Get shared state from the ReceiptProvider (set up in layout.tsx).
  // setReceipt/setReceiptImage write to Context so the verify page can read them.
  const { receipt, setReceipt, setReceiptImage } = useReceipt();

  const handleProcess = async () => {
    // Reset all state for a fresh run
    setIsProcessing(true);
    setOcrError(null);
    setParseError(null);
    setOcrResult(null);
    setOcrProgress(0);
    setReceipt(null);

    // --- Phase 1: OCR (runs in the browser) ---
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
      return; // Stop here if OCR fails — don't call the API
    }

    // --- Phase 2: AI Parsing (calls our server, which calls OpenAI) ---
    setIsParsing(true);
    try {
      const response = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ocrText }),
      });

      // fetch does NOT throw on HTTP errors (4xx, 5xx) — it only throws
      // on network failures. We must check response.ok ourselves.
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to parse receipt");
      }

      const parsedReceipt: Receipt = await response.json();

      // Store in shared Context so the verify page can access it
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

  const progressPercent = Math.round(ocrProgress * 100);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <h1 className="text-4xl font-bold">Receipt Scanner</h1>
        <ReceiptUploader onFileSelect={setSelectedFile} />
        <ReceiptPreview file={selectedFile} />

        {selectedFile && (
          <Button onClick={handleProcess} disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Process Receipt"}
          </Button>
        )}

        {isProcessing && (
          <div className="w-full flex flex-col gap-2">
            <Progress value={progressPercent} />
            <p className="text-sm text-muted-foreground text-center">
              Extracting text... {progressPercent}%
            </p>
          </div>
        )}

        {ocrError && (
          <p className="text-sm text-destructive">{ocrError}</p>
        )}

        {ocrResult && (
          <div className="w-full flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Confidence: {Math.round(ocrResult.confidence)}%
            </p>
            <pre className="w-full max-h-64 overflow-auto rounded-lg bg-muted p-4 text-sm">
              {ocrResult.text}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
