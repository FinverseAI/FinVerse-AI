import assert from "node:assert/strict";
import test from "node:test";
import { readReceiptText } from "../lib/receipt-ocr.ts";

function fakeWorker(text, error = null) {
  const worker = {
    terminated: false,
    recognize: async () => {
      if (error) throw error;
      return { data: { text } };
    },
    terminate: async () => {
      worker.terminated = true;
    },
  };
  return worker;
}

test("returns the recognized text and terminates the worker", async () => {
  const worker = fakeWorker("COFFEE HOUSE\nLatte\nTOTAL Rs 250.00");
  const text = await readReceiptText(
    new Blob(["fake-image"]),
    async () => worker,
  );
  assert.equal(text, "COFFEE HOUSE\nLatte\nTOTAL Rs 250.00");
  assert.equal(worker.terminated, true);
});

test("terminates the worker even when recognition fails", async () => {
  const worker = fakeWorker("", new Error("OCR failed"));
  await assert.rejects(
    readReceiptText(new Blob(["fake-image"]), async () => worker),
    /OCR failed/,
  );
  assert.equal(worker.terminated, true);
});
