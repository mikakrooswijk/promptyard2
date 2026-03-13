import { Command } from "commander";
import { resolve } from "node:path";
import { VALID_AGENTS } from "../lib/agents.js";
import {
  installPackage,
  installSingleFile,
  listPackages,
} from "../lib/installer.js";
import { publishPackage } from "../lib/publisher.js";

export function registerPackageCommands(program: Command): void {
  const pkg = program.command("package").description("Manage agent packages");

  pkg
    .command("list [repo-name]")
    .description("List available packages from registered repositories")
    .option("--json", "Output as JSON", false)
    .action((repoName: string | undefined, options: { json: boolean }) => {
      try {
        const packages = listPackages(repoName);

        if (options.json) {
          console.log(JSON.stringify(packages, null, 2));
          return;
        }

        if (packages.length === 0) {
          console.log("No packages found.");
          return;
        }

        // Group by repo when showing multiple repos
        const multiRepo =
          !repoName && new Set(packages.map((p) => p.repoName)).size > 1;
        let currentRepo = "";

        for (const pkg of packages) {
          if (multiRepo && pkg.repoName !== currentRepo) {
            currentRepo = pkg.repoName;
            console.log(`\n${currentRepo}:`);
          }
          console.log(
            `  ${pkg.name}  by ${pkg.author}  (${pkg.fileCount} file${pkg.fileCount === 1 ? "" : "s"})`,
          );
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  pkg
    .command("install <repo/package/file>")
    .description(
      "Install a package or single file from a registered repository.\n" +
        "  <repo>/<package>              — install the full package\n" +
        "  <repo>/<package>/<file-path>  — install a single file",
    )
    .option("--force", "Overwrite existing files", false)
    .option(
      "--dry-run",
      "Show what would be installed without writing to disk",
      false,
    )
    .requiredOption(
      "--agent <name>",
      `Target coding agent to install for (${VALID_AGENTS.join(", ")})`,
    )
    .action(
      async (
        repoPackage: string,
        options: { force: boolean; dryRun: boolean; agent: string },
      ) => {
        const firstSlash = repoPackage.indexOf("/");
        if (firstSlash === -1) {
          console.error(
            `Error: Argument must be in the format <repo>/<package-name>[/<file-path>], got: "${repoPackage}"`,
          );
          process.exit(1);
        }

        const repoName = repoPackage.slice(0, firstSlash);
        const rest = repoPackage.slice(firstSlash + 1);
        const secondSlash = rest.indexOf("/");
        const isSingleFile = secondSlash !== -1;

        const packageName = isSingleFile ? rest.slice(0, secondSlash) : rest;
        const filePath = isSingleFile ? rest.slice(secondSlash + 1) : null;

        if (!repoName || !packageName) {
          console.error(
            `Error: Both repo name and package name must be non-empty, got: "${repoPackage}"`,
          );
          process.exit(1);
        }

        if (!VALID_AGENTS.includes(options.agent)) {
          console.error(
            `Error: Unknown agent "${options.agent}". Valid agents: ${VALID_AGENTS.join(", ")}`,
          );
          process.exit(1);
        }

        try {
          if (isSingleFile && filePath) {
            if (options.dryRun) {
              console.log(
                `[dry-run] Would install ${filePath} from ${repoName}/${packageName}`,
              );
            } else {
              console.log(
                `Installing ${filePath} from ${repoName}/${packageName}...`,
              );
            }
            const summary = await installSingleFile(
              repoName,
              packageName,
              filePath,
              options.agent,
              options.force,
              options.dryRun,
            );

            printInstallSummary(summary);
          } else {
            if (options.dryRun) {
              console.log(
                `[dry-run] Would install ${packageName} from ${repoName}`,
              );
            } else {
              console.log(`Installing ${packageName} from ${repoName}...`);
            }
            const summary = await installPackage(
              repoName,
              packageName,
              options.agent,
              options.force,
              options.dryRun,
            );

            printInstallSummary(summary);
          }
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
          process.exit(1);
        }
      },
    );

  pkg
    .command("publish <package-name>")
    .description(
      "Publish a package from the current directory to a registered repository.\n" +
        "Reads packages/<package-name>.json and copies all referenced content files.",
    )
    .option("--repo <name>", "Repository to publish to")
    .option("--dir <path>", "Local repo root directory (defaults to CWD)")
    .option("--dry-run", "Show what would be published without writing", false)
    .action(
      async (
        packageName: string,
        options: { repo?: string; dryRun: boolean; dir?: string },
      ) => {
        const localRepoRoot = resolve(options.dir ?? ".");

        if (options.dryRun) {
          console.log(
            `[dry-run] Would publish "${packageName}" from: ${localRepoRoot}`,
          );
          if (options.repo) {
            console.log(`[dry-run] Target repository: ${options.repo}`);
          }
          return;
        }

        try {
          console.log(`Publishing "${packageName}" from ${localRepoRoot}...`);
          const summary = await publishPackage(
            localRepoRoot,
            packageName,
            options.repo,
          );
          console.log(`\nPublished: ${summary.packageName}`);
          console.log(`Remote:    ${summary.remoteUrl}`);
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
          process.exit(1);
        }
      },
    );
}

function printInstallSummary(
  summary: import("../lib/installer.js").InstallSummary,
): void {
  const label = summary.dryRun ? "Package" : "Installed";
  console.log(`\n${label}: ${summary.packageName}`);
  console.log("");

  let installed = 0;
  let skipped = 0;

  for (const result of summary.results) {
    for (const dest of result.destinations) {
      if (summary.dryRun) {
        console.log(`  [dry-run]  ${result.file} → ${dest.path}`);
        installed++;
      } else if (dest.skipped) {
        console.log(
          `  [skipped]  ${result.file} → ${dest.path} (use --force to overwrite)`,
        );
        skipped++;
      } else {
        console.log(`  [${dest.agent}]  ${result.file} → ${dest.path}`);
        installed++;
      }
    }
  }

  console.log("");
  if (summary.dryRun) {
    console.log(`Dry run complete. ${installed} file(s) would be installed.`);
  } else {
    console.log(`Done. ${installed} file(s) installed, ${skipped} skipped.`);
  }
}
