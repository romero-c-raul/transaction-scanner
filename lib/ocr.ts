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
  const worker = await createWorker("eng", 1, {
    logger: (info: { status: string; progress: number }) => {
      if (info.status === "recognizing text" && onProgress) {
        onProgress(info.progress);
      }
    },
  });

  try {
    const { data } = await worker.recognize(file);
    return { text: data.text, confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}
