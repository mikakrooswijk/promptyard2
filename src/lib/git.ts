import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Clone or update a Git repository into the given local directory.
 * Uses the system git binary; does not handle credentials internally.
 */
export function cloneOrFetchRepo(url: string, localDir: string): void {
  if (existsSync(join(localDir, ".git"))) {
    // Already cloned — fetch latest
    try {
      execSync("git fetch --quiet", { cwd: localDir, stdio: "pipe" });
      execSync("git pull --quiet --ff-only", { cwd: localDir, stdio: "pipe" });
    } catch (err) {
      const gitErr = extractGitError(err);
      throw new Error(
        `Failed to update repository at "${localDir}".\n${gitErr}\nCheck your git credentials.`,
      );
    }
  } else {
    try {
      execSync(`git clone --quiet "${url}" "${localDir}"`, { stdio: "pipe" });
    } catch (err) {
      const gitErr = extractGitError(err);
      throw new Error(
        `Failed to clone repository "${url}".\n${gitErr}\nCheck that the repository exists and your git credentials are configured.`,
      );
    }
  }
}

/**
 * Commit and push changes in a local repository directory.
 * Used by the publish command to push a package to a remote.
 */
export function commitAndPush(
  localDir: string,
  message: string,
  ...pathspecs: string[]
): void {
  const specs = pathspecs.length > 0 ? pathspecs : ["."];
  try {
    execSync(`git add ${specs.map((s) => JSON.stringify(s)).join(" ")}`, {
      cwd: localDir,
      stdio: "pipe",
    });
  } catch (err) {
    const gitErr = extractGitError(err);
    throw new Error(`Failed to stage files in "${localDir}".\n${gitErr}`);
  }

  try {
    execSync(`git commit -m ${JSON.stringify(message)}`, {
      cwd: localDir,
      stdio: "pipe",
    });
  } catch (err) {
    const gitErr = extractGitError(err);
    // "nothing to commit" is not a real error
    if (gitErr.includes("nothing to commit")) {
      throw new Error("Nothing to commit — the package is already up to date.");
    }
    throw new Error(`Failed to commit in "${localDir}".\n${gitErr}`);
  }

  try {
    execSync("git push", { cwd: localDir, stdio: "pipe" });
  } catch (err) {
    const gitErr = extractGitError(err);
    throw new Error(
      `Failed to push to remote.\n${gitErr}\nCheck your git credentials.`,
    );
  }
}

/**
 * Returns the URL of the 'origin' remote in a local repo directory.
 */
export function getRemoteUrl(localDir: string): string {
  try {
    const result = execSync("git remote get-url origin", {
      cwd: localDir,
      stdio: "pipe",
    });
    return result.toString().trim();
  } catch {
    throw new Error(
      `No 'origin' remote configured in "${localDir}". Check your git setup.`,
    );
  }
}

function extractGitError(err: unknown): string {
  if (err && typeof err === "object" && "stderr" in err) {
    const stderr = (err as { stderr: Buffer | string }).stderr;
    return Buffer.isBuffer(stderr)
      ? stderr.toString().trim()
      : String(stderr).trim();
  }
  return String(err);
}
