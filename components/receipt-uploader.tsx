"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const VALID_TYPES = ["image/jpeg", "image/png"];

interface ReceiptUploaderProps {
  onFileSelect: (file: File) => void;
}

export function ReceiptUploader({ onFileSelect }: ReceiptUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = "";

    if (!VALID_TYPES.includes(file.type)) {
      setError("Please select a JPG or PNG image");
      return;
    }

    setError(null);
    onFileSelect(file);
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload />
          Upload Image
        </Button>

        <p className="text-sm text-muted-foreground">
          Supported formats: JPG, PNG
        </p>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
