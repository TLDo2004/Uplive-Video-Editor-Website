import * as jobStore from "./jobStore";
import { downloadYouTubeVideo } from "./youtube";
import { getSourcePath } from "../utils/paths";

export async function startDownload(jobId: string, url: string): Promise<void> {
  jobStore.updateJob(jobId, { status: "downloading" });

  try {
    const job = jobStore.getJob(jobId);
    if (!job) {
      return;
    }

    const result = await downloadYouTubeVideo(
      url,
      job.workDir,
      "source.mp4",
    );

    jobStore.updateJob(jobId, {
      status: "ready",
      title: result.title,
      duration: result.duration,
      sourcePath: result.filePath || getSourcePath(jobId),
      error: undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to download video";

    jobStore.updateJob(jobId, {
      status: "failed",
      error: message,
    });
  }
}
