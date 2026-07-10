import type { Clip, Transition } from "@/lib/api";

export function createDefaultClip(duration?: number): Clip {
  const end = duration ? Math.min(duration, 10) : 10;
  return { start: 0, end: Math.max(end, 1) };
}

export function buildTransitions(clips: Clip[]): Transition[] {
  if (clips.length <= 1) {
    return [];
  }

  return Array.from({ length: clips.length - 1 }, () => "cut");
}

export function validateClips(
  clips: Clip[],
  duration?: number,
): string | null {
  for (const [index, clip] of clips.entries()) {
    if (clip.end <= clip.start) {
      return `Clip ${index + 1} must end after it starts`;
    }

    if (duration !== undefined && clip.end > duration) {
      return `Clip ${index + 1} exceeds the video duration`;
    }
  }

  return null;
}

export function moveClip(clips: Clip[], from: number, to: number): Clip[] {
  if (to < 0 || to >= clips.length || from === to) {
    return clips;
  }

  const next = [...clips];
  const [clip] = next.splice(from, 1);
  next.splice(to, 0, clip);
  return next;
}
