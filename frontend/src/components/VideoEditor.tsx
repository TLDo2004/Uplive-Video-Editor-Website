"use client";

import { useEffect, useRef, useState } from "react";
import ClipEditor from "@/components/ClipEditor";
import ClipTimeline from "@/components/ClipTimeline";
import ExportPanel from "@/components/ExportPanel";
import UrlForm from "@/components/UrlForm";
import VideoPlayer, { type VideoPlayerHandle } from "@/components/VideoPlayer";
import {
  buildTransitions,
  createDefaultClip,
  moveClip,
  validateClips,
} from "@/lib/clips";
import { formatDuration, statusLabel } from "@/lib/format";
import {
  createJob,
  exportJob,
  getJob,
  updateJob,
  wait,
  type Clip,
  type Job,
  type Transition,
} from "@/lib/api";

export default function VideoEditor() {
  const playerRef = useRef<VideoPlayerHandle>(null);
  const [url, setUrl] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!job || job.clips.length > 0) {
      return;
    }

    if (job.status === "ready" && job.duration) {
      const initialClips = [createDefaultClip(job.duration)];
      setClips(initialClips);
      setTransitions(buildTransitions(initialClips));
      setActiveClipIndex(0);
    }
  }, [job]);

  async function pollUntil(
    jobId: string,
    isDone: (current: Job) => boolean,
    onUpdate?: (current: Job) => void,
  ): Promise<Job> {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const current = await getJob(jobId);
      onUpdate?.(current);

      if (isDone(current)) {
        return current;
      }

      await wait(2000);
    }

    throw new Error("Timed out while waiting for the job to finish");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setJob(null);
    setClips([]);
    setTransitions([]);
    setActiveClipIndex(0);
    setCurrentTime(0);
    setIsLoading(true);

    try {
      const created = await createJob(url.trim());
      setJob(created);

      const finished = await pollUntil(
        created.id,
        (current) => current.status === "ready" || current.status === "failed",
        setJob,
      );

      if (finished.status === "failed") {
        setError(finished.error ?? "Download failed");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function updateClip(index: number, field: keyof Clip, value: number) {
    setClips((current) =>
      current.map((clip, clipIndex) =>
        clipIndex === index ? { ...clip, [field]: value } : clip,
      ),
    );
  }

  function addClip() {
    setClips((current) => {
      const next = [...current, createDefaultClip(job?.duration)];
      setTransitions(buildTransitions(next));
      setActiveClipIndex(next.length - 1);
      return next;
    });
  }

  function removeClip(index: number) {
    setClips((current) => {
      const next = current.filter((_, clipIndex) => clipIndex !== index);
      setTransitions(buildTransitions(next));
      setActiveClipIndex((prev) => Math.min(prev, Math.max(next.length - 1, 0)));
      return next;
    });
  }

  function handleMoveClip(index: number, direction: -1 | 1) {
    const target = index + direction;
    setClips((current) => moveClip(current, index, target));
    setActiveClipIndex(target);
  }

  function updateTransition(index: number, value: Transition) {
    setTransitions((current) =>
      current.map((transition, transitionIndex) =>
        transitionIndex === index ? value : transition,
      ),
    );
  }

  function setStartFromPlayhead(index: number) {
    const time = playerRef.current?.getCurrentTime() ?? 0;
    updateClip(index, "start", Number(time.toFixed(1)));
  }

  function setEndFromPlayhead(index: number) {
    const time = playerRef.current?.getCurrentTime() ?? 0;
    updateClip(index, "end", Number(time.toFixed(1)));
  }

  function previewClip(index: number) {
    const clip = clips[index];
    if (!clip) {
      return;
    }

    setActiveClipIndex(index);
    playerRef.current?.seek(clip.start);
    playerRef.current?.play();
  }

  async function handleExport() {
    if (!job) {
      return;
    }

    const validationError = validateClips(clips, job.duration);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsExporting(true);

    try {
      await updateJob(job.id, { clips, transitions });
      await exportJob(job.id);

      const finished = await pollUntil(
        job.id,
        (current) =>
          current.status === "completed" || current.status === "failed",
        setJob,
      );

      if (finished.status === "failed") {
        setError(finished.error ?? "Export failed");
      }
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Export failed",
      );
    } finally {
      setIsExporting(false);
    }
  }

  const isProcessing =
    isLoading ||
    job?.status === "pending" ||
    job?.status === "downloading" ||
    job?.status === "exporting" ||
    isExporting;

  const canEdit =
    job?.status === "ready" || job?.status === "completed";

  const validationError = canEdit
    ? validateClips(clips, job?.duration)
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        <div className="mb-10">
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Video Editor Mini App
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Video Editor
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Paste a YouTube link to start selecting clips, arranging them, and
            exporting your video.
          </p>
        </div>

        <UrlForm
          url={url}
          isLoading={isLoading}
          isDisabled={isProcessing}
          onUrlChange={setUrl}
          onSubmit={handleSubmit}
        />

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {job ? (
          <section className="mt-6 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                  {job.title ?? "Loading video details..."}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Status: {statusLabel(job.status)}
                </p>
              </div>
              <p className="text-sm text-zinc-500">
                Duration: {formatDuration(job.duration)}
              </p>
            </div>

            {job.previewUrl && canEdit ? (
              <VideoPlayer
                ref={playerRef}
                src={`/api${job.previewUrl}`}
                onTimeUpdate={setCurrentTime}
              />
            ) : null}

            {canEdit && job.duration ? (
              <>
                <ClipTimeline
                  duration={job.duration}
                  clips={clips}
                  activeClipIndex={activeClipIndex}
                  currentTime={currentTime}
                  onSelectClip={setActiveClipIndex}
                />

                <ClipEditor
                  clips={clips}
                  transitions={transitions}
                  activeClipIndex={activeClipIndex}
                  duration={job.duration}
                  onSelectClip={setActiveClipIndex}
                  onUpdateClip={updateClip}
                  onUpdateTransition={updateTransition}
                  onAddClip={addClip}
                  onRemoveClip={removeClip}
                  onMoveClip={handleMoveClip}
                  onSetStartFromPlayhead={setStartFromPlayhead}
                  onSetEndFromPlayhead={setEndFromPlayhead}
                  onPreviewClip={previewClip}
                />

                <ExportPanel
                  status={job.status}
                  isExporting={isExporting}
                  isDisabled={isProcessing || clips.length === 0}
                  downloadUrl={job.downloadUrl}
                  validationError={validationError}
                  onExport={handleExport}
                />
              </>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
