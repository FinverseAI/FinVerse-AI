/**
 * Receipt reading, fully in the browser: the photo is passed to
 * Tesseract.js locally and the recognized text comes back — the image
 * is never uploaded anywhere and nothing is stored server-side. The
 * library loads on demand so it never joins the dashboard's initial
 * bundle.
 *
 * The worker factory is injectable so tests can pass a fake worker;
 * production passes nothing and gets the real Tesseract worker.
 */

export type OcrWorker = {
  recognize: (image: Blob) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<unknown>;
};

export type OcrWorkerFactory = (language: string) => Promise<OcrWorker>;

async function defaultCreateWorker(language: string): Promise<OcrWorker> {
  const { createWorker } = await import("tesseract.js");
  return (await createWorker(language)) as unknown as OcrWorker;
}

/** Read the text off a receipt photo. The worker is always terminated, even on failure. */
export async function readReceiptText(
  image: Blob,
  createWorkerFn: OcrWorkerFactory = defaultCreateWorker,
): Promise<string> {
  const worker = await createWorkerFn("eng");
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
