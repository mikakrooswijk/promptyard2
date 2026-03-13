import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type ContentType = "instructions" | "skills" | "agents" | "prompts";

export const CONTENT_TYPES: ContentType[] = [
  "instructions",
  "skills",
  "agents",
  "prompts",
];

export interface Manifest {
  name: string;
  author: string;
  instructions?: string[];
  skills?: string[];
  agents?: string[];
  prompts?: string[];
}

export function loadManifest(repoDir: string, packageName: string): Manifest {
  const manifestPath = join(repoDir, "packages", `${packageName}.json`);
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Package "${packageName}" not found in repository (looked for: ${manifestPath})`,
    );
  }

  const raw = readFileSync(manifestPath, "utf-8");
  const data: unknown = JSON.parse(raw);
  return validateManifest(data, manifestPath);
}

export function listPackageNames(repoDir: string): string[] {
  const packagesDir = join(repoDir, "packages");
  if (!existsSync(packagesDir)) return [];

  return readdirSync(packagesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5));
}

function validateManifest(data: unknown, manifestPath: string): Manifest {
  if (typeof data !== "object" || data === null) {
    throw new Error(`Manifest at "${manifestPath}" must be a JSON object.`);
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj["name"] !== "string" || !obj["name"]) {
    throw new Error(
      `Manifest at "${manifestPath}" is missing a required "name" string field.`,
    );
  }
  if (typeof obj["author"] !== "string" || !obj["author"]) {
    throw new Error(
      `Manifest at "${manifestPath}" is missing a required "author" string field.`,
    );
  }

  const manifest: Manifest = {
    name: obj["name"] as string,
    author: obj["author"] as string,
  };

  for (const type of CONTENT_TYPES) {
    if (obj[type] !== undefined) {
      if (!Array.isArray(obj[type])) {
        throw new Error(
          `Manifest at "${manifestPath}" field "${type}" must be an array of paths.`,
        );
      }
      const paths = obj[type] as unknown[];
      for (let i = 0; i < paths.length; i++) {
        if (typeof paths[i] !== "string" || !paths[i]) {
          throw new Error(
            `Manifest at "${manifestPath}" field "${type}[${i}]" must be a non-empty string path.`,
          );
        }
      }
      manifest[type] = paths as string[];
    }
  }

  return manifest;
}
