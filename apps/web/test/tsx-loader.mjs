// Module customization hooks for the web test suite.
//
// Node runs .ts files natively (type stripping) but cannot load .tsx, and
// the app imports Next.js modules and server-only code that cannot run in
// plain Node. These hooks close both gaps so node:test can render the real
// components with react-dom/server:
//
// - .tsx files are transpiled on the fly with the SWC build Next.js ships
//   (next/dist/build/swc) — no new dependency, no lockfile change.
// - Extensionless relative imports (the repo's style) resolve to .tsx/.ts.
// - next/* modules, server-only, and the auth server modules resolve to
//   the small stubs in ./stubs.
//
// Register from a test file before importing any component:
//
//   import { register } from "node:module";
//   await register("./tsx-loader.mjs", import.meta.url);
//
// (register() must run before the dynamic import — static imports are
// hoisted and would load before the hooks exist.)
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformSync } from "next/dist/build/swc/index.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const stubUrl = (name) => pathToFileURL(path.join(testDir, "stubs", name)).href;

// Bare specifiers that only exist inside Next.js (or throw outside it).
const bareStubs = {
  "next/dynamic": stubUrl("next-dynamic.mjs"),
  "next/headers": stubUrl("next-headers.mjs"),
  "next/image": stubUrl("next-image.mjs"),
  "next/link": stubUrl("next-link.mjs"),
  "next/navigation": stubUrl("next-navigation.mjs"),
  "server-only": stubUrl("server-only.mjs"),
};

// Local modules that need a database, the auth server, or request headers.
// Matched on the resolved path, so extensionless imports are covered too.
const pathStubs = [
  ["/auth/client", stubUrl("auth-client.mjs")],
  ["/auth/profile-guard", stubUrl("profile-guard.mjs")],
  ["/auth/server", stubUrl("auth-server.mjs")],
];

const extensions = [".tsx", ".ts", ".mjs", ".js"];

function resolveRelative(specifier, parentURL) {
  const parentPath = fileURLToPath(parentURL);
  const base = path.resolve(path.dirname(parentPath), specifier);
  const pathWithoutExtension = base
    .replace(/\.(?:tsx?|mjs|js)$/, "")
    .replaceAll("\\", "/");
  for (const [suffix, url] of pathStubs) {
    if (pathWithoutExtension.endsWith(suffix)) return url;
  }
  for (const extension of extensions) {
    const candidate = base + extension;
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  for (const extension of [".tsx", ".ts"]) {
    const candidate = path.join(base, `index${extension}`);
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (Object.hasOwn(bareStubs, specifier)) {
    return { url: bareStubs[specifier], shortCircuit: true };
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const resolved = resolveRelative(specifier, context.parentURL);
    if (resolved) return { url: resolved, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  // Styles are handled by Next's bundler in the app, but Node's test runner
  // has no CSS module loader. Components only need the import to resolve.
  if (url.endsWith(".css")) {
    return { format: "module", source: "export default {};", shortCircuit: true };
  }
  if (url.endsWith(".tsx")) {
    const filePath = fileURLToPath(url);
    const source = await readFile(filePath, "utf8");
    const { code } = transformSync(source, {
      filename: filePath,
      jsc: {
        parser: { syntax: "typescript", tsx: true },
        transform: { react: { runtime: "automatic" } },
      },
      module: { type: "es6" },
    });
    return { format: "module", source: code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
