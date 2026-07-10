interface UrlFormProps {
  url: string;
  isLoading: boolean;
  isDisabled: boolean;
  onUrlChange: (url: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export default function UrlForm({
  url,
  isLoading,
  isDisabled,
  onUrlChange,
  onSubmit,
}: UrlFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <label
        htmlFor="youtube-url"
        className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        YouTube URL
      </label>
      <input
        id="youtube-url"
        type="url"
        required
        value={url}
        onChange={(event) => onUrlChange(event.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
      />
      <button
        type="submit"
        disabled={isDisabled || url.trim().length === 0}
        className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {isLoading ? "Downloading video..." : "Load video"}
      </button>
    </form>
  );
}
