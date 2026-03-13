import { Command } from "commander";
import { addRepo, listRepos, removeRepo } from "../lib/config.js";

function convertHttpsToSsh(url: string): string {
  const m = url.match(/^https?:\/\/([^/]+)\/(.+)$/);
  return m ? `git@${m[1]}:${m[2]}` : url;
}

export function registerRepoCommands(program: Command): void {
  const repo = program
    .command("repo")
    .description("Manage registered Git repositories");

  repo
    .command("add <name> <url>")
    .description("Register a Git repository as a package source")
    .option(
      "--protocol <protocol>",
      "Clone protocol to use: ssh (default) or http",
      "ssh",
    )
    .action((name: string, url: string, options: { protocol: string }) => {
      if (options.protocol !== "ssh" && options.protocol !== "http") {
        console.error(
          `Error: --protocol must be "ssh" or "http", got: "${options.protocol}"`,
        );
        process.exit(1);
      }

      let resolvedUrl = url;
      if (
        options.protocol === "ssh" &&
        (url.startsWith("https://") || url.startsWith("http://"))
      ) {
        resolvedUrl = convertHttpsToSsh(url);
        console.log(`Using SSH URL: ${resolvedUrl}`);
      }

      try {
        addRepo(name, resolvedUrl);
        console.log(`Repository "${name}" registered (${resolvedUrl})`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  repo
    .command("list")
    .description("List all registered repositories")
    .option("--json", "Output as JSON", false)
    .action((options: { json: boolean }) => {
      const repos = listRepos();

      if (options.json) {
        console.log(JSON.stringify(repos, null, 2));
        return;
      }

      if (repos.length === 0) {
        console.log(
          "No repositories registered. Use: promptyard2 repo add <name> <url>",
        );
        return;
      }
      for (const r of repos) {
        console.log(`  ${r.name}  ${r.url}`);
      }
    });

  repo
    .command("remove <name>")
    .description("Remove a registered repository")
    .action((name: string) => {
      try {
        removeRepo(name);
        console.log(`Repository "${name}" removed.`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
