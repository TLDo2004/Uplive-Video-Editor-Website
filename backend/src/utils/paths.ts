import fs from "fs/promises";
import path from "path";

const workRoot = path.resolve(
  process.env.WORK_DIR ?? path.join(process.cwd(), "temp", "jobs"),
);

export function getWorkRoot(): string {
  return workRoot;
}

export function getJobDir(jobId: string): string {
  return path.join(workRoot, jobId);
}

export function getSourcePath(jobId: string): string {
  return path.join(getJobDir(jobId), "source.mp4");
}

export async function ensureWorkRoot(): Promise<void> {
  await fs.mkdir(workRoot, { recursive: true });
}

export function getOutputPath(jobId: string): string {
  return path.join(getJobDir(jobId), "output.mp4");
}

export async function ensureJobDir(jobId: string): Promise<string> {
  const dir = getJobDir(jobId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
