/**
 * Pure text chunking for the RAG pipeline: long text is split into
 * embedding-sized pieces that respect sentence boundaries, with a small
 * overlap so a fact straddling a boundary is not lost.
 *
 * The embedding model (bge-base-en-v1.5) takes at most 512 tokens per
 * input, so chunks are capped well under that in characters — 500 chars
 * is roughly 100–125 tokens, leaving generous headroom for any input.
 */

export const DEFAULT_CHUNK_MAX_CHARS = 500;
export const DEFAULT_CHUNK_OVERLAP_CHARS = 50;

export interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
}

/** Split into sentences, hard-splitting any sentence over the cap. */
function splitSentences(text: string, maxChars: number): string[] {
  const raw = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const sentences: string[] = [];
  for (const sentence of raw) {
    if (sentence.length <= maxChars) {
      sentences.push(sentence);
      continue;
    }
    // One long sentence: pack its words, hard-splitting a single word
    // that is itself longer than the cap.
    let current = '';
    for (const word of sentence.split(' ')) {
      if (word.length > maxChars) {
        if (current) {
          sentences.push(current);
          current = '';
        }
        for (let i = 0; i < word.length; i += maxChars) {
          sentences.push(word.slice(i, i + maxChars));
        }
        continue;
      }
      if (!current) {
        current = word;
        continue;
      }
      if (current.length + 1 + word.length <= maxChars) {
        current += ` ${word}`;
      } else {
        sentences.push(current);
        current = word;
      }
    }
    if (current) sentences.push(current);
  }
  return sentences;
}

/** The tail of a chunk, cut at a word boundary, for the next chunk. */
function overlapTail(text: string, chars: number): string {
  if (chars <= 0 || text.length <= chars) return '';
  const tail = text.slice(-chars);
  const firstSpace = tail.indexOf(' ');
  return firstSpace === -1 ? tail : tail.slice(firstSpace + 1);
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxChars = Math.max(50, options.maxChars ?? DEFAULT_CHUNK_MAX_CHARS);
  const overlapChars = Math.min(
    Math.max(0, options.overlapChars ?? DEFAULT_CHUNK_OVERLAP_CHARS),
    Math.floor(maxChars / 2),
  );
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const sentences = splitSentences(cleaned, maxChars);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }
    if (current.length + 1 + sentence.length <= maxChars) {
      current += ` ${sentence}`;
      continue;
    }
    chunks.push(current);
    const tail = overlapTail(current, overlapChars);
    current =
      tail && tail.length + 1 + sentence.length <= maxChars
        ? `${tail} ${sentence}`
        : sentence;
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * The indexed text for a news item. Yahoo search news carries a title,
 * publisher, date and link but no article body, so the chunk is exactly
 * that metadata — the system never pretends to have read the full text.
 */
export function buildNewsChunkText(
  title: string,
  publisher: string | null,
  publishedAt: Date | null,
): string {
  const date = publishedAt ? publishedAt.toISOString().slice(0, 10) : null;
  const parts = [title];
  if (publisher) parts.push(`Source: ${publisher}`);
  if (date) parts.push(`Published: ${date}`);
  return parts.join('. ');
}

/** The indexed text for a company profile (Yahoo longBusinessSummary). */
export function buildProfileChunkText(
  name: string,
  sector: string | null,
  industry: string | null,
  description: string | null,
): string {
  const parts = [name];
  if (sector) parts.push(`Sector: ${sector}`);
  if (industry) parts.push(`Industry: ${industry}`);
  if (description) parts.push(description);
  return parts.join('. ');
}

/** The indexed text for one of the user's transactions. */
export function buildTransactionChunkText(
  name: string,
  category: string,
  amount: number,
  date: string,
): string {
  const direction = amount < 0 ? 'spent' : 'received';
  return `${name}: ${direction} ₹${Math.abs(amount).toFixed(2)} on ${category} on ${date}.`;
}
