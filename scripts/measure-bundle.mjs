import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const manifests = [
  "package.json",
  ...["apps", "packages"].flatMap((root) =>
    readdirSync(root).map((name) => join(root, name, "package.json")),
  ),
].map((file) => JSON.parse(readFileSync(file, "utf8")));
const dependencies = new Set(
  manifests
    .flatMap((manifest) =>
      Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }),
    )
    .filter((name) => !name.startsWith("@repo/")),
);
const root = "apps/web/.next/static";
const result = {
  directExternalDependencies: dependencies.size,
  lockPackages: Object.keys(
    JSON.parse(readFileSync("package-lock.json", "utf8")).packages,
  ).length,
  jsBytes: 0,
  cssBytes: 0,
  jsGzipBytes: 0,
  cssGzipBytes: 0,
};
for (const file of readdirSync(root, { recursive: true })) {
  if (!/\.(js|css)$/.test(file) || !statSync(join(root, file)).isFile())
    continue;
  const data = readFileSync(join(root, file));
  const kind = file.endsWith(".js") ? "js" : "css";
  result[`${kind}Bytes`] += data.length;
  result[`${kind}GzipBytes`] += gzipSync(data).length;
}
console.log(JSON.stringify(result, null, 2));
