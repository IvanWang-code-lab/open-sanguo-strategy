import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

export async function runTsEntry(entry, outfileName) {
  const outfile = resolve("node_modules/.cache/open-sanguo", outfileName);
  await mkdir(dirname(outfile), { recursive: true });
  await build({
    entryPoints: [resolve(entry)],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    logLevel: "silent",
  });
  await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}
