import { copyFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  ensureDir,
  resolveInstructionFile,
  resolveTargetDirs,
} from "./agents.js";
import { getCacheDir, getRepo, listRepos } from "./config.js";
import { cloneOrFetchRepo } from "./git.js";
import {
  CONTENT_TYPES,
  listPackageNames,
  loadManifest,
  type ContentType,
  type Manifest,
} from "./manifest.js";

export interface InstallResult {
  file: string;
  destinations: Array<{ agent: string; path: string; skipped: boolean }>;
}

export interface InstallSummary {
  packageName: string;
  dryRun: boolean;
  results: InstallResult[];
}

/**
 * Install a full package from a registered repository.
 *
 * @param repoName    The registered repo name (from `repo add`)
 * @param packageName The package name (maps to packages/<packageName>.json in the repo)
 * @param agent       The target coding agent (e.g. "copilot", "codex", "claude")
 * @param force       Overwrite existing files if true
 * @param dryRun      When true, resolve destinations but do not write any files
 */
export async function installPackage(
  repoName: string,
  packageName: string,
  agent: string,
  force: boolean,
  dryRun = false,
): Promise<InstallSummary> {
  const repo = getRepo(repoName);
  if (!repo) {
    throw new Error(
      `Repository "${repoName}" is not registered. Run: promptyard2 repo add ${repoName} <url>`,
    );
  }

  const cacheDir = getCacheDir();
  const localRepoDir = join(cacheDir, repoName);
  cloneOrFetchRepo(repo.url, localRepoDir);

  const manifest = loadManifest(localRepoDir, packageName);

  const results: InstallResult[] = [];
  for (const contentType of CONTENT_TYPES) {
    const paths = manifest[contentType];
    if (!paths) continue;
    for (const filePath of paths) {
      const result = installFile(
        localRepoDir,
        filePath,
        contentType,
        agent,
        force,
        dryRun,
      );
      results.push(result);
    }
  }

  return { packageName: manifest.name, dryRun, results };
}

function installFile(
  repoDir: string,
  filePath: string,
  contentType: ContentType,
  agent: string,
  force: boolean,
  dryRun: boolean,
): InstallResult {
  const sourcePath = join(repoDir, filePath);
  if (!existsSync(sourcePath)) {
    throw new Error(
      `File declared in manifest does not exist: "${filePath}" (expected at ${sourcePath})`,
    );
  }

  const destinations: InstallResult["destinations"] = [];

  if (contentType === "instructions") {
    // Instructions are always installed as a single, well-known file per agent
    // (e.g. CLAUDE.md for claude, AGENTS.md for codex) regardless of source name.
    const destPath = resolveInstructionFile(agent);
    if (dryRun) {
      destinations.push({ agent, path: destPath, skipped: false });
    } else if (existsSync(destPath) && !force) {
      destinations.push({ agent, path: destPath, skipped: true });
    } else {
      ensureDir(dirname(destPath));
      copyFileSync(sourcePath, destPath);
      destinations.push({ agent, path: destPath, skipped: false });
    }
    return { file: filePath, destinations };
  }

  // For all other content types, strip the leading content-type directory from
  // the path to get the destination-relative path (e.g. "skills/foo.md" → "foo.md").
  const contentTypePrefix = contentType + "/";
  const destRelPath = filePath.startsWith(contentTypePrefix)
    ? filePath.slice(contentTypePrefix.length)
    : basename(filePath);

  const targetDirs = resolveTargetDirs(contentType, agent);

  for (const { agent, dir } of targetDirs) {
    const subDir = join(dir, dirname(destRelPath).replace(/^\./, ""));
    const destPath = join(subDir, basename(destRelPath));

    if (dryRun) {
      destinations.push({ agent, path: destPath, skipped: false });
    } else if (existsSync(destPath) && !force) {
      destinations.push({ agent, path: destPath, skipped: true });
    } else {
      ensureDir(subDir);
      copyFileSync(sourcePath, destPath);
      destinations.push({ agent, path: destPath, skipped: false });
    }
  }

  return { file: filePath, destinations };
}

/**
 * Install a single file from a package in a registered repository.
 *
 * @param repoName    The registered repo name
 * @param packageName The package name
 * @param filePath    Repo-relative file path (e.g. "skills/refactor.md")
 * @param agent       The target coding agent (e.g. "copilot", "codex", "claude")
 * @param force       Overwrite existing files if true
 * @param dryRun      When true, resolve destinations but do not write any files
 */
export async function installSingleFile(
  repoName: string,
  packageName: string,
  filePath: string,
  agent: string,
  force: boolean,
  dryRun = false,
): Promise<InstallSummary> {
  const repo = getRepo(repoName);
  if (!repo) {
    throw new Error(
      `Repository "${repoName}" is not registered. Run: promptyard2 repo add ${repoName} <url>`,
    );
  }

  const cacheDir = getCacheDir();
  const localRepoDir = join(cacheDir, repoName);
  cloneOrFetchRepo(repo.url, localRepoDir);

  const manifest = loadManifest(localRepoDir, packageName);

  // Normalise the requested path (strip leading ./)
  const normalised = filePath.replace(/^\.\//, "");

  // Find which content type array contains this file
  const contentType = resolveContentType(manifest, normalised);
  if (!contentType) {
    const available = CONTENT_TYPES.flatMap((t) =>
      (manifest[t] ?? []).map((p) => `  ${p}`),
    ).join("\n");
    throw new Error(
      `File "${filePath}" not found in manifest of "${packageName}".\nAvailable files:\n${available}`,
    );
  }

  const result = installFile(
    localRepoDir,
    normalised,
    contentType,
    agent,
    force,
    dryRun,
  );

  return { packageName: manifest.name, dryRun, results: [result] };
}

function resolveContentType(
  manifest: Manifest,
  filePath: string,
): ContentType | null {
  for (const type of CONTENT_TYPES) {
    if (manifest[type]?.some((p) => p.replace(/^\.\//, "") === filePath)) {
      return type;
    }
  }
  return null;
}

export interface PackageInfo {
  repoName: string;
  name: string;
  author: string;
  fileCount: number;
}

/**
 * List available packages from one or all registered repositories.
 * Clones/fetches the repo(s) and scans the packages/ directory for JSON manifests.
 *
 * @param repoName  If provided, only scan that repo. Otherwise scan all repos.
 */
export function listPackages(repoName?: string): PackageInfo[] {
  const repos = listRepos();
  if (repos.length === 0) {
    throw new Error(
      "No repositories registered. Run: promptyard2 repo add <name> <url>",
    );
  }

  const targets = repoName ? repos.filter((r) => r.name === repoName) : repos;

  if (repoName && targets.length === 0) {
    throw new Error(
      `Repository "${repoName}" is not registered. Run: promptyard2 repo add ${repoName} <url>`,
    );
  }

  const cacheDir = getCacheDir();
  const results: PackageInfo[] = [];

  for (const repo of targets) {
    const localRepoDir = join(cacheDir, repo.name);
    cloneOrFetchRepo(repo.url, localRepoDir);

    const packageNames = listPackageNames(localRepoDir);

    for (const name of packageNames) {
      let manifest: Manifest;
      try {
        manifest = loadManifest(localRepoDir, name);
      } catch {
        continue;
      }

      const fileCount = CONTENT_TYPES.reduce(
        (sum, t) => sum + (manifest[t]?.length ?? 0),
        0,
      );

      results.push({
        repoName: repo.name,
        name: manifest.name,
        author: manifest.author,
        fileCount,
      });
    }
  }

  return results;
}
