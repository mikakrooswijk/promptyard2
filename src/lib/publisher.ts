import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { getCacheDir, getRepo, listRepos } from "./config.js";
import { cloneOrFetchRepo, commitAndPush, getRemoteUrl } from "./git.js";
import { CONTENT_TYPES, loadManifest } from "./manifest.js";

export interface PublishSummary {
  packageName: string;
  remoteUrl: string;
}

/**
 * Publish a local promptyard repo's package to a registered Git repository.
 *
 * @param localRepoRoot  Absolute path to the local promptyard repo root
 *                       (must contain packages/, instructions/, skills/, etc.)
 * @param packageName    Name of the package to publish (reads packages/<name>.json)
 * @param repoName       Registered repo name to publish to (required when multiple repos exist)
 */
export async function publishPackage(
  localRepoRoot: string,
  packageName: string,
  repoName: string | undefined,
): Promise<PublishSummary> {
  if (!existsSync(localRepoRoot)) {
    throw new Error(`Local repo root not found: "${localRepoRoot}"`);
  }

  const manifest = loadManifest(localRepoRoot, packageName);

  // Resolve the target repo
  const repos = listRepos();
  if (repos.length === 0) {
    throw new Error(
      "No repositories registered. Run: promptyard2 repo add <name> <url>",
    );
  }

  let resolvedRepoName: string;
  if (repoName) {
    if (!repos.some((r) => r.name === repoName)) {
      throw new Error(
        `Repository "${repoName}" is not registered. Run: promptyard2 repo add ${repoName} <url>`,
      );
    }
    resolvedRepoName = repoName;
  } else if (repos.length === 1) {
    resolvedRepoName = repos[0].name;
  } else {
    const names = repos.map((r) => r.name).join(", ");
    throw new Error(
      `Multiple repositories registered (${names}). Specify one with --repo <name>.`,
    );
  }

  const repo = getRepo(resolvedRepoName)!;
  const cacheDir = getCacheDir();
  const localCacheDir = join(cacheDir, resolvedRepoName);

  cloneOrFetchRepo(repo.url, localCacheDir);

  // Copy packages/<name>.json into remote repo
  const srcManifestPath = join(
    localRepoRoot,
    "packages",
    `${packageName}.json`,
  );
  const destPackagesDir = join(localCacheDir, "packages");
  if (!existsSync(destPackagesDir)) {
    mkdirSync(destPackagesDir, { recursive: true });
  }
  copyFileSync(srcManifestPath, join(destPackagesDir, `${packageName}.json`));

  // Copy each content file referenced in the manifest
  for (const contentType of CONTENT_TYPES) {
    const paths = manifest[contentType];
    if (!paths) continue;
    for (const filePath of paths) {
      const srcFile = join(localRepoRoot, filePath);
      if (!existsSync(srcFile)) {
        throw new Error(
          `File declared in manifest does not exist locally: "${filePath}"`,
        );
      }
      const destFile = join(localCacheDir, filePath);
      const destDir = dirname(destFile);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      copyFileSync(srcFile, destFile);
    }
  }

  const commitMessage = `publish ${manifest.name}`;
  commitAndPush(localCacheDir, commitMessage, "packages", ...CONTENT_TYPES);

  const remoteUrl = getRemoteUrl(localCacheDir);

  return { packageName: manifest.name, remoteUrl };
}
