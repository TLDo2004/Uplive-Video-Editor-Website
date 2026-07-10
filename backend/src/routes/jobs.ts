import { Router } from "express";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { startDownload } from "../services/downloadWorker";
import { startExport } from "../services/exportWorker";
import * as jobStore from "../services/jobStore";
import { toJobResponse, type Clip, type Transition } from "../types/job";
import { ensureJobDir, ensureWorkRoot } from "../utils/paths";

const createJobSchema = z.object({
  url: z.string().url().refine(isYouTubeUrl, "URL must be a valid YouTube link"),
});

const clipSchema = z.object({
  start: z.number().min(0),
  end: z.number().positive(),
});

const updateJobSchema = z.object({
  clips: z.array(clipSchema).min(1),
  transitions: z.array(z.enum(["cut", "fade", "slide"])),
});

const jobsRouter = Router();

function isYouTubeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");
    return (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host === "music.youtube.com"
    );
  } catch {
    return false;
  }
}

function validateClips(clips: Clip[], duration?: number): string | null {
  for (const clip of clips) {
    if (clip.end <= clip.start) {
      return "Each clip must have end time greater than start time";
    }

    if (duration !== undefined && clip.end > duration) {
      return "Clip end time cannot exceed video duration";
    }
  }

  return null;
}

function validateTransitions(
  clips: Clip[],
  transitions: Transition[],
): string | null {
  const expected = Math.max(clips.length - 1, 0);
  if (transitions.length !== expected) {
    return `Expected ${expected} transition(s) for ${clips.length} clip(s)`;
  }

  return null;
}

jobsRouter.post("/", async (req, res) => {
  const parsed = createJobSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }

  await ensureWorkRoot();

  const id = uuidv4();
  const workDir = await ensureJobDir(id);
  const now = new Date().toISOString();

  const job = jobStore.createJob({
    id,
    url: parsed.data.url,
    status: "pending",
    workDir,
    clips: [],
    transitions: [],
    createdAt: now,
    updatedAt: now,
  });

  void startDownload(job.id, job.url);

  res.status(201).json(toJobResponse(job));
});

jobsRouter.get("/:id", (req, res) => {
  const job = jobStore.getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(toJobResponse(job));
});

jobsRouter.patch("/:id", (req, res) => {
  const job = jobStore.getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (job.status !== "ready" && job.status !== "completed") {
    res.status(409).json({ error: "Job is not ready for editing" });
    return;
  }

  const parsed = updateJobSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }

  const clipError = validateClips(parsed.data.clips, job.duration);
  if (clipError) {
    res.status(400).json({ error: clipError });
    return;
  }

  const transitionError = validateTransitions(
    parsed.data.clips,
    parsed.data.transitions,
  );
  if (transitionError) {
    res.status(400).json({ error: transitionError });
    return;
  }

  const updated = jobStore.setJobClips(
    job.id,
    parsed.data.clips,
    parsed.data.transitions,
  );

  if (!updated) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (updated.status === "completed") {
    jobStore.updateJob(updated.id, { status: "ready", outputPath: undefined });
  }

  const finalJob = jobStore.getJob(updated.id);
  res.json(toJobResponse(finalJob ?? updated));
});

jobsRouter.get("/:id/preview", (req, res) => {
  const job = jobStore.getJob(req.params.id);
  if (!job?.sourcePath) {
    res.status(404).json({ error: "Preview not available" });
    return;
  }

  if (job.status !== "ready" && job.status !== "completed") {
    res.status(409).json({ error: "Preview not available for current job status" });
    return;
  }

  res.sendFile(path.resolve(job.sourcePath));
});

jobsRouter.post("/:id/export", (req, res) => {
  const job = jobStore.getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (job.status !== "ready" && job.status !== "completed") {
    res.status(409).json({ error: "Job is not ready for export" });
    return;
  }

  if (job.clips.length === 0) {
    res.status(400).json({ error: "Add at least one clip before exporting" });
    return;
  }

  if (!job.sourcePath) {
    res.status(409).json({ error: "Source video is not available" });
    return;
  }

  void startExport(job.id);
  const updated = jobStore.getJob(job.id);
  res.status(202).json(toJobResponse(updated ?? job));
});

jobsRouter.get("/:id/download", (req, res) => {
  const job = jobStore.getJob(req.params.id);
  if (!job?.outputPath) {
    res.status(404).json({ error: "Export not available" });
    return;
  }

  if (job.status !== "completed") {
    res.status(409).json({ error: "Export is not ready yet" });
    return;
  }

  res.download(path.resolve(job.outputPath), "edited-video.mp4");
});

export default jobsRouter;
