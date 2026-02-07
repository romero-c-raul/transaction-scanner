import { extractText } from "@/lib/ocr";

// --- Mock setup (coupled to Tesseract.js internals) ---

const mockRecognize = jest.fn();
const mockTerminate = jest.fn();

jest.mock("tesseract.js", () => ({
  createWorker: jest.fn(() =>
    Promise.resolve({
      recognize: mockRecognize,
      terminate: mockTerminate,
    })
  ),
}));

// --- Tests (behavioral — assert on caller-observable outcomes) ---

describe("extractText", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns text and confidence from a valid image", async () => {
    mockRecognize.mockResolvedValue({
      data: { text: "WALMART\nMilk $3.99\nTotal $3.99", confidence: 92 },
    });

    const file = new File(["fake image data"], "receipt.jpg", {
      type: "image/jpeg",
    });

    const result = await extractText(file);

    expect(result).toEqual({
      text: "WALMART\nMilk $3.99\nTotal $3.99",
      confidence: 92,
    });
  });

  it("throws an error when OCR fails", async () => {
    mockRecognize.mockRejectedValue(new Error("Image processing failed"));

    const file = new File(["not a real image"], "bad.txt", {
      type: "text/plain",
    });

    await expect(extractText(file)).rejects.toThrow();
  });

  it("calls onProgress with a value between 0 and 1", async () => {
    const { createWorker } = require("tesseract.js");

    (createWorker as jest.Mock).mockImplementation(
      (_lang: string, _oem: number, options: { logger: (info: { status: string; progress: number }) => void }) => {
        const logger = options?.logger;

        return Promise.resolve({
          recognize: jest.fn(() => {
            if (logger) {
              logger({ status: "recognizing text", progress: 0.5 });
            }
            return Promise.resolve({
              data: { text: "some text", confidence: 88 },
            });
          }),
          terminate: jest.fn(),
        });
      }
    );

    const onProgress = jest.fn();
    const file = new File(["fake image data"], "receipt.png", {
      type: "image/png",
    });

    await extractText(file, onProgress);

    expect(onProgress).toHaveBeenCalled();

    const progressValue = onProgress.mock.calls[0][0];
    expect(progressValue).toBeGreaterThanOrEqual(0);
    expect(progressValue).toBeLessThanOrEqual(1);
  });
});
