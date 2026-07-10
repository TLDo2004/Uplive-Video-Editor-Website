import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export interface DownloadResult {
  filePath: string;
  title: string;
  duration: number;
}

function runCommand(
  command: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const useShell =
      process.platform === "win32" &&
      !command.includes("\\") &&
      !command.includes("/");

    const child = spawn(command, args, { shell: useShell });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          stderr.trim() || stdout.trim() || `${command} exited with code ${code}`,
        ),
      );
    });
  });
}

async function findWinGetYtDlp(): Promise<string | null> {
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
      if (!pkg.toLowerCase().includes("yt-dlp")) {
        continue;
      }

      const candidate = path.join(wingetRoot, pkg, "yt-dlp.exe");
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // try next package folder
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function resolveYtDlpCommand(): Promise<string> {
  const configured = process.env.YT_DLP_PATH?.trim();
  if (configured) {
    try {
      await runCommand(configured, ["--version"]);
      return configured;
    } catch {
      throw new Error(`YT_DLP_PATH is set but not runnable: ${configured}`);
    }
  }

  const wingetPath = await findWinGetYtDlp();
  if (wingetPath) {
    return wingetPath;
  }

  const candidates = ["yt-dlp", "yt-dlp.exe"];

  for (const candidate of candidates) {
    try {
      await runCommand(candidate, ["--version"]);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    "yt-dlp is not installed or not on PATH. Install it from https://github.com/yt-dlp/yt-dlp or set YT_DLP_PATH in backend/.env",
  );
}

async function findDownloadedFile(outputDir: string): Promise<string> {
  const entries = await fs.readdir(outputDir);
  const videoFile = entries.find((name) =>
    [".mp4", ".webm", ".mkv", ".mov"].some((ext) => name.endsWith(ext)),
  );

  if (!videoFile) {
    throw new Error("Download finished but no video file was found");
  }

  return path.join(outputDir, videoFile);
}

export async function downloadYouTubeVideo(
  url: string,
  outputDir: string,
  outputFile: string,
): Promise<DownloadResult> {
  const ytDlp = await resolveYtDlpCommand();
  const outputTemplate = path.join(outputDir, "source.%(ext)s");

  await runCommand(ytDlp, [
    "--no-playlist",
    "-f",
    "best[ext=mp4][height<=720]/best[height<=720]/best",
    "-o",
    outputTemplate,
    url,
  ]);

  const downloadedPath = await findDownloadedFile(outputDir);
  const finalPath = path.join(outputDir, outputFile);

  if (downloadedPath !== finalPath) {
    await fs.rename(downloadedPath, finalPath);
  }

  const { stdout } = await runCommand(ytDlp, [
    "--no-playlist",
    "--print",
    "title",
    "--print",
    "duration",
    url,
  ]);

  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const title = lines[0] ?? "Untitled video";
  const duration = Number(lines[1] ?? 0);

  return {
    filePath: finalPath,
    title,
    duration: Number.isFinite(duration) ? duration : 0,
  };
}
