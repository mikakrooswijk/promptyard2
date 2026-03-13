# promptyard2 Repository Structure

This document describes the required layout for a Git repository that serves as a promptyard2 package source.

---

## Directory Layout

```
<repo-root>/
├── packages/
│   └── <package-name>.json      ← one manifest per
├── agents/
│   └── <agent-name>.md
├── instructions/
│   └── <any-name>.md
├── prompts/
│   └── <name>.prompt.md
└── skills/
    └── <skill-name>/
        └── SKILL.md
```

All top-level content directories (`agents/`, `instructions/`, `prompts/`, `skills/`) are **optional**. Only include the ones that contain content referenced by your manifests.

---

## Package Manifest (`packages/<name>.json`)

Every package must have a manifest file in the `packages/` directory. The filename (without `.json`) is the package name used in CLI commands.

### Schema

```json
{
  "name": "string",
  "author": "string",
  "instructions": ["instructions/filename.md"],
  "skills": ["skills/subdir/SKILL.md"],
  "agents": ["agents/agent-name.md"],
  "prompts": ["prompts/name.prompt.md"]
}
```

| Field          | Required | Description                                                  |
| -------------- | -------- | ------------------------------------------------------------ |
| `name`         | Yes      | Package name (non-empty string).                             |
| `author`       | Yes      | Author or team name (non-empty string).                      |
| `instructions` | No       | Array of repo-root-relative paths to instruction files.      |
| `skills`       | No       | Array of repo-root-relative paths to skill files.            |
| `agents`       | No       | Array of repo-root-relative paths to agent definition files. |
| `prompts`      | No       | Array of repo-root-relative paths to prompt files.           |

All paths in the content arrays must be relative to the repository root.

### Example

```json
{
  "name": "code-review",
  "author": "my-team",
  "skills": ["skills/code-review/SKILL.md"],
  "instructions": ["instructions/instructions.md"],
  "prompts": ["prompts/code-review.prompt.md"],
  "agents": ["agents/code-reviewer.md"]
}
```

---

## File Formats

### Instructions (`instructions/*.md`)

Plain Markdown. No frontmatter required. This file is installed to a single fixed path per agent, replacing the agent's global instruction file:

- **Copilot:** `~/.vscode/copilot-instructions.md`
- **Codex:** `~/.codex/AGENTS.md`
- **Claude:** `~/.claude/CLAUDE.md`

```markdown
You are a helpful coding assistant. Always write clean, well-tested code...
```

---

### Skills (`skills/**/*.md`)

Markdown files providing domain-specific knowledge or instructions to the agent. Skills may be placed directly in `skills/` or in named subdirectories. When installed, the full relative path below `skills/` is preserved at the destination.

There is no required frontmatter, but skills typically contain a structured guide or workflow that the agent follows when invoked.

```markdown
# Code Review Skill

When asked to perform a code review, follow these steps:

1. Read the changed files
2. Check for common issues...
```

---

### Prompts (`prompts/*.prompt.md`)

Reusable prompt templates. Files should use the `.prompt.md` extension. YAML frontmatter is supported and recommended.

#### Frontmatter fields

| Field         | Description                                    |
| ------------- | ---------------------------------------------- |
| `name`        | Short identifier for the prompt.               |
| `description` | Human-readable description shown in agent UIs. |

```markdown
---
name: code-review
description: Review the current file or selection for quality issues.
---

Please review the following code:

${selection}

Check for:

- Logic errors
- Security issues
- Style violations
```

---

### Agents (`agents/*.md`)

Agent definition files that configure a custom agent mode. YAML frontmatter is required.

#### Frontmatter fields

| Field         | Description                                         |
| ------------- | --------------------------------------------------- |
| `name`        | Display name of the agent.                          |
| `description` | What this agent does; shown in agent selection UIs. |
| `tools`       | Array of tool names the agent is permitted to use.  |

The Markdown body below the frontmatter is the agent's system prompt.

```markdown
---
name: Code Reviewer
description: An agent specialized in performing structured code reviews following team standards.
tools: [read_file, grep_search, semantic_search]
---

You are an expert code reviewer. When asked to review code, you will...
```
