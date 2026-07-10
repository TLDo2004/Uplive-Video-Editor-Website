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
  clips: Clip[];
  transitions: Transition[];
  error?: string;
  previewUrl?: string;
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
}

async function parseError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? fallback;
}

export async function createJob(url: string): Promise<Job> {
  const response = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to create job"));
  }

  return response.json() as Promise<Job>;
}

export async function getJob(id: string): Promise<Job> {
  const response = await fetch(`/api/jobs/${id}`);

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to fetch job"));
  }

  return response.json() as Promise<Job>;
}

export async function updateJob(
  id: string,
  payload: { clips: Clip[]; transitions: Transition[] },
): Promise<Job> {
  const response = await fetch(`/api/jobs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to update job"));
  }

  return response.json() as Promise<Job>;
}

export async function exportJob(id: string): Promise<Job> {
  const response = await fetch(`/api/jobs/${id}/export`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to start export"));
  }

  return response.json() as Promise<Job>;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
