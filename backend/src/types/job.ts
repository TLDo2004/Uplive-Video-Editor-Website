export type JobStatus =
  | "pending"
  | "downloading"
  | "ready"
  | "exporting"
  | "completed"
  | "failed";

export type Transition = "cut" | "fade" | "slide";

export interface Clip {
  start: number;
  end: number;
}

export interface Job {
  id: string;
  url: string;
  status: JobStatus;
  title?: string;
  duration?: number;
  sourcePath?: string;
  outputPath?: string;
  workDir: string;
  clips: Clip[];
  transitions: Transition[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobResponse {
  id: string;
  url: string;
  status: JobStatus;
  title?: string;
  duration?: number;
  clips: Clip[];
  transitions: Transition[];
  error?: string;
  previewUrl?: string;
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export function toJobResponse(job: Job): JobResponse {
  return {
    id: job.id,
    url: job.url,
    status: job.status,
    title: job.title,
    duration: job.duration,
    clips: job.clips,
    transitions: job.transitions,
    error: job.error,
    previewUrl: job.sourcePath ? `/jobs/${job.id}/preview` : undefined,
    downloadUrl:
      job.status === "completed" && job.outputPath
        ? `/jobs/${job.id}/download`
        : undefined,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
