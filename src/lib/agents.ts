import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ContentType } from "./manifest.js";

/** Content types that are installed into a directory (preserving the source filename). */
type DirContentType = Exclude<ContentType, "instructions">;

/**
 * Per-agent directory for each non-instruction content type.
 *
 * Copilot:
 *   skills  → ~/.agents/skills/
 *   prompts → ~/.vscode/prompts/
 *   agents  → ~/.agents/
 *
 * Codex:
 *   skills  → ~/.codex/skills/
 *   prompts → ~/.codex/prompts/
 *   agents  → ~/.codex/agents/
 *
 * Claude:
 *   skills  → ~/.claude/skills/
 *   prompts → ~/.claude/prompts/
 *   agents  → ~/.claude/agents/
 */
const AGENT_TYPE_DIRS: Record<string, Record<DirContentType, string>> = {
  copilot: {
    skills: join(homedir(), ".agents", "skills"),
    prompts: join(homedir(), ".vscode", "prompts"),
    agents: join(homedir(), ".agents"),
  },
  codex: {
    skills: join(homedir(), ".codex", "skills"),
    prompts: join(homedir(), ".codex", "prompts"),
    agents: join(homedir(), ".codex", "agents"),
  },
  claude: {
    skills: join(homedir(), ".claude", "skills"),
    prompts: join(homedir(), ".claude", "prompts"),
    agents: join(homedir(), ".claude", "agents"),
  },
};

/**
 * Fixed instruction file path per agent.
 * Each package has exactly one instruction file; it is always installed under
 * this well-known path regardless of the source filename.
 *
 *   copilot → ~/.vscode/copilot-instructions.md
 *   codex   → ~/.codex/AGENTS.md
 *   claude  → ~/.claude/CLAUDE.md
 */
const AGENT_INSTRUCTION_FILE: Record<string, string> = {
  copilot: join(homedir(), ".vscode", "copilot-instructions.md"),
  codex: join(homedir(), ".codex", "AGENTS.md"),
  claude: join(homedir(), ".claude", "CLAUDE.md"),
};

export const VALID_AGENTS = Object.keys(AGENT_TYPE_DIRS) as string[];

export function resolveTargetDirs(
  contentType: DirContentType,
  agent: string,
): Array<{ agent: string; dir: string }> {
  const entry = AGENT_TYPE_DIRS[agent];
  if (!entry) {
    throw new Error(
      `Unknown agent "${agent}". Valid agents: ${VALID_AGENTS.join(", ")}`,
    );
  }
  return [{ agent, dir: entry[contentType] }];
}

/**
 * Returns the fixed file path where this agent's instruction file must be installed.
 * There is always exactly one instruction file per agent.
 */
export function resolveInstructionFile(agent: string): string {
  const filePath = AGENT_INSTRUCTION_FILE[agent];
  if (!filePath) {
    throw new Error(
      `Unknown agent "${agent}". Valid agents: ${VALID_AGENTS.join(", ")}`,
    );
  }
  return filePath;
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
