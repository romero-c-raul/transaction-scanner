"use client";

import { useState, useEffect } from "react";

interface ReceiptPreviewProps {
  file: File | null;
}

export function ReceiptPreview({ file }: ReceiptPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!previewUrl) return null;

  return (
    <img
      src={previewUrl}
      alt="Receipt preview"
      className="max-w-full rounded-lg"
    />
  );
}
