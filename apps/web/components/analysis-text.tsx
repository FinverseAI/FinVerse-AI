import { Fragment } from "react";
import { analysisInline, parseAnalysis } from "../lib/analysis";

// All content is rendered as React text; HTML and links are never executed.
function inline(text: string) {
  return analysisInline(text).map((part, index) =>
    part.bold ? (
      <strong key={index}>{part.text}</strong>
    ) : (
      <Fragment key={index}>{part.text}</Fragment>
    ),
  );
}

export function AnalysisText({ text }: { text: string }) {
  return (
    <div className="analysis-text">
      {parseAnalysis(text).map((block, index) => {
        if (block.kind === "heading")
          return <h4 key={index}>{inline(block.lines[0]!)}</h4>;
        if (block.kind === "paragraph")
          return <p key={index}>{inline(block.lines[0]!)}</p>;
        const items = block.lines.map((line, i) => (
          <li key={i}>{inline(line)}</li>
        ));
        return block.kind === "ordered" ? (
          <ol key={index}>{items}</ol>
        ) : (
          <ul key={index}>{items}</ul>
        );
      })}
    </div>
  );
}
