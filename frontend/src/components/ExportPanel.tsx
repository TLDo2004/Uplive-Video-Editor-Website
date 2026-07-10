import type { JobStatus } from "@/lib/api";

interface ExportPanelProps {
  status: JobStatus;
  isExporting: boolean;
  isDisabled: boolean;
  downloadUrl?: string;
  validationError?: string | null;
  onExport: () => void;
}

export default function ExportPanel({
  status,
  isExporting,
  isDisabled,
  downloadUrl,
  validationError,
  onExport,
}: ExportPanelProps) {
  const showProgress = isExporting || status === "exporting";

  return (
    <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      {validationError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {validationError}
        </p>
      ) : null}

      {showProgress ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Export in progress
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            FFmpeg is merging your clips. This may take a minute on limited
            hardware.
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-zinc-900 dark:bg-zinc-100" />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onExport}
        disabled={isDisabled}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {showProgress ? "Exporting video..." : "Export video"}
      </button>

      {status === "completed" && downloadUrl ? (
        <a
          href={`/api${downloadUrl}`}
          className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Download edited video
        </a>
      ) : null}
    </div>
  );
}
