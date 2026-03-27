import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const DATA_FILES = [
  "users.json",
  "children.json",
  "vaccines.json",
  "vaccine_records.json",
  "centers.json",
  "bookings.json",
  "slots.json",
  "conversations.json",
  "messages.json",
] as const;

const bundledDataDir = path.resolve(import.meta.dirname, "..", "data");
const runtimeDataDir = process.env.VERCEL
  ? path.join(tmpdir(), "rakshak-setu-data")
  : bundledDataDir;

let seeded = false;

function ensureSeededData(): void {
  if (seeded) return;

  if (!existsSync(runtimeDataDir)) {
    mkdirSync(runtimeDataDir, { recursive: true });
  }

  for (const fileName of DATA_FILES) {
    const runtimePath = path.join(runtimeDataDir, fileName);
    const bundledPath = path.join(bundledDataDir, fileName);

    if (!existsSync(runtimePath) && existsSync(bundledPath)) {
      copyFileSync(bundledPath, runtimePath);
    }
  }

  seeded = true;
}

export function getDataFilePath(fileName: (typeof DATA_FILES)[number]): string {
  ensureSeededData();
  return path.join(runtimeDataDir, fileName);
}
