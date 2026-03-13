# promptyard2

A CLI tool for managing **agent coding packages** — bundles of AI coding-assistant configuration files (skills, instructions, prompts, and agent definitions). Register Git repositories as package sources, then install packages into your local agent configuration for Copilot, Codex, or Claude.

## Installation

Run the install script directly from the repo:

```bash
curl -fsSL https://raw.githubusercontent.com/mikakrooswijk/promptyard2/main/install.sh | bash
```

Or clone the repo and run it manually:

```bash
git clone https://github.com/mikakrooswijk/promptyard2.git
cd promptyard2
./install.sh
```

The script clones the repo to `~/.promptyard2`, builds it, and links the `promptyard2` binary globally via `npm link`. After that, `promptyard2` is available in your PATH.

To update an existing installation, simply run the same command again — the script pulls the latest changes and rebuilds.

> **Prerequisites:** Node.js, npm, and git must be installed.

## Development

```bash
npm run dev -- <command>   # Run directly via tsx (no build required)
npm run build              # Compile TypeScript to dist/
```

---

## Commands

### `repo` — Manage registered repositories

#### `repo add <name> <url>`

Register a Git repository as a package source.

```bash
promptyard2 repo add my-repo git@github.com:org/repo.git
promptyard2 repo add my-repo https://github.com/org/repo.git --protocol http
```

| Flag                     | Description                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `--protocol <ssh\|http>` | Clone protocol (default: `ssh`). SSH URLs are auto-converted from `https://` when `ssh` is selected. |

#### `repo list`

List all registered repositories.

```bash
promptyard2 repo list
promptyard2 repo list --json
```

| Flag     | Description                                        |
| -------- | -------------------------------------------------- |
| `--json` | Output as a JSON array of `{ name, url }` objects. |

#### `repo remove <name>`

Remove a registered repository. Also deletes its local clone cache.

```bash
promptyard2 repo remove my-repo
```

---

### `package` — Manage agent packages

#### `package list [repo-name]`

List packages available in all registered repos, or in a specific repo.

```bash
promptyard2 package list
promptyard2 package list my-repo
promptyard2 package list --json
```

| Flag     | Description                                                                |
| -------- | -------------------------------------------------------------------------- |
| `--json` | Output as a JSON array of `{ repoName, name, author, fileCount }` objects. |

#### `package install <repo/package>`

Install a full package or a single file from a registered repository into your local agent configuration.

```bash
# Install a full package
promptyard2 package install my-repo/code-review --agent copilot

# Install a single file from a package
promptyard2 package install my-repo/code-review/skills/code-review/SKILL.md --agent copilot

# Preview what would be installed
promptyard2 package install my-repo/code-review --agent copilot --dry-run

# Overwrite existing files
promptyard2 package install my-repo/code-review --agent copilot --force
```

| Flag             | Description                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| `--agent <name>` | **Required.** Target agent: `copilot`, `codex`, or `claude`.                |
| `--force`        | Overwrite existing destination files (default: skip if already present).    |
| `--dry-run`      | Resolve destinations and print what would happen without writing any files. |

#### `package publish <package-name>`

Publish a local promptyard repo's package to a registered remote Git repository. Reads `packages/<package-name>.json`, copies all referenced content files to the remote repo cache, then commits and pushes.

```bash
# Auto-select repo when only one is registered
promptyard2 package publish code-review

# Specify a target repo explicitly
promptyard2 package publish code-review --repo my-repo

# Publish from a specific local directory
promptyard2 package publish code-review --repo my-repo --dir /path/to/local-repo

# Preview without writing or pushing
promptyard2 package publish code-review --repo my-repo --dry-run
```

| Flag            | Description                                                                          |
| --------------- | ------------------------------------------------------------------------------------ |
| `--repo <name>` | Which registered repo to publish to. Required when more than one repo is registered. |
| `--dir <path>`  | Local repo root to publish from (defaults to current working directory).             |
| `--dry-run`     | Print intent without writing files or pushing to remote.                             |

---

## Installation Targets by Agent

Files from a package are installed to different locations depending on the `--agent` value:

| Content type   | `copilot`                           | `codex`              | `claude`              |
| -------------- | ----------------------------------- | -------------------- | --------------------- |
| `skills/`      | `~/.agents/skills/`                 | `~/.codex/skills/`   | `~/.claude/skills/`   |
| `prompts/`     | `~/.vscode/prompts/`                | `~/.codex/prompts/`  | `~/.claude/prompts/`  |
| `agents/`      | `~/.agents/`                        | `~/.codex/agents/`   | `~/.claude/agents/`   |
| `instructions` | `~/.vscode/copilot-instructions.md` | `~/.codex/AGENTS.md` | `~/.claude/CLAUDE.md` |

> **Note:** Instructions files are installed to a single fixed path per agent regardless of the source filename. All other content types preserve their subdirectory structure relative to their content-type prefix (e.g. `skills/code-review/SKILL.md` → `~/.agents/skills/code-review/SKILL.md`).

---

## Storage

| Purpose     | Path                                      |
| ----------- | ----------------------------------------- |
| Config file | `~/.config/promptyard2/config.json`       |
| Repo cache  | `~/.cache/promptyard2/repos/<repo-name>/` |

---

## Repository Structure

See [REPO_STRUCTURE.md](/docs/REPO_STRUCTURE.md) for the required layout and file format specifications for a promptyard2-compatible package repository.

## Upcomming Feature List

- Publishing to a repo with a locked default branch (PR required)
