#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerPackageCommands } from "./commands/package.js";
import { registerRepoCommands } from "./commands/repo.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
) as { version: string };

const program = new Command();

program
  .name("promptyard2")
  .description("Manage agent coding packages (skills, instructions, prompts)")
  .version(pkgJson.version);

registerRepoCommands(program);
registerPackageCommands(program);

program.parse(process.argv);
