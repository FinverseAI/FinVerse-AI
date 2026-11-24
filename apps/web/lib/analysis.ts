export type AnalysisBlock = {
  kind: "heading" | "paragraph" | "ordered" | "unordered";
  lines: string[];
};

export function parseAnalysis(text: string): AnalysisBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: AnalysisBlock[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i]!.trim();
    if (!line) {
      i++;
      continue;
    }
    if (/^#{1,6}\s+/.test(line)) {
      blocks.push({ kind: "heading", lines: [line.replace(/^#{1,6}\s+/, "")] });
      i++;
    } else if (/^(?:[-*]\s+|\d+\.\s+)/.test(line)) {
      const ordered = /^\d+\./.test(line);
      const pattern = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      const items = [];
      while (i < lines.length && pattern.test(lines[i]!.trim())) {
        items.push(lines[i]!.trim().replace(pattern, ""));
        i++;
      }
      blocks.push({ kind: ordered ? "ordered" : "unordered", lines: items });
    } else {
      const paragraph = [line];
      i++;
      while (
        i < lines.length &&
        lines[i]!.trim() &&
        !/^(?:#{1,6}\s+|[-*]\s+|\d+\.\s+)/.test(lines[i]!.trim())
      ) {
        paragraph.push(lines[i]!.trim());
        i++;
      }
      blocks.push({ kind: "paragraph", lines: [paragraph.join(" ")] });
    }
  }
  return blocks;
}

export function analysisInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part) => {
    const bold =
      part.startsWith("**") && part.endsWith("**") && part.length > 4;
    return { bold, text: bold ? part.slice(2, -2) : part };
  });
}
