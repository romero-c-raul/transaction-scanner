"use client";

import { useState } from "react";
import { ReceiptUploader } from "@/components/receipt-uploader";
import { ReceiptPreview } from "@/components/receipt-preview";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <h1 className="text-4xl font-bold">Receipt Scanner</h1>
        <ReceiptUploader onFileSelect={setSelectedFile} />
        <ReceiptPreview file={selectedFile} />
      </div>
    </div>
  );
}
