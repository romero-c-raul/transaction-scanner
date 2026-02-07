import { createWorker } from "tesseract.js";

export interface OcrResult {
  text: string;
  confidence: number;
}

export type OcrProgressCallback = (progress: number) => void;

export async function extractText(
  file: File,
  onProgress?: OcrProgressCallback
): Promise<OcrResult> {
  const logger = (info: { status: string; progress: number }) => {
    if (info.status === "recognizing text" && onProgress) {
      onProgress(info.progress);
    }
  };

  const worker = await createWorker("eng", 1, { logger });

  try {
    const { data } = await worker.recognize(file);
    return { text: data.text, confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}
