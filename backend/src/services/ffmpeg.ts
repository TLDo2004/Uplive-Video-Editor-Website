import fs from "fs/promises";
import path from "path";
import type { Clip, Transition } from "../types/job";
import { runCommand } from "../utils/command";
import { resolveExecutable } from "../utils/executables";

const FADE_DURATION = 0.5;
const FFMPEG_THREADS = "1";

function toAbsolutePath(filePath: string): string {
  return path.resolve(filePath);
}

function toConcatFilePath(filePath: string): string {
  return toAbsolutePath(filePath).replace(/\\/g, "/");
}

async function resolveFfmpeg(): Promise<string> {
  return resolveExecutable({
    envVarName: "FFMPEG_PATH",
    envValue: process.env.FFMPEG_PATH,
    names: ["ffmpeg", "ffmpeg.exe"],
    wingetHint: "ffmpeg",
  });
}

async function resolveFfprobe(): Promise<string> {
  const configured = process.env.FFPROBE_PATH?.trim();
  if (configured) {
    return configured;
  }

  const ffmpeg = await resolveFfmpeg();
  if (ffmpeg.toLowerCase().endsWith("ffmpeg.exe")) {
    return ffmpeg.replace(/ffmpeg\.exe$/i, "ffprobe.exe");
  }

  if (ffmpeg.toLowerCase().endsWith("ffmpeg")) {
    return ffmpeg.replace(/ffmpeg$/i, "ffprobe");
  }

  return resolveExecutable({
    envVarName: "FFPROBE_PATH",
    envValue: configured,
    names: ["ffprobe", "ffprobe.exe"],
    wingetHint: "ffmpeg",
  });
}

async function getMediaDuration(filePath: string): Promise<number> {
  const ffprobe = await resolveFfprobe();
  const { stdout } = await runCommand(ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    toAbsolutePath(filePath),
  ]);

  const duration = Number(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Could not read duration for ${path.basename(filePath)}`);
  }

  return duration;
}

async function extractClip(
  ffmpeg: string,
  sourcePath: string,
  clip: Clip,
  outputPath: string,
): Promise<void> {
  await runCommand(ffmpeg, [
    "-ss",
    clip.start.toString(),
    "-to",
    clip.end.toString(),
    "-i",
    toAbsolutePath(sourcePath),
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "28",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-threads",
    FFMPEG_THREADS,
    "-movflags",
    "+faststart",
    "-y",
    toAbsolutePath(outputPath),
  ]);
}

async function concatClips(
  ffmpeg: string,
  clipPaths: string[],
  outputPath: string,
  workDir: string,
): Promise<void> {
  const listPath = toAbsolutePath(path.join(workDir, "concat-list.txt"));
  const listContent = clipPaths
    .map((clipPath) => `file '${toConcatFilePath(clipPath).replace(/'/g, "'\\''")}'`)
    .join("\n");

  await fs.writeFile(listPath, listContent, "utf8");

  await runCommand(ffmpeg, [
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    "-y",
    toAbsolutePath(outputPath),
  ]);
}

async function mergeWithTransition(
  ffmpeg: string,
  leftPath: string,
  rightPath: string,
  transition: Transition,
  leftDuration: number,
  outputPath: string,
): Promise<void> {
  const xfadeTransition = transition === "fade" ? "fade" : "slideleft";
  const offset = Math.max(leftDuration - FADE_DURATION, 0).toFixed(3);

  await runCommand(ffmpeg, [
    "-i",
    toAbsolutePath(leftPath),
    "-i",
    toAbsolutePath(rightPath),
    "-filter_complex",
    `[0:v][1:v]xfade=transition=${xfadeTransition}:duration=${FADE_DURATION}:offset=${offset}[v];[0:a][1:a]acrossfade=d=${FADE_DURATION}[a]`,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "28",
    "-c:a",
    "aac",
    "-threads",
    FFMPEG_THREADS,
    "-y",
    toAbsolutePath(outputPath),
  ]);
}

export async function exportMergedVideo(options: {
  sourcePath: string;
  workDir: string;
  clips: Clip[];
  transitions: Transition[];
  outputPath: string;
}): Promise<void> {
  const sourcePath = toAbsolutePath(options.sourcePath);
  const workDir = toAbsolutePath(options.workDir);
  const outputPath = toAbsolutePath(options.outputPath);
  const { clips, transitions } = options;
  const ffmpeg = await resolveFfmpeg();

  const clipPaths: string[] = [];
  const clipDurations: number[] = [];

  for (let index = 0; index < clips.length; index += 1) {
    const clipPath = path.join(workDir, `clip-${index}.mp4`);
    await extractClip(ffmpeg, sourcePath, clips[index], clipPath);
    clipPaths.push(clipPath);
    clipDurations.push(await getMediaDuration(clipPath));
  }

  if (clipPaths.length === 1) {
    await fs.copyFile(clipPaths[0], outputPath);
    return;
  }

  const allCut = transitions.every((transition) => transition === "cut");
  if (allCut) {
    await concatClips(ffmpeg, clipPaths, outputPath, workDir);
    return;
  }

  let currentPath = clipPaths[0];
  let currentDuration = clipDurations[0];

  for (let index = 1; index < clipPaths.length; index += 1) {
    const transition = transitions[index - 1] ?? "cut";
    const nextPath = clipPaths[index];
    const mergedPath = path.join(workDir, `merged-${index}.mp4`);

    if (transition === "cut") {
      await concatClips(ffmpeg, [currentPath, nextPath], mergedPath, workDir);
      currentDuration += clipDurations[index];
    } else {
      await mergeWithTransition(
        ffmpeg,
        currentPath,
        nextPath,
        transition,
        currentDuration,
        mergedPath,
      );
      currentDuration = currentDuration + clipDurations[index] - FADE_DURATION;
    }

    currentPath = mergedPath;
  }

  await fs.copyFile(currentPath, outputPath);
}
