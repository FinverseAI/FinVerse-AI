"use client";

import ErrorPage from "./error";
import "./globals.css";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <ErrorPage retry={retry} />
      </body>
    </html>
  );
}
