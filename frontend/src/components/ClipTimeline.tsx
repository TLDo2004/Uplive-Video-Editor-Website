import type { Clip } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";

interface ClipTimelineProps {
  duration: number;
  clips: Clip[];
  activeClipIndex: number;
  currentTime: number;
  onSelectClip: (index: number) => void;
}

const clipColors = [
  "bg-sky-500/80",
  "bg-violet-500/80",
  "bg-emerald-500/80",
  "bg-amber-500/80",
  "bg-rose-500/80",
];

export default function ClipTimeline({
  duration,
  clips,
  activeClipIndex,
  currentTime,
  onSelectClip,
}: ClipTimelineProps) {
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Timeline</span>
        <span>
          Playhead: {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
        </span>
      </div>

      <div className="relative h-10 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800">
        {clips.map((clip, index) => {
          const left = duration > 0 ? (clip.start / duration) * 100 : 0;
          const width =
            duration > 0 ? ((clip.end - clip.start) / duration) * 100 : 0;

          return (
            <button
              key={`timeline-clip-${index}`}
              type="button"
              onClick={() => onSelectClip(index)}
              style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
              className={`absolute top-1 bottom-1 rounded-md border transition ${
                clipColors[index % clipColors.length]
              } ${
                activeClipIndex === index
                  ? "border-white ring-2 ring-zinc-900 dark:ring-zinc-100"
                  : "border-transparent opacity-80 hover:opacity-100"
              }`}
              title={`Clip ${index + 1}: ${formatTimestamp(clip.start)} - ${formatTimestamp(clip.end)}`}
            />
          );
        })}

        <div
          className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow"
          style={{ left: `${playheadPercent}%` }}
        />
      </div>
    </div>
  );
}
