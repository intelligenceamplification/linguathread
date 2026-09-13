import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [metadataFile, outputDirectory, manifestFile] = process.argv.slice(2);
if (!metadataFile || !outputDirectory || !manifestFile) throw new Error("Usage: node scripts/package-audio-pack.mjs metadata.jsonl output-directory approved.json");
const rows = (await readFile(metadataFile, "utf8")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
const approved = rows.filter((row) => row.approved === true);
if (!approved.length) throw new Error("No approved clips were found.");
await mkdir(outputDirectory, { recursive: true });
const sourceDirectory = path.dirname(metadataFile);
const clips = [];
for (const row of approved) {
  const source = path.join(sourceDirectory, row.file);
  const bytes = await readFile(source);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== row.sha256) throw new Error(`Hash mismatch for ${row.id}`);
  const filename = `${row.id}-${hash.slice(0, 12)}.wav`;
  await copyFile(source, path.join(outputDirectory, filename));
  clips.push({ id: row.id, language: row.language, text: row.sourceText, normalizedText: row.normalizedText, url: `/audio/packs/${path.basename(outputDirectory)}/${filename}`, sha256: hash });
}
const packVersion = path.basename(outputDirectory);
await writeFile(manifestFile, JSON.stringify({ schemaVersion: 1, packVersion, model: "OpenBMB/VoxCPM2", approvedAt: new Date().toISOString(), clips }, null, 2) + "\n");
console.log(`Packaged ${clips.length} approved clips as ${packVersion}.`);
