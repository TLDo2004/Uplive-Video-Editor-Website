import fs from "fs/promises";
import path from "path";
import { runCommand } from "./command";

async function findFileRecursive(
  directory: string,
  fileName: string,
  depth = 0,
): Promise<string | null> {
  if (depth > 4) {
    return null;
  }

  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === fileName.toLowerCase()) {
      return entryPath;
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const match = await findFileRecursive(
      path.join(directory, entry.name),
      fileName,
      depth + 1,
    );
    if (match) {
      return match;
    }
  }

  return null;
}

export async function findWinGetExecutable(
  packageHint: string,
  executableName: string,
): Promise<string | null> {
  if (process.platform !== "win32") {
    return null;
  }

  const wingetRoot = path.join(
    process.env.LOCALAPPDATA ?? "",
    "Microsoft",
    "WinGet",
    "Packages",
  );

  try {
    const packages = await fs.readdir(wingetRoot);
    for (const pkg of packages) {
      if (!pkg.toLowerCase().includes(packageHint.toLowerCase())) {
        continue;
      }

      const packageDir = path.join(wingetRoot, pkg);
      const candidates = [
        path.join(packageDir, executableName),
        path.join(packageDir, "bin", executableName),
        await findFileRecursive(packageDir, executableName),
      ];

      for (const candidate of candidates) {
        if (!candidate) {
          continue;
        }

        try {
          await fs.access(candidate);
          return candidate;
        } catch {
          // try next candidate
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function resolveExecutable(options: {
  envVarName: string;
  envValue?: string;
  names: string[];
  wingetHint?: string;
  versionArgs?: string[];
}): Promise<string> {
  const versionArgs = options.versionArgs ?? ["-version"];
  const configured = options.envValue?.trim();

  if (configured) {
    try {
      await runCommand(configured, versionArgs);
      return configured;
    } catch {
      throw new Error(
        `${options.envVarName} is set but not runnable: ${configured}`,
      );
    }
  }

  if (options.wingetHint) {
    for (const name of options.names) {
      const wingetPath = await findWinGetExecutable(options.wingetHint, name);
      if (wingetPath) {
        return wingetPath;
      }
    }
  }

  for (const name of options.names) {
    try {
      await runCommand(name, versionArgs);
      return name;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    `Could not find ${options.names.join(" or ")}. Install it and add to PATH, or set ${options.envVarName} in backend/.env`,
  );
}
