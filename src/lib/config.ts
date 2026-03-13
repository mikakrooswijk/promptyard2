import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface RepoEntry {
  name: string;
  url: string;
}

export interface Config {
  repos: RepoEntry[];
}

const CONFIG_DIR = join(homedir(), ".config", "promptyard2");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): Config {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    return { repos: [] };
  }
  const raw = readFileSync(CONFIG_FILE, "utf-8");
  return JSON.parse(raw) as Config;
}

export function saveConfig(config: Config): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getRepo(name: string): RepoEntry | undefined {
  const config = loadConfig();
  return config.repos.find((r) => r.name === name);
}

export function addRepo(name: string, url: string): void {
  const config = loadConfig();
  if (config.repos.some((r) => r.name === name)) {
    throw new Error(`Repository "${name}" is already registered.`);
  }
  if (!isValidGitUrl(url)) {
    throw new Error(
      `Invalid Git URL: "${url}". Must be an https:// or ssh (git@) URL.`,
    );
  }
  config.repos.push({ name, url });
  saveConfig(config);
}

function isValidGitUrl(url: string): boolean {
  return (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("git@") ||
    url.startsWith("ssh://")
  );
}

export function listRepos(): RepoEntry[] {
  return loadConfig().repos;
}

export function removeRepo(name: string): void {
  const config = loadConfig();
  const index = config.repos.findIndex((r) => r.name === name);
  if (index === -1) {
    throw new Error(`Repository "${name}" is not registered.`);
  }
  config.repos.splice(index, 1);
  saveConfig(config);

  const cacheDir = join(homedir(), ".cache", "promptyard2", "repos", name);
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
  }
}

export function getCacheDir(): string {
  const dir = join(homedir(), ".cache", "promptyard2", "repos");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}
