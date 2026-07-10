export function formatDuration(seconds?: number): string {
  if (seconds === undefined) {
    return "—";
  }

  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export function formatTimestamp(seconds: number): string {
  const total = Math.max(seconds, 0);
  const minutes = Math.floor(total / 60);
  const remaining = Math.floor(total % 60);
  const fraction = Math.round((total % 1) * 10);
  return `${minutes}:${remaining.toString().padStart(2, "0")}.${fraction}`;
}

export function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Queued";
    case "downloading":
      return "Downloading";
    case "ready":
      return "Ready to edit";
    case "exporting":
      return "Exporting";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}
