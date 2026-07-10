import type { Clip, Job, Transition } from "../types/job";

const jobs = new Map<string, Job>();

export function createJob(job: Job): Job {
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<Job>): Job | undefined {
  const job = jobs.get(id);
  if (!job) {
    return undefined;
  }

  const updated: Job = {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  jobs.set(id, updated);
  return updated;
}

export function setJobClips(
  id: string,
  clips: Clip[],
  transitions: Transition[],
): Job | undefined {
  return updateJob(id, { clips, transitions });
}
