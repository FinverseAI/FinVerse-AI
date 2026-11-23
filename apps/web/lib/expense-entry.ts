import type { ExpenseExtraction } from "./ai";

export type TransactionInput = {
  name: string;
  category: string;
  amount: number;
  date: string;
};

/**
 * Turn a confirmed extraction into the transaction it saves as:
 * expenses are negative, the merchant becomes the name (or "Expense"
 * when there is none), and a missing date falls back to today.
 */
export function extractionToTransaction(
  extraction: ExpenseExtraction,
  today: string,
): TransactionInput {
  return {
    name: extraction.merchant?.trim() || "Expense",
    category: extraction.category,
    amount: -Math.abs(extraction.amount),
    date: extraction.date ?? today,
  };
}

type SpeechScope = {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
};

/**
 * Whether this browser can transcribe speech in-page (Chrome, Edge,
 * and Safari expose it; Firefox does not). The scope parameter exists
 * so tests can pass a fake window; in the app it defaults to the real
 * one.
 */
export function speechRecognitionSupported(
  scope: SpeechScope = globalThis as unknown as SpeechScope,
): boolean {
  return Boolean(scope.SpeechRecognition ?? scope.webkitSpeechRecognition);
}

/**
 * The sliver of the Web Speech API the entry form uses. The browser
 * types do not declare SpeechRecognition, so it is typed here instead
 * of reaching for `any`.
 */
export type SpeechRecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

export type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

/** The speech-recognition constructor this browser offers, or null. */
export function getSpeechRecognitionConstructor(
  scope: {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  } = globalThis as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  },
): SpeechRecognitionConstructor | null {
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/**
 * Start one listening session: the transcript goes to onTranscript
 * (once, when the speaker finishes), errors to onError, and onEnd
 * fires when the session closes either way. Returns a stop function.
 * No audio leaves the component — only the transcript text is used.
 */
export function startListening(
  Recognition: SpeechRecognitionConstructor,
  handlers: {
    onTranscript: (text: string) => void;
    onError: (error: string) => void;
    onEnd: () => void;
  },
): () => void {
  const recognition = new Recognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript ?? "";
    if (transcript.trim()) handlers.onTranscript(transcript.trim());
  };
  recognition.onerror = (event) => handlers.onError(event.error);
  recognition.onend = () => handlers.onEnd();
  recognition.start();
  return () => {
    try {
      recognition.stop();
    } catch {
      // Already stopped.
    }
  };
}
