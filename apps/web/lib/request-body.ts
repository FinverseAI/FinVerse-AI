const MAX_JSON_BYTES = 64 * 1024;

export class RequestBodyError extends Error {}

export async function readRequestBody(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_JSON_BYTES) {
    throw new RequestBodyError(
      "This request is too large. Send at most 64 KB of JSON.",
    );
  }
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new RequestBodyError(
          "This request is too large. Send at most 64 KB of JSON.",
        );
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
