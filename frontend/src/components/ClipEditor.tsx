import type { Clip, Transition } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";

interface ClipEditorProps {
  clips: Clip[];
  transitions: Transition[];
  activeClipIndex: number;
  duration?: number;
  onSelectClip: (index: number) => void;
  onUpdateClip: (index: number, field: keyof Clip, value: number) => void;
  onUpdateTransition: (index: number, value: Transition) => void;
  onAddClip: () => void;
  onRemoveClip: (index: number) => void;
  onMoveClip: (index: number, direction: -1 | 1) => void;
  onSetStartFromPlayhead: (index: number) => void;
  onSetEndFromPlayhead: (index: number) => void;
  onPreviewClip: (index: number) => void;
}

export default function ClipEditor({
  clips,
  transitions,
  activeClipIndex,
  duration,
  onSelectClip,
  onUpdateClip,
  onUpdateTransition,
  onAddClip,
  onRemoveClip,
  onMoveClip,
  onSetStartFromPlayhead,
  onSetEndFromPlayhead,
  onPreviewClip,
}: ClipEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Clips
        </h3>
        <button
          type="button"
          onClick={onAddClip}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Add clip
        </button>
      </div>

      {clips.map((clip, index) => (
        <div key={`clip-${index}`} className="space-y-3">
          <div
            className={`rounded-lg border p-4 transition ${
              activeClipIndex === index
                ? "border-zinc-900 dark:border-zinc-100"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelectClip(index)}
                className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Clip {index + 1}
              </button>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onMoveClip(index, -1)}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-700"
                >
                  Up
                </button>
                <button
                  type="button"
                  disabled={index === clips.length - 1}
                  onClick={() => onMoveClip(index, 1)}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-700"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => onPreviewClip(index)}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                >
                  Preview
                </button>
                {clips.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onRemoveClip(index)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Start (s)
                <input
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={clip.start}
                  onChange={(event) =>
                    onUpdateClip(index, "start", Number(event.target.value))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </label>
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                End (s)
                <input
                  type="number"
                  min={0.1}
                  max={duration}
                  step={0.1}
                  value={clip.end}
                  onChange={(event) =>
                    onUpdateClip(index, "end", Number(event.target.value))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSetStartFromPlayhead(index)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Set start from playhead
              </button>
              <button
                type="button"
                onClick={() => onSetEndFromPlayhead(index)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Set end from playhead
              </button>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Length: {formatTimestamp(Math.max(clip.end - clip.start, 0))}
            </p>
          </div>

          {index < transitions.length ? (
            <label className="block text-sm text-zinc-600 dark:text-zinc-400">
              Transition after clip {index + 1}
              <select
                value={transitions[index]}
                onChange={(event) =>
                  onUpdateTransition(index, event.target.value as Transition)
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="cut">Cut</option>
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
              </select>
            </label>
          ) : null}
        </div>
      ))}
    </div>
  );
}
