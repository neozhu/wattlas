import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { MethodologyPage } from "@/components/methodology/methodology-page";
import { manifestSchema, sourceCatalogSchema } from "@/lib/snapshot/schema";
import type { SourceCatalog } from "@/lib/snapshot/types";

async function loadCatalog(): Promise<{ catalog: SourceCatalog; generatedAt: string | null }> {
  const publicData = path.join(process.cwd(), "public", "data");
  try {
    const manifest = manifestSchema.parse(JSON.parse(await readFile(path.join(publicData, "latest.json"), "utf8")));
    const relative = manifest.artifacts.sourceCatalog;
    if (!relative) return { catalog: { schemaVersion: "1.0", sources: [] }, generatedAt: manifest.generatedAt };
    const expected = "snapshots/" + manifest.snapshotId + "/source-catalog.json";
    if (relative !== expected) throw new Error("Invalid source catalogue artifact path");
    const [root, file] = await Promise.all([realpath(publicData), realpath(path.join(publicData, relative))]);
    if (!file.startsWith(root + path.sep)) throw new Error("Source catalogue resolves outside public data");
    return { catalog: sourceCatalogSchema.parse(JSON.parse(await readFile(file, "utf8"))), generatedAt: manifest.generatedAt };
  } catch {
    return { catalog: { schemaVersion: "1.0", sources: [] }, generatedAt: null };
  }
}

export default async function Page() {
  const data = await loadCatalog();
  return <MethodologyPage {...data} />;
}
