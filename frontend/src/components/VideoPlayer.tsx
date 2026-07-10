"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export interface VideoPlayerHandle {
  getCurrentTime: () => number;
  seek: (time: number) => void;
  play: () => void;
}

interface VideoPlayerProps {
  src: string;
  onTimeUpdate?: (time: number) => void;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, onTimeUpdate }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      play: () => {
        void videoRef.current?.play();
      },
    }));

    return (
      <video
        ref={videoRef}
        controls
        className="w-full rounded-lg bg-black"
        src={src}
        onTimeUpdate={() => onTimeUpdate?.(videoRef.current?.currentTime ?? 0)}
      />
    );
  },
);

export default VideoPlayer;
