import path from "path";
import * as jobStore from "./jobStore";
import { exportMergedVideo } from "./ffmpeg";
import { getOutputPath } from "../utils/paths";

export async function startExport(jobId: string): Promise<void> {
  const job = jobStore.getJob(jobId);
  if (!job?.sourcePath || job.clips.length === 0) {
    return;
  }

  jobStore.updateJob(jobId, { status: "exporting", error: undefined });

  try {
    const outputPath = getOutputPath(jobId);
    await exportMergedVideo({
      sourcePath: job.sourcePath,
      workDir: job.workDir,
      clips: job.clips,
      transitions: job.transitions,
      outputPath,
    });

    jobStore.updateJob(jobId, {
      status: "completed",
      outputPath,
      error: undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to export video";

    jobStore.updateJob(jobId, {
      status: "failed",
      error: message,
    });
  }
}
